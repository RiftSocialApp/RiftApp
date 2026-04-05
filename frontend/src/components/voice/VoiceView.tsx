import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Track } from 'livekit-client';
import { usePresenceStore } from '../../stores/presenceStore';
import { useStreamStore } from '../../stores/streamStore';
import { useVoiceStore, type VoiceParticipant } from '../../stores/voiceStore';
import type { User } from '../../types';
import VoiceParticipantContextMenu from './VoiceParticipantContextMenu';
import VoiceStreamContextMenu from './VoiceStreamContextMenu';

type TileMenuState = {
  x: number;
  y: number;
  participant: VoiceParticipant;
  kind: 'participant' | 'stream';
} | null;

export default function VoiceView() {
  const connected = useVoiceStore((s) => s.connected);
  const connecting = useVoiceStore((s) => s.connecting);
  const participants = useVoiceStore((s) => s.participants);
  const isMuted = useVoiceStore((s) => s.isMuted);
  const isDeafened = useVoiceStore((s) => s.isDeafened);
  const isCameraOn = useVoiceStore((s) => s.isCameraOn);
  const isScreenSharing = useVoiceStore((s) => s.isScreenSharing);
  const voiceOutputMuted = useVoiceStore((s) => s.voiceOutputMuted);
  const toggleMute = useVoiceStore((s) => s.toggleMute);
  const toggleDeafen = useVoiceStore((s) => s.toggleDeafen);
  const toggleCamera = useVoiceStore((s) => s.toggleCamera);
  const toggleScreenShare = useVoiceStore((s) => s.toggleScreenShare);
  const toggleVoiceOutputMute = useVoiceStore((s) => s.toggleVoiceOutputMute);
  const leave = useVoiceStore((s) => s.leave);

  const setViewingVoice = useStreamStore((s) => s.setViewingVoice);
  const streams = useStreamStore((s) => s.streams);
  const viewingVoiceStreamId = useStreamStore((s) => s.viewingVoiceStreamId);
  const hubMembers = usePresenceStore((s) => s.hubMembers);

  const stream = streams.find((s) => s.id === viewingVoiceStreamId);

  const [focusedIdentity, setFocusedIdentity] = useState<string | null>(null);
  const [showNonVideoParticipants, setShowNonVideoParticipants] = useState(true);
  /** Hide screen-share video for a participant; tile shows camera/avatar like Discord Stop Watching */
  const [stoppedWatchingStream, setStoppedWatchingStream] = useState<Record<string, boolean>>({});
  const [tileMenu, setTileMenu] = useState<TileMenuState>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const moreWrapRef = useRef<HTMLDivElement>(null);

  const visibleParticipants = useMemo(() => {
    if (showNonVideoParticipants) return participants;
    const f = participants.filter((p) => p.isScreenSharing || p.isCameraOn);
    return f.length > 0 ? f : participants;
  }, [participants, showNonVideoParticipants]);

  const focusedParticipant = useMemo(
    () => (focusedIdentity ? participants.find((p) => p.identity === focusedIdentity) : undefined),
    [focusedIdentity, participants],
  );

  useEffect(() => {
    if (!focusedIdentity) return;
    if (!visibleParticipants.some((p) => p.identity === focusedIdentity)) {
      setFocusedIdentity(null);
    }
  }, [focusedIdentity, visibleParticipants]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFocusedIdentity(null);
        setTileMenu(null);
        setMoreOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!moreOpen) return;
    const close = (e: MouseEvent) => {
      if (moreWrapRef.current && !moreWrapRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [moreOpen]);

  const handleTileClick = useCallback((identity: string) => {
    setFocusedIdentity((f) => (f === identity ? null : identity));
  }, []);

  const requestStageFullscreen = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    void (document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen());
  }, []);

  const handlePopOut = useCallback(() => {
    window.open(window.location.href, '_blank', 'popup=yes,width=960,height=720,noopener,noreferrer');
  }, []);

  const openTileContextMenu = useCallback(
    (e: React.MouseEvent, p: VoiceParticipant) => {
      e.preventDefault();
      const showingStream =
        Boolean(p.isScreenSharing && p.screenTrack) && !stoppedWatchingStream[p.identity];
      setTileMenu({
        x: e.clientX,
        y: e.clientY,
        participant: p,
        kind: showingStream ? 'stream' : 'participant',
      });
    },
    [stoppedWatchingStream],
  );

  const suppressStreamFor = useCallback(
    (identity: string) => Boolean(stoppedWatchingStream[identity]),
    [stoppedWatchingStream],
  );

  const inFocusMode = Boolean(focusedParticipant);

  return (
    <div className="flex-1 flex flex-col bg-[#000000] min-w-0 min-h-0">
      {/* Header */}
      <div className="h-12 flex items-center px-4 border-b border-white/[0.06] flex-shrink-0 bg-[#0a0a0c]">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[#b5bac1] flex-shrink-0">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
          <h3 className="font-semibold text-[15px] text-[#f2f3f5] truncate">{stream?.name || 'Voice Channel'}</h3>
          {connected && (
            <span className="text-xs text-[#949ba4] ml-2">
              {participants.length} participant{participants.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Stage + grid */}
      <div ref={stageRef} className="flex-1 flex flex-col min-h-0 relative bg-[#000000]">
        {!connected && !connecting ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#949ba4]">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              </div>
              <p className="text-[#949ba4] text-sm">Not connected to this voice channel</p>
            </div>
          </div>
        ) : connecting ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-4 animate-pulse">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-riftapp-warning">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              </div>
              <p className="text-riftapp-warning text-sm font-medium">Connecting…</p>
            </div>
          </div>
        ) : inFocusMode && focusedParticipant ? (
          <FocusLayout
            focused={focusedParticipant}
            filmstrip={visibleParticipants}
            hubMembers={hubMembers}
            suppressStreamFor={suppressStreamFor}
            onTileClick={handleTileClick}
            onTileContextMenu={openTileContextMenu}
          />
        ) : (
          <div
            className="flex-1 min-h-0 p-2 grid gap-2 content-stretch"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
              gridAutoRows: '1fr',
            }}
          >
            {visibleParticipants.map((p) => (
              <ParticipantTile
                key={p.identity}
                participant={p}
                hubMembers={hubMembers}
                fill
                suppressStream={suppressStreamFor(p.identity)}
                onClick={() => handleTileClick(p.identity)}
                onContextMenu={(e) => openTileContextMenu(e, p)}
              />
            ))}
          </div>
        )}

        {/* Bottom-right: output mute, pop out, fullscreen (Discord-style) */}
        {connected && (
          <div className="absolute bottom-4 right-4 flex items-center gap-1 z-20">
            <IconBubbleBtn
              title={voiceOutputMuted ? 'Unmute channel output' : 'Mute channel output'}
              onClick={() => toggleVoiceOutputMute()}
              active={voiceOutputMuted}
            >
              {voiceOutputMuted ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              )}
            </IconBubbleBtn>
            <IconBubbleBtn title="Pop Out" onClick={handlePopOut}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 3h7v7M10 14L21 3M21 14v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" strokeLinecap="round" />
              </svg>
            </IconBubbleBtn>
            <IconBubbleBtn title="Fullscreen" onClick={requestStageFullscreen}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M16 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" strokeLinecap="round" />
              </svg>
            </IconBubbleBtn>
          </div>
        )}
      </div>

      {tileMenu?.kind === 'stream' && (
        <VoiceStreamContextMenu
          participant={tileMenu.participant}
          x={tileMenu.x}
          y={tileMenu.y}
          onClose={() => setTileMenu(null)}
          onStopWatching={() =>
            setStoppedWatchingStream((s) => ({ ...s, [tileMenu.participant.identity]: true }))
          }
          onPopOutStream={handlePopOut}
          onMoreOptions={() => setTileMenu((m) => (m ? { ...m, kind: 'participant' } : null))}
        />
      )}
      {tileMenu?.kind === 'participant' && (
        <VoiceParticipantContextMenu
          participant={tileMenu.participant}
          member={hubMembers[tileMenu.participant.identity]}
          x={tileMenu.x}
          y={tileMenu.y}
          showNonVideoParticipants={showNonVideoParticipants}
          onToggleShowNonVideo={() => setShowNonVideoParticipants((v) => !v)}
          onClose={() => setTileMenu(null)}
          onRequestFocus={() => setFocusedIdentity(tileMenu.participant.identity)}
          onRequestFullscreen={() => {
            setFocusedIdentity(tileMenu.participant.identity);
            queueMicrotask(() => stageRef.current?.requestFullscreen());
          }}
          streamHiddenLocally={Boolean(stoppedWatchingStream[tileMenu.participant.identity])}
          onResumeStream={() =>
            setStoppedWatchingStream((s) => {
              const n = { ...s };
              delete n[tileMenu.participant.identity];
              return n;
            })
          }
        />
      )}

      {/* Control bar */}
      {connected && (
        <div className="flex-shrink-0 flex items-center justify-center gap-3 px-6 py-4 bg-transparent relative">
          <div className="flex items-center gap-1 rounded-[24px] bg-[#1e1f22] px-2 py-2 border border-black/50 shadow-elevation-md">
            <ControlBtn onClick={() => void toggleMute()} crossed={isMuted} tooltip={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
                  <path d="M17 16.95A7 7 0 015 12m14 0a7 7 0 01-.11 1.23" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </ControlBtn>

            <ControlBtn onClick={() => void toggleCamera()} active={isCameraOn} crossed={!isCameraOn} tooltip={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}>
              {isCameraOn ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M23 7l-7 5 7 5V7z" />
                  <rect x="1" y="5" width="15" height="14" rx="2" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M16 16v1a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2h2m5.66 0H14a2 2 0 012 2v3.34" />
                  <path d="M23 7l-7 5 7 5V7z" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              )}
            </ControlBtn>

            <ControlBtn onClick={() => void toggleScreenShare()} active={isScreenSharing} tooltip={isScreenSharing ? 'Stop Sharing' : 'Share Your Screen'}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
                {isScreenSharing && <path d="M9 10l3-3 3 3M12 7v6" />}
              </svg>
            </ControlBtn>

            <ControlBtn onClick={() => {}} tooltip="Activities" className="opacity-60 cursor-default">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" />
                <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" />
                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
              </svg>
            </ControlBtn>

            <ControlBtn onClick={() => {}} tooltip="Soundboard" className="opacity-60 cursor-default">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </ControlBtn>

            <div className="relative" ref={moreWrapRef}>
              <ControlBtn onClick={() => setMoreOpen((o) => !o)} tooltip="More">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="text-[#b5bac1]">
                  <circle cx="5" cy="12" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="19" cy="12" r="2" />
                </svg>
              </ControlBtn>
              {moreOpen && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 min-w-[200px] rounded-md bg-[#111214] border border-black/40 py-1 shadow-modal z-50">
                  <button type="button" className="w-full text-left px-3 py-2 text-[14px] text-[#dbdee1] hover:bg-[#5865f2]/30 rounded-md" onClick={() => { setMoreOpen(false); void toggleDeafen(); }}>
                    {isDeafened ? 'Undeafen' : 'Deafen'}
                  </button>
                  <button type="button" className="w-full text-left px-3 py-2 text-[14px] text-[#dbdee1] hover:bg-[#5865f2]/30 rounded-md" onClick={() => setMoreOpen(false)}>
                    Voice settings…
                  </button>
                </div>
              )}
            </div>
          </div>

          <ControlBtn
            onClick={() => {
              leave();
              setViewingVoice(null);
            }}
            danger
            tooltip="Disconnect"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 010-1.36C3.53 8.46 7.5 6.5 12 6.5s8.47 1.96 11.71 5.22c.19.19.29.44.29.71 0 .28-.1.52-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28a11.27 11.27 0 00-2.67-1.85.996.996 0 01-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
            </svg>
          </ControlBtn>
        </div>
      )}
    </div>
  );
}

function IconBubbleBtn({
  children,
  onClick,
  title,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors border ${
        active ? 'bg-[#ed4245]/20 border-[#ed4245]/40 text-white' : 'bg-[#1e1f22]/90 border-white/10 text-[#dbdee1] hover:bg-[#2b2d31]'
      }`}
    >
      {children}
    </button>
  );
}

function ControlBtn({
  children,
  onClick,
  tooltip,
  active,
  danger,
  crossed,
  className = '',
}: {
  children: React.ReactNode;
  onClick: () => void;
  tooltip: string;
  active?: boolean;
  danger?: boolean;
  crossed?: boolean;
  className?: string;
}) {
  let cls = 'bg-transparent hover:bg-white/[0.06] text-[#b5bac1]';
  if (danger) cls = 'bg-[#ed4245] hover:bg-[#c93b3e] text-white';
  else if (active) cls = 'bg-[#5865f2] hover:bg-[#4752c4] text-white';
  else if (crossed) cls = 'bg-transparent hover:bg-white/[0.06] text-[#ed4245]';

  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip}
      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-150 active:scale-95 ${cls} ${className}`}
    >
      {children}
    </button>
  );
}

function TileHoverExpand() {
  return (
    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-md bg-black/60 p-1.5 text-white">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M16 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function FocusLayout({
  focused,
  filmstrip,
  hubMembers,
  suppressStreamFor,
  onTileClick,
  onTileContextMenu,
}: {
  focused: VoiceParticipant;
  filmstrip: VoiceParticipant[];
  hubMembers: Record<string, User>;
  suppressStreamFor: (identity: string) => boolean;
  onTileClick: (identity: string) => void;
  onTileContextMenu: (e: React.MouseEvent, p: VoiceParticipant) => void;
}) {
  return (
    <div className="flex-1 flex flex-col min-h-0 gap-2 p-2">
      <div className="flex-[2] min-h-0 rounded-xl overflow-hidden ring-1 ring-white/10 relative group bg-black/50">
        <button
          type="button"
          className="absolute inset-0 w-full h-full text-left"
          onClick={() => onTileClick(focused.identity)}
          onContextMenu={(e) => onTileContextMenu(e, focused)}
        >
          <StageContent participant={focused} hubMembers={hubMembers} suppressStream={suppressStreamFor(focused.identity)} />
        </button>
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
          <button
            type="button"
            className="rounded-md bg-black/70 p-2 text-white hover:bg-black/90"
            title="Exit focus (or press same tile)"
            onClick={(e) => {
              e.stopPropagation();
              onTileClick(focused.identity);
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M16 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
      <div className="flex-[1] min-h-[100px] max-h-[200px] flex gap-2 overflow-x-auto overflow-y-hidden pb-1">
        {filmstrip.map((p) => (
          <div key={p.identity} className="flex-shrink-0 w-[min(44vw,280px)] h-full min-h-[92px]">
            <ParticipantTile
              participant={p}
              hubMembers={hubMembers}
              fill
              filmstrip
              activeFocus={p.identity === focused.identity}
              suppressStream={suppressStreamFor(p.identity)}
              onClick={() => onTileClick(p.identity)}
              onContextMenu={(e) => onTileContextMenu(e, p)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function StageContent({
  participant,
  hubMembers,
  suppressStream,
}: {
  participant: VoiceParticipant;
  hubMembers: Record<string, User>;
  suppressStream?: boolean;
}) {
  const member = hubMembers[participant.identity];
  const displayName = member?.display_name || member?.username || participant.identity;
  const avatarUrl = member?.avatar_url;

  const showStream = Boolean(participant.isScreenSharing && participant.screenTrack && !suppressStream);
  if (showStream) {
    return <ScreenShareStage participant={participant} hubMembers={hubMembers} fill />;
  }

  const hasCam = participant.isCameraOn && participant.videoTrack;
  if (hasCam) {
    return (
      <div className="relative w-full h-full min-h-0">
        <CameraFill participant={participant} />
        <NameOverlay displayName={displayName} participant={participant} />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center" style={{ backgroundColor: getAvatarColor(participant.identity) }}>
      <div className="rounded-full overflow-hidden w-28 h-28 ring-4 ring-black/30">
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-black/30 flex items-center justify-center text-3xl font-bold text-white">{displayName.slice(0, 2).toUpperCase()}</div>
        )}
      </div>
      <NameOverlay displayName={displayName} participant={participant} />
    </div>
  );
}

function CameraFill({ participant }: { participant: VoiceParticipant }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const track = participant.videoTrack;
    const el = videoRef.current;
    if (track && el && track.kind === Track.Kind.Video) {
      track.attach(el);
      return () => {
        track.detach(el);
      };
    }
  }, [participant.videoTrack]);
  return <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />;
}

function ScreenShareStage({
  participant,
  hubMembers,
  fill,
}: {
  participant: VoiceParticipant;
  hubMembers: Record<string, User>;
  fill?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const member = hubMembers[participant.identity];
  const displayName = member?.display_name || member?.username || participant.identity;

  useEffect(() => {
    const track = participant.screenTrack;
    const el = videoRef.current;
    if (track && el && track.kind === Track.Kind.Video) {
      track.attach(el);
      return () => {
        track.detach(el);
      };
    }
  }, [participant.screenTrack]);

  return (
    <div className={`relative w-full h-full flex items-center justify-center bg-black ${fill ? '' : ''}`}>
      <div className="absolute top-2 right-2 z-10 bg-[#ed4245] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">LIVE</div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={fill ? 'w-full h-full object-contain' : 'max-w-full max-h-full rounded-lg shadow-2xl'}
      />
      <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-sm rounded-md px-2.5 py-1 flex items-center gap-1.5 pointer-events-none">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-riftapp-accent">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
        <span className="text-xs font-medium text-white">{displayName}&apos;s screen</span>
      </div>
    </div>
  );
}

function NameOverlay({ displayName, participant }: { displayName: string; participant: VoiceParticipant }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
      <div className="flex items-center gap-1.5 min-w-0 rounded-md bg-black/55 px-2 py-1">
        {participant.isMuted && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#ed4245] shrink-0">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
          </svg>
        )}
        <span className="text-sm font-medium text-white truncate">{displayName}</span>
      </div>
    </div>
  );
}

function ParticipantTile({
  participant,
  hubMembers,
  fill,
  filmstrip,
  activeFocus,
  suppressStream,
  onClick,
  onContextMenu,
}: {
  participant: VoiceParticipant;
  hubMembers: Record<string, User>;
  fill?: boolean;
  filmstrip?: boolean;
  activeFocus?: boolean;
  /** When true, show camera/avatar instead of screen share in this tile */
  suppressStream?: boolean;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const member = hubMembers[participant.identity];
  const displayName = member?.display_name || member?.username || participant.identity;
  const avatarUrl = member?.avatar_url;

  const showScreen = Boolean(participant.isScreenSharing && participant.screenTrack && !suppressStream);
  const videoForAttach = showScreen ? participant.screenTrack : participant.videoTrack;
  const hasVideo = Boolean(videoForAttach && (showScreen || participant.isCameraOn));

  useEffect(() => {
    const track = videoForAttach;
    const el = videoRef.current;
    if (track && el && track.kind === Track.Kind.Video) {
      track.attach(el);
      return () => {
        track.detach(el);
      };
    }
  }, [videoForAttach]);

  const speaking = participant.isSpeaking;

  return (
    <button
      type="button"
      className={`relative rounded-xl overflow-hidden transition-all duration-200 text-left w-full h-full min-h-0 group ${
        speaking ? 'ring-[3px] ring-riftapp-voice-speaking shadow-lg shadow-riftapp-voice-speaking/15' : 'ring-1 ring-white/10'
      } ${activeFocus ? 'ring-2 ring-[#5865f2]' : ''} ${fill ? 'min-h-[100px]' : 'aspect-video'}`}
      style={!hasVideo ? { backgroundColor: getAvatarColor(participant.identity) } : undefined}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      {showScreen && <div className="absolute top-1.5 right-1.5 z-10 bg-[#ed4245] text-white text-[9px] font-bold px-1 py-px rounded">LIVE</div>}

      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full ${showScreen ? 'object-contain bg-black' : 'object-cover'}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center min-h-[inherit]">
          <div className={`rounded-full overflow-hidden ${filmstrip ? 'w-14 h-14' : 'w-20 h-20'}`}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-black/35 flex items-center justify-center">
                <span className={`font-bold text-white ${filmstrip ? 'text-lg' : 'text-2xl'}`}>{displayName.slice(0, 2).toUpperCase()}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <TileHoverExpand />

      <div className="absolute bottom-0 left-0 right-0 p-2 flex items-end justify-between bg-gradient-to-t from-black/65 to-transparent pointer-events-none">
        <div className="flex items-center gap-1 min-w-0 rounded bg-black/50 px-1.5 py-0.5 max-w-[90%]">
          {participant.isMuted && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#ed4245] shrink-0">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
            </svg>
          )}
          <span className={`text-xs font-medium truncate ${speaking ? 'text-riftapp-voice-speaking' : 'text-white'}`}>{displayName}</span>
        </div>
      </div>
    </button>
  );
}

function getAvatarColor(identity: string): string {
  let hash = 0;
  for (let i = 0; i < identity.length; i++) {
    hash = identity.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, 30%, 18%)`;
}
