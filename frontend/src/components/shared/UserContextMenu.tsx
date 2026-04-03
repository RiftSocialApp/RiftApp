import { useEffect, useRef, useState, useCallback } from 'react';
import { useUserContextMenuStore } from '../../stores/userContextMenuStore';
import { useProfilePopoverStore } from '../../stores/profilePopoverStore';
import { useAuthStore } from '../../stores/auth';
import { useDMStore } from '../../stores/dmStore';

const MENU_WIDTH = 200;
const MENU_GAP = 4;

export default function UserContextMenu() {
  const user = useUserContextMenuStore((s) => s.user);
  const rawX = useUserContextMenuStore((s) => s.x);
  const rawY = useUserContextMenuStore((s) => s.y);
  const close = useUserContextMenuStore((s) => s.close);
  const openProfile = useProfilePopoverStore((s) => s.open);
  const currentUser = useAuthStore((s) => s.user);

  const menuRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [copied, setCopied] = useState(false);

  const computePosition = useCallback(() => {
    if (!menuRef.current) return;
    const menuH = menuRef.current.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = rawX;
    if (left + MENU_WIDTH > vw - MENU_GAP) {
      left = rawX - MENU_WIDTH;
    }
    left = Math.max(MENU_GAP, Math.min(left, vw - MENU_WIDTH - MENU_GAP));

    let top = rawY;
    if (top + menuH > vh - MENU_GAP) {
      top = vh - menuH - MENU_GAP;
    }
    top = Math.max(MENU_GAP, top);

    setPos({ top, left });
  }, [rawX, rawY]);

  useEffect(() => {
    if (user) {
      setCopied(false);
      requestAnimationFrame(() => {
        computePosition();
        requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
    }
  }, [user, computePosition]);

  useEffect(() => {
    if (!user) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onContext = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', onClick, true);
    document.addEventListener('keydown', onKey);
    document.addEventListener('contextmenu', onContext, true);
    return () => {
      document.removeEventListener('mousedown', onClick, true);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('contextmenu', onContext, true);
    };
  }, [user, close]);

  if (!user) return null;

  const isSelf = currentUser?.id === user.id;

  const handleProfile = () => {
    const rect = new DOMRect(rawX, rawY, 0, 0);
    openProfile(user, rect);
    close();
  };

  const handleMention = () => {
    document.dispatchEvent(new CustomEvent('insert-mention', { detail: user.username }));
    close();
  };

  const handleMessage = async () => {
    close();
    await useDMStore.getState().openDM(user.id);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id);
    setCopied(true);
    setTimeout(() => close(), 600);
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-[200] transition-all duration-100 ease-out"
      style={{
        top: pos.top,
        left: pos.left,
        width: MENU_WIDTH,
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(0.95)',
        transformOrigin: 'top left',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <div className="bg-riptide-panel rounded-lg border border-riptide-border/50 shadow-modal py-1.5 overflow-hidden">
        {/* Profile */}
        <MenuItem
          icon={<ProfileIcon />}
          label="Profile"
          onClick={handleProfile}
        />

        {/* Mention */}
        {!isSelf && (
          <MenuItem
            icon={<AtIcon />}
            label="Mention"
            onClick={handleMention}
          />
        )}

        {/* Message */}
        {!isSelf && (
          <MenuItem
            icon={<MessageIcon />}
            label="Message"
            onClick={handleMessage}
          />
        )}

        <Separator />

        {/* Copy User ID */}
        <MenuItem
          icon={<CopyIcon />}
          label={copied ? 'Copied!' : 'Copy User ID'}
          onClick={handleCopyId}
        />
      </div>
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm transition-colors ${
        danger
          ? 'text-riptide-danger hover:bg-riptide-danger hover:text-white'
          : 'text-riptide-text-muted hover:bg-riptide-accent hover:text-white'
      }`}
    >
      <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center">{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  );
}

function Separator() {
  return <div className="mx-2 my-1 border-t border-riptide-border/40" />;
}

function ProfileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function AtIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
