import { create } from 'zustand';
import {
  Room,
  RoomEvent,
  Track,
  VideoPresets,
  type AudioCaptureOptions,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
  type LocalTrackPublication,
  type Participant,
  ConnectionState,
} from 'livekit-client';
import { api } from '../api/client';
import { wsSend } from '../hooks/useWebSocket';

const NS_STORAGE_KEY = 'riftapp-noise-suppression-mode';

export type NoiseSuppressionMode = 'krisp' | 'standard' | 'off';

function loadNoiseSuppressionMode(): NoiseSuppressionMode {
  try {
    const v = localStorage.getItem(NS_STORAGE_KEY);
    if (v === 'krisp' || v === 'standard' || v === 'off') return v;
  } catch {
    /* private mode / unavailable */
  }
  return 'krisp';
}

function persistNoiseSuppressionMode(mode: NoiseSuppressionMode) {
  try {
    localStorage.setItem(NS_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

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
  /** 0–1 per remote identity; used for HTML audio elements tagged with data-riftapp-voice-id */
  participantVolumes: Record<string, number>;
  /** Mutes all remote voice output without changing per-user slider values */
  voiceOutputMuted: boolean;
  /** Extra 0–1 multiplier for participants who are screen sharing (stream audio) */
  streamVolumes: Record<string, number>;
  /** Per-identity stream mute (context menu) */
  streamAudioMuted: Record<string, boolean>;
  /** Duck stream audio when others are speaking */
  streamAttenuationEnabled: boolean;
  /** 0–100, higher = stronger ducking */
  streamAttenuationStrength: number;
  /**
   * Browser capture processing (Discord-style labels; uses WebRTC constraints, not the Krisp SDK).
   * `krisp` prefers experimental voice isolation where supported; `standard` uses classic noise suppression.
   */
  noiseSuppressionMode: NoiseSuppressionMode;

  join: (streamId: string) => Promise<void>;
  leave: () => void;
  toggleMute: () => void;
  toggleDeafen: () => Promise<void>;
  toggleCamera: () => void;
  toggleScreenShare: () => void;
  togglePTT: () => void;
  setParticipantVolume: (identity: string, volume: number) => void;
  toggleVoiceOutputMute: () => void;
  setStreamVolume: (identity: string, volume: number) => void;
  toggleStreamAudioMute: (identity: string) => void;
  setStreamAttenuationEnabled: (enabled: boolean) => void;
  setStreamAttenuationStrength: (strength: number) => void;
  setNoiseSuppressionMode: (mode: NoiseSuppressionMode) => Promise<void>;
  toggleNoiseSuppression: () => Promise<void>;
}

const CONNECT_TIMEOUT_MS = 15_000;

/** Constraints passed to LiveKit when enabling the microphone */
function micAudioCaptureOptions(mode: NoiseSuppressionMode): AudioCaptureOptions {
  const base: AudioCaptureOptions = {
    echoCancellation: true,
    autoGainControl: true,
  };
  if (mode === 'off') return { ...base, noiseSuppression: false };
  if (mode === 'standard') return { ...base, noiseSuppression: true };
  // "Krisp" branding: strongest stack the browser exposes (voice isolation supersedes noiseSuppression when supported)
  return { ...base, voiceIsolation: true };
}

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
  reapplyAllRemoteVoiceVolumes();
}

function effectiveRemoteVolume(identity: string): number {
  const s = useVoiceStore.getState();
  if (s.voiceOutputMuted) return 0;
  let base = s.participantVolumes[identity] ?? 1;
  const p = s.participants.find((x) => x.identity === identity);
  if (p?.isScreenSharing) {
    if (s.streamAudioMuted[identity]) base = 0;
    else base *= s.streamVolumes[identity] ?? 1;
    if (s.streamAttenuationEnabled) {
      const othersSpeaking = s.participants.some((x) => x.isSpeaking && x.identity !== identity);
      if (othersSpeaking) {
        const t = (s.streamAttenuationStrength ?? 40) / 100;
        base *= Math.max(0.12, 1 - t * 0.88);
      }
    }
  }
  return Math.min(1, Math.max(0, base));
}

function appendRemoteAudioElement(track: Track, identity: string) {
  const el = track.attach() as HTMLMediaElement;
  el.setAttribute('data-riftapp-voice-id', identity);
  el.volume = effectiveRemoteVolume(identity);
  document.body.appendChild(el);
}

function reapplyAllRemoteVoiceVolumes() {
  document.querySelectorAll<HTMLMediaElement>('audio[data-riftapp-voice-id]').forEach((el) => {
    const id = el.getAttribute('data-riftapp-voice-id');
    if (id) el.volume = effectiveRemoteVolume(id);
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
    participantVolumes: {},
    voiceOutputMuted: false,
    streamVolumes: {},
    streamAudioMuted: {},
    streamAttenuationEnabled: false,
    streamAttenuationStrength: 40,
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
  participantVolumes: {},
  voiceOutputMuted: false,
  streamVolumes: {},
  streamAudioMuted: {},
  streamAttenuationEnabled: false,
  streamAttenuationStrength: 40,
  noiseSuppressionMode: loadNoiseSuppressionMode(),

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

      let nsMode = useVoiceStore.getState().noiseSuppressionMode;
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: { resolution: VideoPresets.h1080.resolution },
        audioCaptureDefaults: micAudioCaptureOptions(nsMode),
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
          const currentSid = useVoiceStore.getState().streamId;
          if (currentSid) wsSend('voice_state_update', { stream_id: currentSid, action: 'leave' });
          roomRef = null;
          detachAllRoomMedia(room);
          room.removeAllListeners();
          resetState();
        }
      });

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _pub: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (track && track.kind === Track.Kind.Audio) {
          appendRemoteAudioElement(track, participant.identity);
        }
      });
      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, _pub: RemoteTrackPublication, _participant: RemoteParticipant) => {
        if (track) track.detach().forEach((el) => el.remove());
      });

      await Promise.race([
        room.connect(url, token),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Connection timed out')), CONNECT_TIMEOUT_MS)),
      ]);

      if (roomRef !== room) { room.disconnect(); return; }

      const startMuted = pttModeRef;
      nsMode = useVoiceStore.getState().noiseSuppressionMode;
      await room.localParticipant.setMicrophoneEnabled(
        !startMuted,
        !startMuted ? micAudioCaptureOptions(nsMode) : undefined,
      );

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
        participantVolumes: {},
        voiceOutputMuted: false,
        streamVolumes: {},
        streamAudioMuted: {},
        streamAttenuationEnabled: false,
        streamAttenuationStrength: 40,
      });
      wsSend('voice_state_update', { stream_id: sid, action: 'join' });
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
    const sid = get().streamId;
    if (!room) { resetState(); return; }
    roomRef = null;
    if (sid) wsSend('voice_state_update', { stream_id: sid, action: 'leave' });
    playLeaveSound();
    await destroyRoom(room);
    resetState();
  },

  toggleMute: async () => {
    if (!roomRef || roomRef.state !== ConnectionState.Connected) return;
    const wasEnabled = roomRef.localParticipant.isMicrophoneEnabled;
    const nsMode = get().noiseSuppressionMode;
    await roomRef.localParticipant.setMicrophoneEnabled(
      !wasEnabled,
      !wasEnabled ? micAudioCaptureOptions(nsMode) : undefined,
    );
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
          else appendRemoteAudioElement(pub.track, rp.identity);
        }
      });
    });
    if (next) {
      wasMutedBeforeDeafen = !room.localParticipant.isMicrophoneEnabled;
      if (room.localParticipant.isMicrophoneEnabled) {
        await room.localParticipant.setMicrophoneEnabled(false);
        set({ isMuted: true });
      }
    } else if (!wasMutedBeforeDeafen) {
      await room.localParticipant.setMicrophoneEnabled(true, micAudioCaptureOptions(get().noiseSuppressionMode));
      set({ isMuted: false });
    }
    set({ isDeafened: next });
    syncParticipants();
  },

  togglePTT: () => {
    const next = !get().pttMode;
    pttModeRef = next;
    if (roomRef && roomRef.state === ConnectionState.Connected) {
      const nsMode = get().noiseSuppressionMode;
      if (next) {
        void roomRef.localParticipant.setMicrophoneEnabled(false);
        set({ isMuted: true, pttActive: false, pttMode: next });
      } else {
        void roomRef.localParticipant.setMicrophoneEnabled(true, micAudioCaptureOptions(nsMode));
        set({ isMuted: false, pttMode: next });
      }
      syncParticipants();
    } else {
      set({ pttMode: next });
    }
  },

  setParticipantVolume: (identity, volume) => {
    const v = Math.min(1, Math.max(0, volume));
    set((s) => ({ participantVolumes: { ...s.participantVolumes, [identity]: v } }));
    queueMicrotask(() => reapplyAllRemoteVoiceVolumes());
  },

  toggleVoiceOutputMute: () => {
    set((s) => ({ voiceOutputMuted: !s.voiceOutputMuted }));
    queueMicrotask(() => reapplyAllRemoteVoiceVolumes());
  },

  setStreamVolume: (identity, volume) => {
    const v = Math.min(1, Math.max(0, volume));
    set((s) => ({ streamVolumes: { ...s.streamVolumes, [identity]: v } }));
    queueMicrotask(() => reapplyAllRemoteVoiceVolumes());
  },

  toggleStreamAudioMute: (identity) => {
    set((s) => {
      const next = !s.streamAudioMuted[identity];
      return { streamAudioMuted: { ...s.streamAudioMuted, [identity]: next } };
    });
    queueMicrotask(() => reapplyAllRemoteVoiceVolumes());
  },

  setStreamAttenuationEnabled: (enabled) => {
    set({ streamAttenuationEnabled: enabled });
    queueMicrotask(() => reapplyAllRemoteVoiceVolumes());
  },

  setStreamAttenuationStrength: (strength) => {
    const n = Math.min(100, Math.max(0, strength));
    set({ streamAttenuationStrength: n });
    queueMicrotask(() => reapplyAllRemoteVoiceVolumes());
  },

  setNoiseSuppressionMode: async (mode) => {
    persistNoiseSuppressionMode(mode);
    set({ noiseSuppressionMode: mode });
    const room = roomRef;
    if (room?.state === ConnectionState.Connected && room.localParticipant.isMicrophoneEnabled) {
      await room.localParticipant.setMicrophoneEnabled(false);
      await room.localParticipant.setMicrophoneEnabled(true, micAudioCaptureOptions(mode));
      syncParticipants();
    }
  },

  toggleNoiseSuppression: async () => {
    const cur = get().noiseSuppressionMode;
    await get().setNoiseSuppressionMode(cur === 'off' ? 'krisp' : 'off');
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
    const nsMode = useVoiceStore.getState().noiseSuppressionMode;
    void roomRef.localParticipant.setMicrophoneEnabled(true, micAudioCaptureOptions(nsMode));
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
