import { create } from 'zustand';
import {
  Room,
  RoomEvent,
  Track,
  VideoPresets,
  type RemoteParticipant,
  type RemoteTrackPublication,
  type LocalTrackPublication,
  type Participant,
  ConnectionState,
} from 'livekit-client';
import { api } from '../api/client';

export interface VoiceParticipant {
  identity: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  videoTrack?: Track;
  screenTrack?: Track;
}

interface VoiceStore {
  connected: boolean;
  connecting: boolean;
  roomName: string | null;
  streamId: string | null;
  participants: VoiceParticipant[];
  isMuted: boolean;
  isDeafened: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  pttActive: boolean;
  pttMode: boolean;

  join: (streamId: string) => Promise<void>;
  leave: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => void;
  togglePTT: () => void;
}

const CONNECT_TIMEOUT_MS = 15_000;

let roomRef: Room | null = null;
let joiningLock = false;
let pttModeRef = false;
let wasMutedBeforeDeafen = false;

function playTone(frequency: number, duration: number, gain: number) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    g.gain.value = gain;
    osc.connect(g);
    g.connect(ctx.destination);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch { /* Audio not available */ }
}

function playJoinSound() {
  playTone(880, 0.15, 0.15);
  setTimeout(() => playTone(1100, 0.15, 0.12), 100);
}

function playLeaveSound() {
  playTone(600, 0.15, 0.12);
  setTimeout(() => playTone(440, 0.2, 0.1), 100);
}

function detachAllRoomMedia(room: Room) {
  room.remoteParticipants.forEach((rp) => {
    rp.trackPublications.forEach((pub) => {
      if (pub.track) pub.track.detach().forEach((el) => el.remove());
    });
  });
}

async function stopLocalTracks(room: Room) {
  try {
    for (const source of [Track.Source.Microphone, Track.Source.Camera, Track.Source.ScreenShare]) {
      const pub = room.localParticipant.getTrackPublication(source);
      if (pub?.track) {
        pub.track.stop();
        await room.localParticipant.unpublishTrack(pub.track);
      }
    }
  } catch { /* Already stopped */ }
}

function getTrackForSource(p: Participant, source: Track.Source): Track | undefined {
  return p.getTrackPublication(source)?.track ?? undefined;
}

function buildParticipants(room: Room): VoiceParticipant[] {
  if (room.state !== ConnectionState.Connected) return [];
  const toVP = (p: Participant): VoiceParticipant => ({
    identity: p.identity,
    isSpeaking: p.isSpeaking,
    isMuted: !p.isMicrophoneEnabled,
    isCameraOn: p.isCameraEnabled,
    isScreenSharing: p.isScreenShareEnabled,
    videoTrack: getTrackForSource(p, Track.Source.Camera),
    screenTrack: getTrackForSource(p, Track.Source.ScreenShare),
  });
  const list: VoiceParticipant[] = [toVP(room.localParticipant)];
  room.remoteParticipants.forEach((rp) => list.push(toVP(rp)));
  return list;
}

function syncParticipants() {
  if (!roomRef || roomRef.state !== ConnectionState.Connected) return;
  const participants = buildParticipants(roomRef);
  useVoiceStore.setState({
    participants,
    isCameraOn: roomRef.localParticipant.isCameraEnabled,
    isScreenSharing: roomRef.localParticipant.isScreenShareEnabled,
  });
}

function resetState() {
  useVoiceStore.setState({
    connected: false,
    connecting: false,
    roomName: null,
    streamId: null,
    participants: [],
    isMuted: false,
    isDeafened: false,
    isCameraOn: false,
    isScreenSharing: false,
    pttActive: false,
  });
}

async function destroyRoom(room: Room) {
  detachAllRoomMedia(room);
  await stopLocalTracks(room);
  room.removeAllListeners();
  room.disconnect();
}

export const useVoiceStore = create<VoiceStore>((set, get) => ({
  connected: false,
  connecting: false,
  roomName: null,
  streamId: null,
  participants: [],
  isMuted: false,
  isDeafened: false,
  isCameraOn: false,
  isScreenSharing: false,
  pttActive: false,
  pttMode: false,

  join: async (sid) => {
    if (joiningLock) return;
    joiningLock = true;

    if (roomRef) {
      const old = roomRef;
      roomRef = null;
      await destroyRoom(old);
    }

    set({ connecting: true });
    try {
      const { token, url } = await api.getVoiceToken(sid);

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: { resolution: VideoPresets.h1080.resolution },
      });
      roomRef = room;

      room.on(RoomEvent.ParticipantConnected, () => { syncParticipants(); playJoinSound(); });
      room.on(RoomEvent.ParticipantDisconnected, () => { syncParticipants(); playLeaveSound(); });
      room.on(RoomEvent.TrackSubscribed, syncParticipants);
      room.on(RoomEvent.TrackUnsubscribed, syncParticipants);
      room.on(RoomEvent.TrackMuted, syncParticipants);
      room.on(RoomEvent.TrackUnmuted, syncParticipants);
      room.on(RoomEvent.ActiveSpeakersChanged, syncParticipants);
      room.on(RoomEvent.LocalTrackPublished, syncParticipants);
      room.on(RoomEvent.LocalTrackUnpublished, syncParticipants);
      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        if (state === ConnectionState.Disconnected && roomRef === room) {
          roomRef = null;
          detachAllRoomMedia(room);
          room.removeAllListeners();
          resetState();
        }
      });

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrackPublication['track'], _pub: RemoteTrackPublication, _rp: RemoteParticipant) => {
        if (track && track.kind === Track.Kind.Audio) {
          const el = track.attach();
          document.body.appendChild(el);
        }
      });
      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrackPublication['track']) => {
        if (track) track.detach().forEach((el) => el.remove());
      });

      await Promise.race([
        room.connect(url, token),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Connection timed out')), CONNECT_TIMEOUT_MS)),
      ]);

      if (roomRef !== room) { room.disconnect(); return; }

      const startMuted = pttModeRef;
      await room.localParticipant.setMicrophoneEnabled(!startMuted);

      set({
        connected: true,
        connecting: false,
        roomName: room.name,
        streamId: sid,
        isMuted: startMuted,
        isDeafened: false,
        isCameraOn: false,
        isScreenSharing: false,
        participants: buildParticipants(room),
      });
      playJoinSound();
    } catch (err) {
      console.error('Failed to join voice channel:', err);
      if (roomRef) { roomRef.removeAllListeners(); roomRef.disconnect(); roomRef = null; }
      resetState();
    } finally {
      set({ connecting: false });
      joiningLock = false;
    }
  },

  leave: async () => {
    const room = roomRef;
    if (!room) { resetState(); return; }
    roomRef = null;
    playLeaveSound();
    await destroyRoom(room);
    resetState();
  },

  toggleMute: async () => {
    if (!roomRef || roomRef.state !== ConnectionState.Connected) return;
    const wasEnabled = roomRef.localParticipant.isMicrophoneEnabled;
    await roomRef.localParticipant.setMicrophoneEnabled(!wasEnabled);
    set({ isMuted: wasEnabled });
    syncParticipants();
  },

  toggleCamera: async () => {
    if (!roomRef || roomRef.state !== ConnectionState.Connected) return;
    const wasEnabled = roomRef.localParticipant.isCameraEnabled;
    await roomRef.localParticipant.setCameraEnabled(!wasEnabled);
    set({ isCameraOn: !wasEnabled });
    syncParticipants();
  },

  toggleScreenShare: async () => {
    if (!roomRef || roomRef.state !== ConnectionState.Connected) return;
    if (roomRef.localParticipant.isScreenShareEnabled) {
      const pub = roomRef.localParticipant.getTrackPublication(Track.Source.ScreenShare) as LocalTrackPublication | undefined;
      if (pub?.track) { pub.track.stop(); await roomRef.localParticipant.unpublishTrack(pub.track); }
      set({ isScreenSharing: false });
    } else {
      try {
        await roomRef.localParticipant.setScreenShareEnabled(true, {
          resolution: { width: 3840, height: 2160, frameRate: 60 },
          contentHint: 'detail',
        });
        set({ isScreenSharing: true });
      } catch { /* User cancelled */ }
    }
    syncParticipants();
  },

  toggleDeafen: async () => {
    if (!roomRef || roomRef.state !== ConnectionState.Connected) return;
    const room = roomRef;
    const next = !get().isDeafened;
    room.remoteParticipants.forEach((rp) => {
      rp.audioTrackPublications.forEach((pub) => {
        if (pub.track) {
          if (next) pub.track.detach().forEach((el) => el.remove());
          else { const el = pub.track.attach(); document.body.appendChild(el); }
        }
      });
    });
    if (next) {
      wasMutedBeforeDeafen = !room.localParticipant.isMicrophoneEnabled;
      if (room.localParticipant.isMicrophoneEnabled) {
        room.localParticipant.setMicrophoneEnabled(false);
        set({ isMuted: true });
      }
    } else if (!wasMutedBeforeDeafen) {
      room.localParticipant.setMicrophoneEnabled(true);
      set({ isMuted: false });
    }
    set({ isDeafened: next });
    syncParticipants();
  },

  togglePTT: () => {
    const next = !get().pttMode;
    pttModeRef = next;
    if (roomRef && roomRef.state === ConnectionState.Connected) {
      if (next) {
        roomRef.localParticipant.setMicrophoneEnabled(false);
        set({ isMuted: true, pttActive: false, pttMode: next });
      } else {
        roomRef.localParticipant.setMicrophoneEnabled(true);
        set({ isMuted: false, pttMode: next });
      }
      syncParticipants();
    } else {
      set({ pttMode: next });
    }
  },
}));

// PTT key handler (global, runs once)
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (!pttModeRef || !roomRef) return;
    if (e.code !== 'Space') return;
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
    e.preventDefault();
    if (e.repeat) return;
    if (roomRef.state !== ConnectionState.Connected) return;
    roomRef.localParticipant.setMicrophoneEnabled(true);
    useVoiceStore.setState({ isMuted: false, pttActive: true });
    syncParticipants();
  });

  window.addEventListener('keyup', (e) => {
    if (!pttModeRef || !roomRef) return;
    if (e.code !== 'Space') return;
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
    if (roomRef.state !== ConnectionState.Connected) return;
    roomRef.localParticipant.setMicrophoneEnabled(false);
    useVoiceStore.setState({ isMuted: true, pttActive: false });
    syncParticipants();
  });
}
