import { useEffect, useRef } from 'react';
import { Track } from 'livekit-client';
import { usePresenceStore } from '../../stores/presenceStore';
import { useStreamStore } from '../../stores/streamStore';
import { useVoice, type VoiceParticipant } from '../../hooks/useVoice';
import NotificationBell from '../notifications/NotificationBell';

export default function VoiceView() {
  const voice = useVoice();
  const viewingVoiceStreamId = useStreamStore((s) => s.viewingVoiceStreamId);
  const streams = useStreamStore((s) => s.streams);
  const hubMembers = usePresenceStore((s) => s.hubMembers);

  const stream = streams.find((s) => s.id === viewingVoiceStreamId);
  const { participants } = voice;

  const screenSharer = participants.find((p) => p.isScreenSharing);

  return (
    <div className="flex-1 flex flex-col bg-[#1a1a2e] min-w-0">
      {/* Header */}
      <div className="h-12 flex items-center px-4 border-b border-riptide-border/60 flex-shrink-0 shadow-[0_1px_0_rgba(0,0,0,0.2)]">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-riptide-text-dim flex-shrink-0">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
          <h3 className="font-semibold text-[15px] truncate">{stream?.name || 'Voice Channel'}</h3>
          {voice.connected && (
            <span className="text-xs text-riptide-text-dim ml-2">
              {participants.length} participant{participants.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <NotificationBell />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!voice.connected ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-riptide-surface flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-riptide-text-dim">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              </div>
              <p className="text-riptide-text-dim text-sm">
                {voice.connecting ? 'Connecting to voice…' : 'Not connected to this voice channel'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* If someone is screen sharing, show it prominently */}
            {screenSharer ? (
              <div className="flex-1 flex overflow-hidden">
                {/* Screen share takes most space */}
                <div className="flex-1 p-2 flex items-center justify-center bg-black/30 min-w-0">
                  <ScreenShareTile participant={screenSharer} hubMembers={hubMembers} />
                </div>
                {/* Participant strip on the right */}
                <div className="w-56 flex-shrink-0 overflow-y-auto p-2 space-y-2">
                  {participants.map((p) => (
                    <ParticipantTile key={p.identity} participant={p} hubMembers={hubMembers} compact />
                  ))}
                </div>
              </div>
            ) : (
              /* Normal grid view */
              <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
                <div className={`grid gap-3 w-full max-w-5xl ${getGridCols(participants.length)}`}>
                  {participants.map((p) => (
                    <ParticipantTile key={p.identity} participant={p} hubMembers={hubMembers} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls bar */}
      {voice.connected && (
        <div className="h-16 flex items-center justify-center gap-2 bg-[#13132a] border-t border-riptide-border/30 flex-shrink-0 px-4">
          <ControlButton
            active={!voice.isMuted}
            danger={voice.isMuted}
            onClick={voice.toggleMute}
            title={voice.isMuted ? 'Unmute' : 'Mute'}
          >
            {voice.isMuted ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
                <path d="M17 16.95A7 7 0 015 12m14 0a7 7 0 01-.11 1.23" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                <path d="M19 10v2a7 7 0 01-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
          </ControlButton>

          <ControlButton
            active={!voice.isDeafened}
            danger={voice.isDeafened}
            onClick={voice.toggleDeafen}
            title={voice.isDeafened ? 'Undeafen' : 'Deafen'}
          >
            {voice.isDeafened ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9a3 3 0 015-2.24M21 12a9 9 0 00-7.48-8.86" />
                <path d="M3 12a9 9 0 008 8.94V18a3 3 0 01-3-3v-1" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 18v-6a9 9 0 0118 0v6" />
                <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
              </svg>
            )}
          </ControlButton>

          <ControlButton
            active={voice.isCameraOn}
            onClick={voice.toggleCamera}
            title={voice.isCameraOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {voice.isCameraOn ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M16 16v1a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2h2m5.66 0H14a2 2 0 012 2v3.34" />
                <path d="M23 7l-7 5 7 5V7z" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            )}
          </ControlButton>

          <ControlButton
            active={voice.isScreenSharing}
            onClick={voice.toggleScreenShare}
            title={voice.isScreenSharing ? 'Stop sharing' : 'Share your screen'}
            highlight={voice.isScreenSharing}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
              {voice.isScreenSharing && <path d="M9 10l3-3 3 3M12 7v6" />}
            </svg>
          </ControlButton>

          <div className="w-px h-8 bg-riptide-border/30 mx-1" />

          <ControlButton
            danger
            onClick={() => { voice.leave(); useStreamStore.getState().setViewingVoice(null); }}
            title="Disconnect"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.73.8 2 2 0 011.72 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91" />
              <line x1="23" y1="1" x2="1" y2="23" />
            </svg>
          </ControlButton>
        </div>
      )}
    </div>
  );
}

/* ───── Video Tile for a Participant ───── */

function ParticipantTile({ participant, hubMembers, compact }: {
  participant: VoiceParticipant;
  hubMembers: Record<string, import('../../types').User>;
  compact?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const member = hubMembers[participant.identity];
  const displayName = member?.display_name || member?.username || participant.identity;
  const avatarUrl = member?.avatar_url;

  useEffect(() => {
    const track = participant.videoTrack;
    const el = videoRef.current;
    if (track && el && track.kind === Track.Kind.Video) {
      track.attach(el);
      return () => { track.detach(el); };
    }
  }, [participant.videoTrack]);

  const hasVideo = participant.isCameraOn && participant.videoTrack;

  return (
    <div
      className={`relative rounded-xl overflow-hidden transition-all duration-200 ${
        participant.isSpeaking
          ? 'ring-[3px] ring-riptide-success shadow-lg shadow-riptide-success/20'
          : 'ring-1 ring-white/10'
      } ${compact ? 'aspect-video' : 'aspect-video'}`}
      style={{ backgroundColor: getAvatarColor(participant.identity) }}
    >
      {hasVideo ? (
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className={`rounded-full overflow-hidden ${compact ? 'w-14 h-14' : 'w-20 h-20'}`}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-riptide-surface/60 flex items-center justify-center">
                <span className={`font-bold text-white ${compact ? 'text-xl' : 'text-2xl'}`}>
                  {displayName.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Name + indicators overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-2 flex items-end justify-between bg-gradient-to-t from-black/60 to-transparent">
        <span className={`text-xs font-medium truncate ${participant.isSpeaking ? 'text-riptide-success' : 'text-white'}`}>
          {displayName}
        </span>
        <div className="flex items-center gap-1">
          {participant.isMuted && (
            <div className="bg-black/50 rounded-full p-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-riptide-danger">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
              </svg>
            </div>
          )}
          {participant.isScreenSharing && (
            <div className="bg-black/50 rounded-full p-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-riptide-accent">
                <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───── Screen Share Tile ───── */

function ScreenShareTile({ participant, hubMembers }: {
  participant: VoiceParticipant;
  hubMembers: Record<string, import('../../types').User>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const member = hubMembers[participant.identity];
  const displayName = member?.display_name || member?.username || participant.identity;

  useEffect(() => {
    const track = participant.screenTrack;
    const el = videoRef.current;
    if (track && el && track.kind === Track.Kind.Video) {
      track.attach(el);
      return () => { track.detach(el); };
    }
  }, [participant.screenTrack]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <video ref={videoRef} autoPlay playsInline className="max-w-full max-h-full rounded-lg shadow-2xl" />
      <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm rounded-md px-2.5 py-1 flex items-center gap-1.5">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-riptide-accent">
          <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="12" y1="17" x2="12" y2="21" />
        </svg>
        <span className="text-xs font-medium text-white">{displayName}'s screen</span>
      </div>
    </div>
  );
}

/* ───── Control Button ───── */

function ControlButton({ children, onClick, title, active, danger, highlight }: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
  danger?: boolean;
  highlight?: boolean;
}) {
  let bg = 'bg-[#2b2d42] hover:bg-[#3a3d56] text-white/80 hover:text-white';
  if (danger) bg = 'bg-red-600/80 hover:bg-red-600 text-white';
  else if (highlight) bg = 'bg-riptide-accent/80 hover:bg-riptide-accent text-white';
  else if (active) bg = 'bg-[#2b2d42] hover:bg-[#3a3d56] text-white';

  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 active:scale-95 ${bg}`}
    >
      {children}
    </button>
  );
}

/* ───── Helpers ───── */

function getGridCols(count: number): string {
  if (count <= 1) return 'grid-cols-1 max-w-lg mx-auto';
  if (count <= 2) return 'grid-cols-2';
  if (count <= 4) return 'grid-cols-2';
  if (count <= 6) return 'grid-cols-3';
  if (count <= 9) return 'grid-cols-3';
  return 'grid-cols-4';
}

function getAvatarColor(identity: string): string {
  let hash = 0;
  for (let i = 0; i < identity.length; i++) {
    hash = identity.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 30%, 18%)`;
}
