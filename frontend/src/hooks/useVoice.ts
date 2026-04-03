import { useState, useRef, useCallback, useEffect } from 'react';
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

export interface VoiceState {
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
  } catch {
    // Audio not available
  }
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
      if (pub.track) {
        pub.track.detach().forEach((el) => el.remove());
      }
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
  } catch {
    // Already stopped
  }
}

function getTrackForSource(p: Participant, source: Track.Source): Track | undefined {
  const pub = p.getTrackPublication(source);
  return pub?.track ?? undefined;
}

export function useVoice(): VoiceState {
  const roomRef = useRef<Room | null>(null);
  const joiningRef = useRef(false);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [pttMode, setPttMode] = useState(false);
  const [pttActive, setPttActive] = useState(false);
  const pttModeRef = useRef(false);
  const wasMutedBeforeDeafenRef = useRef(false);

  const resetState = useCallback(() => {
    setConnected(false);
    setConnecting(false);
    setRoomName(null);
    setStreamId(null);
    setParticipants([]);
    setIsMuted(false);
    setIsDeafened(false);
    setIsCameraOn(false);
    setIsScreenSharing(false);
    setPttActive(false);
  }, []);

  const updateParticipants = useCallback((room: Room) => {
    if (room.state !== ConnectionState.Connected) return;
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
    room.remoteParticipants.forEach((rp) => {
      list.push(toVP(rp));
    });
    setParticipants(list);

    setIsCameraOn(room.localParticipant.isCameraEnabled);
    setIsScreenSharing(room.localParticipant.isScreenShareEnabled);
  }, []);

  const destroyRoom = useCallback(async (room: Room) => {
    detachAllRoomMedia(room);
    await stopLocalTracks(room);
    room.removeAllListeners();
    room.disconnect();
  }, []);

  const join = useCallback(async (sid: string) => {
    if (joiningRef.current) return;
    joiningRef.current = true;

    if (roomRef.current) {
      const old = roomRef.current;
      roomRef.current = null;
      await destroyRoom(old);
    }

    setConnecting(true);
    try {
      const { token, url } = await api.getVoiceToken(sid);

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: VideoPresets.h1080.resolution,
        },
      });
      roomRef.current = room;

      const onUpdate = () => updateParticipants(room);

      room.on(RoomEvent.ParticipantConnected, () => { onUpdate(); playJoinSound(); });
      room.on(RoomEvent.ParticipantDisconnected, () => { onUpdate(); playLeaveSound(); });
      room.on(RoomEvent.TrackSubscribed, onUpdate);
      room.on(RoomEvent.TrackUnsubscribed, onUpdate);
      room.on(RoomEvent.TrackMuted, onUpdate);
      room.on(RoomEvent.TrackUnmuted, onUpdate);
      room.on(RoomEvent.ActiveSpeakersChanged, onUpdate);
      room.on(RoomEvent.LocalTrackPublished, onUpdate);
      room.on(RoomEvent.LocalTrackUnpublished, onUpdate);
      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        if (state === ConnectionState.Disconnected) {
          if (roomRef.current === room) {
            roomRef.current = null;
            detachAllRoomMedia(room);
            room.removeAllListeners();
            resetState();
          }
        }
      });

      room.on(
        RoomEvent.TrackSubscribed,
        (track: RemoteTrackPublication['track'], _pub: RemoteTrackPublication, _rp: RemoteParticipant) => {
          if (track && track.kind === Track.Kind.Audio) {
            const el = track.attach();
            document.body.appendChild(el);
          }
        },
      );
      room.on(
        RoomEvent.TrackUnsubscribed,
        (track: RemoteTrackPublication['track']) => {
          if (track) {
            track.detach().forEach((el) => el.remove());
          }
        },
      );

      await Promise.race([
        room.connect(url, token),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Connection timed out')), CONNECT_TIMEOUT_MS),
        ),
      ]);

      if (roomRef.current !== room) {
        room.disconnect();
        return;
      }

      const startMuted = pttModeRef.current;
      await room.localParticipant.setMicrophoneEnabled(!startMuted);

      setConnected(true);
      setRoomName(room.name);
      setStreamId(sid);
      setIsMuted(startMuted);
      setIsDeafened(false);
      setIsCameraOn(false);
      setIsScreenSharing(false);
      updateParticipants(room);
      playJoinSound();
    } catch (err) {
      console.error('Failed to join voice channel:', err);
      if (roomRef.current) {
        roomRef.current.removeAllListeners();
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      resetState();
    } finally {
      setConnecting(false);
      joiningRef.current = false;
    }
  }, [updateParticipants, destroyRoom, resetState]);

  const leave = useCallback(async () => {
    const room = roomRef.current;
    if (!room) {
      resetState();
      return;
    }
    roomRef.current = null;
    playLeaveSound();
    await destroyRoom(room);
    resetState();
  }, [destroyRoom, resetState]);

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room || room.state !== ConnectionState.Connected) return;
    const wasEnabled = room.localParticipant.isMicrophoneEnabled;
    await room.localParticipant.setMicrophoneEnabled(!wasEnabled);
    setIsMuted(wasEnabled);
    updateParticipants(room);
  }, [updateParticipants]);

  const toggleCamera = useCallback(async () => {
    const room = roomRef.current;
    if (!room || room.state !== ConnectionState.Connected) return;
    const wasEnabled = room.localParticipant.isCameraEnabled;
    await room.localParticipant.setCameraEnabled(!wasEnabled);
    setIsCameraOn(!wasEnabled);
    updateParticipants(room);
  }, [updateParticipants]);

  const toggleScreenShare = useCallback(async () => {
    const room = roomRef.current;
    if (!room || room.state !== ConnectionState.Connected) return;

    if (room.localParticipant.isScreenShareEnabled) {
      const pub = room.localParticipant.getTrackPublication(Track.Source.ScreenShare) as LocalTrackPublication | undefined;
      if (pub?.track) {
        pub.track.stop();
        await room.localParticipant.unpublishTrack(pub.track);
      }
      setIsScreenSharing(false);
    } else {
      try {
        await room.localParticipant.setScreenShareEnabled(true, {
          resolution: { width: 3840, height: 2160, frameRate: 60 },
          contentHint: 'detail',
        });
        setIsScreenSharing(true);
      } catch {
        // User cancelled the picker
      }
    }
    updateParticipants(room);
  }, [updateParticipants]);

  const toggleDeafen = useCallback(async () => {
    const room = roomRef.current;
    if (!room || room.state !== ConnectionState.Connected) return;

    setIsDeafened((prev) => {
      const next = !prev;
      room.remoteParticipants.forEach((rp) => {
        rp.audioTrackPublications.forEach((pub) => {
          if (pub.track) {
            if (next) {
              pub.track.detach().forEach((el) => el.remove());
            } else {
              const el = pub.track.attach();
              document.body.appendChild(el);
            }
          }
        });
      });
      if (next) {
        wasMutedBeforeDeafenRef.current = !room.localParticipant.isMicrophoneEnabled;
        if (room.localParticipant.isMicrophoneEnabled) {
          room.localParticipant.setMicrophoneEnabled(false);
          setIsMuted(true);
          updateParticipants(room);
        }
      } else {
        if (!wasMutedBeforeDeafenRef.current) {
          room.localParticipant.setMicrophoneEnabled(true);
          setIsMuted(false);
          updateParticipants(room);
        }
      }
      return next;
    });
  }, [updateParticipants]);

  const togglePTT = useCallback(() => {
    setPttMode((prev) => {
      const next = !prev;
      pttModeRef.current = next;
      const room = roomRef.current;
      if (room && room.state === ConnectionState.Connected) {
        if (next) {
          room.localParticipant.setMicrophoneEnabled(false);
          setIsMuted(true);
          setPttActive(false);
          updateParticipants(room);
        } else {
          room.localParticipant.setMicrophoneEnabled(true);
          setIsMuted(false);
          updateParticipants(room);
        }
      }
      return next;
    });
  }, [updateParticipants]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!pttModeRef.current || !roomRef.current) return;
      if (e.code !== 'Space') return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      e.preventDefault();
      if (e.repeat) return;
      const room = roomRef.current;
      if (room.state !== ConnectionState.Connected) return;
      room.localParticipant.setMicrophoneEnabled(true);
      setIsMuted(false);
      setPttActive(true);
      updateParticipants(room);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!pttModeRef.current || !roomRef.current) return;
      if (e.code !== 'Space') return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      const room = roomRef.current;
      if (room.state !== ConnectionState.Connected) return;
      room.localParticipant.setMicrophoneEnabled(false);
      setIsMuted(true);
      setPttActive(false);
      updateParticipants(room);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [updateParticipants]);

  useEffect(() => {
    return () => {
      const room = roomRef.current;
      if (room) {
        roomRef.current = null;
        detachAllRoomMedia(room);
        stopLocalTracks(room);
        room.removeAllListeners();
        room.disconnect();
      }
    };
  }, []);

  return {
    connected,
    connecting,
    roomName,
    streamId,
    participants,
    isMuted,
    isDeafened,
    isCameraOn,
    isScreenSharing,
    pttActive,
    pttMode,
    join,
    leave,
    toggleMute,
    toggleDeafen,
    toggleCamera,
    toggleScreenShare,
    togglePTT,
  };
}
