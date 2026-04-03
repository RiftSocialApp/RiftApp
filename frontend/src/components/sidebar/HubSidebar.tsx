import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useHubStore } from '../../stores/hubStore';
import { useDMStore } from '../../stores/dmStore';
import { useStreamStore } from '../../stores/streamStore';
import { useMessageStore } from '../../stores/messageStore';
import { api } from '../../api/client';

export default function HubSidebar() {
  const hubs = useHubStore((s) => s.hubs);
  const activeHubId = useHubStore((s) => s.activeHubId);
  const setActiveHub = useHubStore((s) => s.setActiveHub);
  const createHub = useHubStore((s) => s.createHub);
  const loadConversations = useDMStore((s) => s.loadConversations);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [dmHovered, setDmHovered] = useState(false);

  const isDMMode = !activeHubId;

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const hub = await createHub(newName.trim());
    setNewName('');
    setShowCreate(false);
    await setActiveHub(hub.id);
  };

  const handleJoin = async () => {
    const code = joinCode.trim();
    if (!code) return;
    setJoinError(null);
    setJoining(true);
    try {
      const result = await api.joinInvite(code);
      setJoinCode('');
      setShowJoin(false);
      await useHubStore.getState().loadHubs();
      await setActiveHub(result.hub.id);
    } catch (err: unknown) {
      setJoinError(err instanceof Error ? err.message : 'Invalid invite code');
    } finally {
      setJoining(false);
    }
  };

  const handleDMClick = () => {
    // Enter DM mode: clear hub selection, load conversations
    useHubStore.getState().clearActive();
    useStreamStore.getState().clearStreams();
    useMessageStore.getState().clearMessages();
    loadConversations();
  };

  return (
    <div className="w-[72px] flex-shrink-0 bg-riptide-bg flex flex-col items-center py-3 gap-2 overflow-y-auto">
      {/* DM Button */}
      <div
        className="relative flex items-center justify-center w-full"
        onMouseEnter={() => setDmHovered(true)}
        onMouseLeave={() => setDmHovered(false)}
      >
        <div
          className={`hub-pill ${
            isDMMode
              ? 'h-10 top-1'
              : dmHovered
                ? 'h-5 top-3.5'
                : 'h-0 top-6'
          }`}
        />
        <button
          onClick={handleDMClick}
          className={`hub-icon ${isDMMode ? 'hub-icon-active shadow-glow-sm' : 'hub-icon-idle'}`}
          title="Direct Messages"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
        {dmHovered && (
          <div className="absolute left-[68px] z-50 px-3 py-1.5 rounded-lg bg-riptide-panel text-sm text-riptide-text shadow-elevation-high font-medium whitespace-nowrap animate-fade-in pointer-events-none">
            Direct Messages
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="w-8 h-0.5 rounded-full bg-riptide-border my-0.5" />

      {/* Hub list */}
      {hubs.map((hub) => {
        const isActive = activeHubId === hub.id;
        const isHovered = hoveredId === hub.id;

        return (
          <div
            key={hub.id}
            className="relative flex items-center justify-center w-full"
            onMouseEnter={() => setHoveredId(hub.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* Active / hover pill indicator */}
            <div
              className={`hub-pill ${
                isActive
                  ? 'h-10 top-1'
                  : isHovered
                    ? 'h-5 top-3.5'
                    : 'h-0 top-6'
              }`}
            />

            {/* Hub icon with Discord-style morph */}
            <button
              onClick={() => setActiveHub(hub.id)}
              title={hub.name}
              className={`hub-icon ${isActive ? 'hub-icon-active shadow-glow-sm' : 'hub-icon-idle'}`}
            >
              {hub.icon_url ? (
                <img
                  src={hub.icon_url}
                  alt=""
                  className="w-full h-full rounded-[inherit] object-cover"
                />
              ) : (
                hub.name.slice(0, 2).toUpperCase()
              )}
            </button>

            {/* Tooltip */}
            {isHovered && (
              <div className="absolute left-[68px] z-50 px-3 py-1.5 rounded-lg bg-riptide-panel text-sm text-riptide-text shadow-elevation-high font-medium whitespace-nowrap animate-fade-in pointer-events-none">
                {hub.name}
              </div>
            )}
          </div>
        );
      })}

      {/* Separator */}
      <div className="w-8 h-0.5 rounded-full bg-riptide-border my-0.5" />

      {/* Create hub button */}
      <div className="relative flex items-center justify-center w-full">
        <button
          onClick={() => { setShowCreate(!showCreate); setShowJoin(false); }}
          className="hub-icon rounded-3xl bg-riptide-surface text-riptide-success hover:rounded-2xl hover:bg-riptide-success hover:text-white transition-all duration-300"
          title="Create Hub"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Join hub button */}
      <div className="relative flex items-center justify-center w-full">
        <button
          onClick={() => { setShowJoin(!showJoin); setShowCreate(false); }}
          className="hub-icon rounded-3xl bg-riptide-surface text-riptide-accent hover:rounded-2xl hover:bg-riptide-accent hover:text-white transition-all duration-300"
          title="Join a hub with an invite code"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
        </button>
      </div>

      {/* Create Hub Modal (portal) */}
      {showCreate && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => { setShowCreate(false); setNewName(''); }}>
          <div
            className="bg-riptide-surface border border-riptide-border/60 rounded-xl p-6 w-[420px] shadow-modal animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-1">Create a Hub</h2>
            <p className="text-sm text-riptide-text-dim mb-5">Give your new hub a name to get started.</p>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-riptide-text-dim mb-1.5 block">Hub Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') { setShowCreate(false); setNewName(''); }
              }}
              placeholder="My Awesome Hub"
              className="settings-input text-base"
              autoFocus
              maxLength={100}
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowCreate(false); setNewName(''); }}
                className="btn-ghost px-5 py-2.5"
              >
                Cancel
              </button>
              <button onClick={handleCreate} disabled={!newName.trim()} className="btn-primary px-5 py-2.5">
                Create Hub
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Join Hub Modal (portal) */}
      {showJoin && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => { setShowJoin(false); setJoinCode(''); setJoinError(null); }}>
          <div
            className="bg-riptide-surface border border-riptide-border/60 rounded-xl p-6 w-[420px] shadow-modal animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-1">Join a Hub</h2>
            <p className="text-sm text-riptide-text-dim mb-5">Enter an invite code or link to join an existing hub.</p>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-riptide-text-dim mb-1.5 block">Invite Code</label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value); setJoinError(null); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleJoin();
                if (e.key === 'Escape') { setShowJoin(false); setJoinCode(''); setJoinError(null); }
              }}
              placeholder="Enter invite code"
              className="settings-input text-base"
              autoFocus
              maxLength={64}
            />
            {joinError && (
              <p className="text-sm text-riptide-danger mt-2">{joinError}</p>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowJoin(false); setJoinCode(''); setJoinError(null); }}
                className="btn-ghost px-5 py-2.5"
              >
                Cancel
              </button>
              <button
                onClick={handleJoin}
                disabled={!joinCode.trim() || joining}
                className="btn-primary px-5 py-2.5"
              >
                {joining ? 'Joining...' : 'Join Hub'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
