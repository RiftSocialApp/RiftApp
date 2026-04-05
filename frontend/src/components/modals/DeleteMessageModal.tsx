import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { Message } from '../../types';
import { publicAssetUrl } from '../../utils/publicAssetUrl';

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today at ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday at ${time}`;
  return `${date.toLocaleDateString()} ${time}`;
}

function avatarBg(name: string): string {
  const colors = [
    'bg-[#f47067]', 'bg-[#e0823d]', 'bg-[#c4a000]',
    'bg-[#57ab5a]', 'bg-[#39c5cf]', 'bg-[#6cb6ff]',
    'bg-[#dcbdfb]', 'bg-[#f69d50]', 'bg-[#fc8dc7]',
    'bg-[#b083f0]',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

interface Props {
  message: Message;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteMessageModal({ message, onConfirm, onCancel }: Props) {
  const [deleting, setDeleting] = useState(false);
  const authorName = message.author?.display_name || 'Unknown';
  const bg = avatarBg(authorName);

  const handleConfirm = useCallback(async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      onConfirm();
    } finally {
      setDeleting(false);
    }
  }, [deleting, onConfirm]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
      onClick={onCancel}
    >
      <div
        className="bg-[#313338] rounded-xl w-[440px] shadow-modal animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-[18px] font-bold text-white">Delete Message</h2>
          <p className="text-[14px] text-[#b5bac1] mt-1">
            Are you sure you want to delete this message?
          </p>
        </div>

        {/* Message preview */}
        <div className="mx-5 mb-4 rounded-lg bg-[#2b2d31] border border-[#1e1f22] p-3">
          <div className="flex gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden">
              {message.author?.avatar_url ? (
                <img
                  src={publicAssetUrl(message.author.avatar_url)}
                  alt={authorName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full ${bg} flex items-center justify-center text-xs font-bold text-white`}>
                  {authorName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {/* Name + timestamp */}
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="font-semibold text-[15px] text-[#dbdee1] truncate">
                  {authorName}
                </span>
                <span className="text-[11px] text-[#949ba4] select-none flex-shrink-0">
                  {formatTime(message.created_at)}
                </span>
              </div>

              {/* Content */}
              <p className="text-[14px] text-[#dbdee1]/80 break-words line-clamp-4 whitespace-pre-wrap">
                {message.content || (
                  <span className="text-[#949ba4] italic">No text content</span>
                )}
              </p>

              {/* Attachment indicator */}
              {message.attachments && message.attachments.length > 0 && (
                <p className="text-[12px] text-[#949ba4] mt-1 flex items-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.49" />
                  </svg>
                  {message.attachments.length} attachment{message.attachments.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Protip */}
        <div className="mx-5 mb-4">
          <p className="text-[12px] text-[#949ba4]">
            <span className="font-semibold text-[#b5bac1]">Protip:</span>{' '}
            You can hold <kbd className="px-1 py-0.5 rounded bg-[#1e1f22] text-[#dbdee1] text-[11px] font-mono">Shift</kbd> while clicking delete to skip this confirmation.
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-[#2b2d31] flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 text-[13px] font-medium text-[#dbdee1] hover:underline"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleConfirm()}
            disabled={deleting}
            className="px-5 py-2.5 rounded-[4px] bg-[#da373c] text-white text-[13px] font-medium
              hover:bg-[#a12828] active:scale-95 transition-all disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
