import { useCallback, useMemo, useState } from 'react';
import { usePresenceStore } from '../../stores/presenceStore';
import { useProfilePopoverStore } from '../../stores/profilePopoverStore';
import { useUserContextMenuStore } from '../../stores/userContextMenuStore';
import StatusDot, { statusLabel } from '../shared/StatusDot';
import BotBadge from '../shared/BotBadge';
import type { User } from '../../types';
import { publicAssetUrl } from '../../utils/publicAssetUrl';
import {
  dispatchChatSearchRequest,
  type ChatSearchFocusFilter,
} from '../../utils/chatSearchBridge';

function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function FilterIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function UserIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

function HashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 9h14" />
      <path d="M3 15h14" />
      <path d="M11 3 8 21" />
      <path d="M16 3 13 21" />
    </svg>
  );
}

function MentionIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M16 12v1a4 4 0 1 0 4-4" />
      <path d="M12 4a8 8 0 1 0 8 8" />
    </svg>
  );
}

function SlidersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="18" y2="18" />
      <circle cx="9" cy="6" r="2" />
      <circle cx="15" cy="12" r="2" />
      <circle cx="11" cy="18" r="2" />
    </svg>
  );
}

type SearchShortcut = {
  key: ChatSearchFocusFilter | 'more';
  title: string;
  chipLabel: string;
  fullWidth?: boolean;
  Icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactNode;
};

const SEARCH_SHORTCUTS: ReadonlyArray<SearchShortcut> = [
  {
    key: 'author_id',
    title: 'Filter by author',
    chipLabel: 'From',
    Icon: UserIcon,
  },
  {
    key: 'stream_id',
    title: 'Filter by channel',
    chipLabel: 'In',
    Icon: HashIcon,
  },
  {
    key: 'has',
    title: 'Filter by attachments and embeds',
    chipLabel: 'Has',
    Icon: FilterIcon,
  },
  {
    key: 'mentions',
    title: 'Filter by mentions',
    chipLabel: 'Mentions',
    Icon: MentionIcon,
  },
  {
    key: 'more',
    title: 'Open advanced filters',
    chipLabel: 'More filters',
    fullWidth: true,
    Icon: SlidersIcon,
  },
];

function SearchShortcutChip({
  title,
  chipLabel,
  Icon,
  fullWidth,
  onClick,
}: {
  title: string;
  chipLabel: string;
  Icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactNode;
  fullWidth?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex h-7 min-w-0 items-center gap-1.5 rounded-[6px] border border-[#2d3138] bg-[#202225] px-2 text-left text-[11px] font-medium text-[#b5bac1] transition-colors hover:border-[#3b4048] hover:bg-[#262930] hover:text-[#f2f3f5] ${fullWidth ? 'col-span-2' : ''}`}
    >
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center text-current">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="truncate leading-none">{chipLabel}</span>
    </button>
  );
}

function UserRow({ user }: { user: User }) {
  const status = usePresenceStore((s) => s.presence[user.id]) ?? user.status;
  const isOffline = status === 0;
  const openProfile = useProfilePopoverStore((s) => s.open);
  const openContextMenu = useUserContextMenuStore((s) => s.open);

  const handleClick = useCallback((e: React.MouseEvent) => {
    openProfile(user, (e.currentTarget as HTMLElement).getBoundingClientRect());
  }, [user, openProfile]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    openContextMenu(user, e.clientX, e.clientY);
  }, [user, openContextMenu]);

  return (
    <div onClick={handleClick} onContextMenu={handleContextMenu} className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-colors group cursor-pointer ${isOffline ? 'opacity-40 hover:bg-riftapp-content-elevated' : 'hover:bg-riftapp-content-elevated'}`}>
      <div className="relative flex-shrink-0">
        {user.avatar_url ? (
          <img src={publicAssetUrl(user.avatar_url)} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-riftapp-content-elevated flex items-center justify-center">
            <span className="text-xs font-semibold text-[#c7ced9] uppercase">
              {user.display_name?.[0] || user.username[0]}
            </span>
          </div>
        )}
        <div className="absolute -bottom-0.5 -right-0.5 border-2 border-riftapp-content rounded-full">
          <StatusDot userId={user.id} fallbackStatus={user.status} size="sm" />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight text-[#e4e6eb] flex items-center gap-1.5">
          <span className="truncate">{user.display_name || user.username}</span>
          {user.is_bot && <BotBadge />}
        </p>
      </div>
      <span className="text-[10px] text-[#777d88] opacity-0 transition-opacity group-hover:opacity-100">
        {statusLabel(status)}
      </span>
    </div>
  );
}

export default function MemberList() {
  const hubMembers = usePresenceStore((s) => s.hubMembers);
  const presence = usePresenceStore((s) => s.presence);
  const [messageSearch, setMessageSearch] = useState('');

  const { online, offline } = useMemo(() => {
    const members = Object.values(hubMembers);
    const onlineList: User[] = [];
    const offlineList: User[] = [];

    for (const m of members) {
      const status = presence[m.id] ?? m.status;
      if (status > 0) {
        onlineList.push(m);
      } else {
        offlineList.push(m);
      }
    }

    const sortByName = (a: User, b: User) =>
      (a.display_name || a.username).localeCompare(b.display_name || b.username);

    onlineList.sort(sortByName);
    offlineList.sort(sortByName);

    return { online: onlineList, offline: offlineList };
  }, [hubMembers, presence]);

  const runMessageSearch = useCallback(() => {
    dispatchChatSearchRequest({ query: messageSearch, run: true, clearFiltersOnRun: true });
  }, [messageSearch]);

  const openAdvancedSearch = useCallback((focusFilter?: ChatSearchFocusFilter) => {
    dispatchChatSearchRequest({ query: messageSearch, focusFilter });
  }, [messageSearch]);

  if (Object.keys(hubMembers).length === 0) return null;

  return (
    <div className="relative w-60 border-l border-riftapp-border/60 bg-riftapp-content flex flex-col overflow-visible flex-shrink-0">
      <div className="relative z-20 border-b border-riftapp-border/50 bg-riftapp-content px-3 py-3">
        <div className="space-y-2.5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#949ba4]">Message search</p>
            <p className="mt-1 text-[12px] leading-4 text-[#72767d]">Search this server or jump straight into a filter.</p>
          </div>

          <div className="flex h-8 min-w-0 items-center gap-1 rounded-[6px] bg-[#24272d] px-2 text-[#b5bac1] shadow-[0_1px_0_rgba(0,0,0,0.32)] transition-colors hover:bg-[#262930] focus-within:bg-[#262930]">
            <SearchIcon className="h-[13px] w-[13px] shrink-0 text-[#72767d]" />
            <input
              type="text"
              value={messageSearch}
              onChange={(event) => {
                setMessageSearch(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  runMessageSearch();
                }
              }}
              placeholder="Search messages"
              className="min-w-0 flex-1 bg-transparent py-0 text-[12px] leading-5 text-[#dcddde] outline-none placeholder:text-[#72767d]"
              aria-label="Search messages"
            />
            <button
              type="button"
              onClick={runMessageSearch}
              className="inline-flex h-5 w-6 shrink-0 items-center justify-center rounded-[3px] bg-[#2d3138] text-[#8f949c] transition-colors hover:bg-[#363a43] hover:text-[#dcddde]"
              aria-label="Run message search"
            >
              <SearchIcon className="h-[13px] w-[13px]" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {SEARCH_SHORTCUTS.map((shortcut) => (
              <SearchShortcutChip
                key={shortcut.key}
                title={shortcut.title}
                chipLabel={shortcut.chipLabel}
                Icon={shortcut.Icon}
                fullWidth={shortcut.fullWidth}
                onClick={() => {
                  if (shortcut.key === 'more') {
                    openAdvancedSearch();
                    return;
                  }
                  openAdvancedSearch(shortcut.key);
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {online.length > 0 && (
          <div>
            <h4 className="px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7b818e] mb-1">
              Online — {online.length}
            </h4>
            <div className="space-y-0.5">
              {online.map((m) => (
                <UserRow key={m.id} user={m} />
              ))}
            </div>
          </div>
        )}

        {offline.length > 0 && (
          <div>
            <h4 className="px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7b818e] mb-1">
              Offline — {offline.length}
            </h4>
            <div className="space-y-0.5">
              {offline.map((m) => (
                <UserRow key={m.id} user={m} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
