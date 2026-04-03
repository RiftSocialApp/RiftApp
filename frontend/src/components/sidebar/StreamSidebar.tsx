import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHubStore } from '../../stores/hubStore';
import { useStreamStore } from '../../stores/streamStore';
import { usePresenceStore } from '../../stores/presenceStore';
import { useAuthStore } from '../../stores/auth';
import { useSelfProfileStore } from '../../stores/selfProfileStore';
import { useVoiceStore } from '../../stores/voiceStore';
import SettingsModal from '../settings/SettingsModal';
import HubSettingsModal from '../settings/HubSettingsModal';
import VoicePanel from '../voice/VoicePanel';
import StatusDot, { statusLabel } from '../shared/StatusDot';
import CreateChannelModal from '../modals/CreateChannelModal';
import CreateCategoryModal from '../modals/CreateCategoryModal';
import { api } from '../../api/client';
import type { User, Stream } from '../../types';

export default function StreamSidebar() {
  const streams = useStreamStore((s) => s.streams);
  const categories = useStreamStore((s) => s.categories);
  const activeHubId = useHubStore((s) => s.activeHubId);
  const activeStreamId = useStreamStore((s) => s.activeStreamId);
  const viewingVoiceStreamId = useStreamStore((s) => s.viewingVoiceStreamId);
  const setActiveStream = useStreamStore((s) => s.setActiveStream);
  const setViewingVoice = useStreamStore((s) => s.setViewingVoice);
  const hubs = useHubStore((s) => s.hubs);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const streamUnreads = useStreamStore((s) => s.streamUnreads);
  const hubMembers = usePresenceStore((s) => s.hubMembers);
  const [showHubSettings, setShowHubSettings] = useState(false);
  const [showInvitePopover, setShowInvitePopover] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteGenerating, setInviteGenerating] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const voice = useVoiceStore();

  // Header context menu
  const [headerMenu, setHeaderMenu] = useState<{ x: number; y: number } | null>(null);
  const [createChannelFor, setCreateChannelFor] = useState<string | undefined>(undefined);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);

  // Collapsible categories
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const activeHub = hubs.find((h) => h.id === activeHubId);

  // Group streams by category
  const { uncategorized, grouped } = useMemo(() => {
    const uncategorized: Stream[] = [];
    const grouped: Record<string, Stream[]> = {};
    for (const cat of categories) {
      grouped[cat.id] = [];
    }
    for (const s of streams) {
      if (s.category_id && grouped[s.category_id]) {
        grouped[s.category_id].push(s);
      } else {
        uncategorized.push(s);
      }
    }
    return { uncategorized, grouped };
  }, [streams, categories]);

  const handleGenerateInvite = async () => {
    if (!activeHubId) return;
    setInviteGenerating(true);
    try {
      const invite = await api.createInvite(activeHubId);
      setInviteCode(invite.code);
    } finally {
      setInviteGenerating(false);
    }
  };

  const handleCopyInvite = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  const handleInviteToggle = () => {
    setShowInvitePopover((s) => !s);
    if (!showInvitePopover) {
      setInviteCode(null);
      setInviteCopied(false);
    }
  };

  const toggleCollapse = (catId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const handleVoiceClick = (streamId: string) => {
    const isConnected = voice.streamId === streamId && voice.connected;
    if (isConnected) {
      setViewingVoice(streamId);
    } else {
      voice.join(streamId);
      setViewingVoice(streamId);
    }
  };

  const handleHeaderContext = (e: React.MouseEvent) => {
    e.preventDefault();
    setHeaderMenu({ x: e.clientX, y: e.clientY });
  };

  // Close header context menu on outside click
  useEffect(() => {
    if (!headerMenu) return;
    const handler = () => setHeaderMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [headerMenu]);

  if (!activeHubId) {
    return (
      <div className="w-60 flex-shrink-0 bg-riptide-surface flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-6">
            <div className="w-12 h-12 rounded-2xl bg-riptide-panel flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-riptide-text-dim">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-riptide-text-dim text-sm leading-relaxed">
              Select or create a hub to get started
            </p>
          </div>
        </div>
        <UserBar user={user} logout={logout} />
      </div>
    );
  }

  return (
    <div className="w-60 flex-shrink-0 bg-riptide-surface flex flex-col">
      {/* Hub header */}
      <div
        className="h-12 flex items-center border-b border-riptide-border/60 flex-shrink-0"
        onContextMenu={handleHeaderContext}
      >
        <button
          onClick={() => setShowHubSettings(true)}
          title="Hub settings"
          className="flex-1 flex items-center justify-between px-4 h-full
            hover:bg-riptide-surface-hover active:bg-riptide-panel transition-colors duration-150 group min-w-0"
        >
          <h2 className="font-semibold text-[15px] truncate">{activeHub?.name}</h2>
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
            className="text-riptide-text-dim group-hover:text-riptide-text transition-colors flex-shrink-0 ml-1"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <button
          onClick={handleInviteToggle}
          title="Invite people to this hub"
          className={`w-10 h-full flex items-center justify-center border-l border-riptide-border/40 transition-all duration-150 active:scale-95 flex-shrink-0 ${
            showInvitePopover
              ? 'bg-riptide-accent/15 text-riptide-accent'
              : 'text-riptide-text-dim hover:text-riptide-text hover:bg-riptide-surface-hover'
          }`}
          aria-label="Invite people"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
        </button>
      </div>

      {showHubSettings && activeHub && (
        <HubSettingsModal hub={activeHub} onClose={() => setShowHubSettings(false)} />
      )}

      {/* Invite popover */}
      {showInvitePopover && (
        <div className="mx-2 mt-2 p-3 rounded-xl bg-riptide-panel border border-riptide-border/40 animate-scale-in">
          <p className="text-[12px] font-semibold mb-1">Invite People</p>
          <p className="text-[11px] text-riptide-text-dim mb-2">Share this code to invite someone to <span className="font-medium text-riptide-text">{activeHub?.name}</span>.</p>
          {inviteCode ? (
            <div className="flex gap-1.5">
              <code className="flex-1 px-2 py-1 rounded-md bg-riptide-bg border border-riptide-border text-[12px] font-mono text-riptide-accent select-all truncate">{inviteCode}</code>
              <button onClick={handleCopyInvite} className="btn-primary py-1 px-2 text-[12px] flex-shrink-0">
                {inviteCopied ? '✓' : 'Copy'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleGenerateInvite}
              disabled={inviteGenerating}
              className="btn-primary w-full py-1.5 text-[13px]"
            >
              {inviteGenerating ? 'Generating…' : 'Generate Invite Code'}
            </button>
          )}
        </div>
      )}

      {/* Header right-click context menu */}
      {headerMenu && (
        <HeaderContextMenu
          x={headerMenu.x}
          y={headerMenu.y}
          onCreateChannel={() => { setCreateChannelFor(undefined); setShowCreateChannel(true); setHeaderMenu(null); }}
          onCreateCategory={() => { setShowCreateCategory(true); setHeaderMenu(null); }}
          onInvite={() => { handleInviteToggle(); setHeaderMenu(null); }}
        />
      )}

      {/* Channels list */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {/* Uncategorized channels */}
        {uncategorized.length > 0 && (
          <ChannelGroup
            streams={uncategorized}
            activeStreamId={activeStreamId}
            viewingVoiceStreamId={viewingVoiceStreamId}
            streamUnreads={streamUnreads}
            onSelect={setActiveStream}
            onVoiceClick={handleVoiceClick}
            voice={voice}
            voiceParticipants={voice.participants}
            hubMembers={hubMembers}
          />
        )}

        {/* Categorized channels */}
        {categories.map((cat) => {
          const catStreams = grouped[cat.id] || [];
          const isCollapsed = collapsed.has(cat.id);
          return (
            <div key={cat.id} className="mt-2">
              <div className="flex items-center group">
                <button
                  onClick={() => toggleCollapse(cat.id)}
                  className="flex items-center gap-0.5 flex-1 min-w-0 section-label px-1 mb-1 hover:text-riptide-text transition-colors"
                >
                  <svg
                    width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`opacity-60 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                  <span className="truncate uppercase">{cat.name}</span>
                </button>
                <button
                  onClick={() => { setCreateChannelFor(cat.id); setShowCreateChannel(true); }}
                  className="opacity-0 group-hover:opacity-100 text-riptide-text-dim hover:text-riptide-text transition-all p-0.5 rounded"
                  title="Create Channel"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </div>
              {!isCollapsed && (
                <ChannelGroup
                  streams={catStreams}
                  activeStreamId={activeStreamId}
                  viewingVoiceStreamId={viewingVoiceStreamId}
                  streamUnreads={streamUnreads}
                  onSelect={setActiveStream}
                  onVoiceClick={handleVoiceClick}
                  voice={voice}
                  voiceParticipants={voice.participants}
                  hubMembers={hubMembers}
                />
              )}
            </div>
          );
        })}

        {/* Quick create button */}
        <button
          onClick={() => { setCreateChannelFor(undefined); setShowCreateChannel(true); }}
          title="Create a new channel"
          className="channel-item channel-item-idle text-[13px] gap-1 mt-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-60">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Create Channel</span>
        </button>
      </div>

      {/* Voice panel */}
      <VoicePanel
        connected={voice.connected}
        connecting={voice.connecting}
        participants={voice.participants}
        isMuted={voice.isMuted}
        isDeafened={voice.isDeafened}
        pttMode={voice.pttMode}
        pttActive={voice.pttActive}
        streamName={streams.find((s) => s.id === voice.streamId)?.name || ''}
        hubMembers={hubMembers}
        onLeave={voice.leave}
        onToggleMute={voice.toggleMute}
        onToggleDeafen={voice.toggleDeafen}
        onTogglePTT={voice.togglePTT}
      />

      <UserBar user={user} logout={logout} />

      {showCreateChannel && activeHubId && (
        <CreateChannelModal hubId={activeHubId} categoryId={createChannelFor} onClose={() => setShowCreateChannel(false)} />
      )}
      {showCreateCategory && activeHubId && (
        <CreateCategoryModal hubId={activeHubId} onClose={() => setShowCreateCategory(false)} />
      )}
    </div>
  );
}

/* ───── Channel group (text + voice items) ───── */

interface ChannelGroupProps {
  streams: Stream[];
  activeStreamId: string | null;
  viewingVoiceStreamId: string | null;
  streamUnreads: Record<string, number>;
  onSelect: (id: string) => Promise<void>;
  onVoiceClick: (streamId: string) => void;
  voice: { streamId: string | null; connected: boolean };
  voiceParticipants: import('../../stores/voiceStore').VoiceParticipant[];
  hubMembers: Record<string, User>;
}

function ChannelGroup({ streams, activeStreamId, viewingVoiceStreamId, streamUnreads, onSelect, onVoiceClick, voice, voiceParticipants, hubMembers }: ChannelGroupProps) {
  const textStreams = streams.filter((s) => s.type === 0);
  const voiceStreams = streams.filter((s) => s.type === 1);

  return (
    <div className="space-y-0.5">
      {textStreams.map((stream) => {
        const isActive = activeStreamId === stream.id && !viewingVoiceStreamId;
        const unread = streamUnreads[stream.id] || 0;
        const hasUnread = unread > 0 && !isActive;
        return (
          <button
            key={stream.id}
            onClick={() => onSelect(stream.id)}
            title={`#${stream.name}`}
            className={`channel-item ${isActive ? 'channel-item-active' : 'channel-item-idle'} ${hasUnread ? '!text-riptide-text font-semibold' : ''}`}
          >
            <span className={`text-lg leading-none ${isActive ? 'text-riptide-text-muted' : 'text-riptide-text-dim'}`}>#</span>
            <span className="truncate">{stream.name}</span>
            {hasUnread && (
              <span className="ml-auto flex-shrink-0 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-riptide-accent text-[11px] font-bold text-white leading-none">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>
        );
      })}
      {voiceStreams.map((stream) => {
        const isConnected = voice.streamId === stream.id && voice.connected;
        const isViewing = viewingVoiceStreamId === stream.id;
        const channelParticipants = isConnected ? voiceParticipants : [];
        return (
          <div key={stream.id}>
            <button
              onClick={() => onVoiceClick(stream.id)}
              title={isConnected ? stream.name : `Join ${stream.name}`}
              className={`channel-item ${isViewing ? 'channel-item-active !text-riptide-success' : isConnected ? '!text-riptide-success channel-item-idle' : 'channel-item-idle'}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                className={`flex-shrink-0 ${isConnected ? 'text-riptide-success' : 'text-riptide-text-dim'}`}
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
              <span className="truncate">{stream.name}</span>
            </button>
            {channelParticipants.length > 0 && (
              <div className="ml-3 pl-3 border-l-2 border-riptide-border/30 space-y-0.5 mt-0.5 mb-1">
                {channelParticipants.map((p) => {
                  const member = hubMembers[p.identity];
                  const name = member?.display_name || member?.username || p.identity;
                  const avatarUrl = member?.avatar_url;
                  return (
                    <div key={p.identity} className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-riptide-surface-hover/50 transition-colors group">
                      <div className={`w-6 h-6 rounded-full flex-shrink-0 overflow-hidden ${p.isSpeaking ? 'ring-2 ring-riptide-success ring-offset-1 ring-offset-riptide-surface' : ''}`}>
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center text-[9px] font-semibold ${
                            p.isSpeaking ? 'bg-riptide-success text-white' : 'bg-riptide-panel text-riptide-text-muted'
                          }`}>
                            {name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className={`text-[13px] truncate flex-1 ${p.isSpeaking ? 'text-riptide-success font-medium' : 'text-riptide-text-muted'}`}>
                        {name}
                      </span>
                      {p.isMuted && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-riptide-danger/70 flex-shrink-0">
                          <line x1="1" y1="1" x2="23" y2="23" />
                          <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
                        </svg>
                      )}
                      {p.isScreenSharing && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-riptide-accent flex-shrink-0">
                          <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="12" y1="17" x2="12" y2="21" />
                        </svg>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ───── Header Context Menu ───── */

function HeaderContextMenu({ x, y, onCreateChannel, onCreateCategory, onInvite }: {
  x: number; y: number;
  onCreateChannel: () => void;
  onCreateCategory: () => void;
  onInvite: () => void;
}) {
  return (
    <div
      className="fixed z-[200] animate-scale-in"
      style={{ left: x, top: y }}
    >
      <div className="bg-riptide-panel rounded-lg border border-riptide-border/50 shadow-modal py-1.5 min-w-[180px]">
        <button onClick={onCreateChannel} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-riptide-accent hover:text-white transition-colors text-left">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Create Channel
        </button>
        <button onClick={onCreateCategory} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-riptide-accent hover:text-white transition-colors text-left">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
          Create Category
        </button>
        <div className="mx-2 my-1 border-t border-riptide-border/30" />
        <button onClick={onInvite} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-riptide-accent hover:text-white transition-colors text-left">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
          </svg>
          Invite to Server
        </button>
      </div>
    </div>
  );
}

/* ───── User Bar ───── */

function UserBar({ user }: { user: User | null; logout: () => void }) {
  const [showSettings, setShowSettings] = useState(false);
  const liveStatus = usePresenceStore((s) => user ? s.presence[user.id] : undefined);
  const openSelfProfile = useSelfProfileStore((s) => s.open);

  const handleAvatarClick = useCallback((e: React.MouseEvent) => {
    openSelfProfile((e.currentTarget as HTMLElement).getBoundingClientRect());
  }, [openSelfProfile]);

  useEffect(() => {
    const handler = () => setShowSettings(true);
    document.addEventListener('open-settings', handler);
    return () => document.removeEventListener('open-settings', handler);
  }, []);

  if (!user) return null;

  const currentStatus = liveStatus ?? user.status;

  return (
    <>
      <div className="h-[52px] flex items-center px-2 bg-riptide-bg/40 flex-shrink-0 gap-2">
        <button
          onClick={handleAvatarClick}
          className="flex items-center gap-2 flex-1 min-w-0 px-1 py-1 -ml-1 rounded-md hover:bg-riptide-panel/60 transition-all duration-150 group"
          title="View Profile"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-riptide-accent flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
              {user.display_name.slice(0, 2).toUpperCase()}
            </div>
            <StatusDot
              userId={user.id}
              fallbackStatus={user.status}
              size="lg"
              className="absolute -bottom-0.5 -right-0.5 border-[2.5px] border-riptide-bg"
            />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[13px] font-semibold truncate leading-tight">{user.display_name}</p>
            <p className="text-[11px] text-riptide-text-dim truncate leading-tight">{statusLabel(currentStatus)}</p>
          </div>
        </button>

        <button
          onClick={() => setShowSettings(true)}
          title="User Settings"
          className="w-8 h-8 rounded-md flex items-center justify-center text-riptide-text-dim
            hover:text-riptide-text hover:bg-riptide-panel/60 transition-all duration-150"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </button>
      </div>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}
