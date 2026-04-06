import { useEffect, useMemo, useCallback, useRef } from 'react';
import { useHubStore } from '../../stores/hubStore';
import { useEmojiStore } from '../../stores/emojiStore';
import { useMediaPickerStore } from '../../stores/mediaPickerStore';
import { publicAssetUrl } from '../../utils/publicAssetUrl';
import { EMOJI_NAME_MAP } from '../../utils/emojiNames';
import type { HubEmoji } from '../../types';

export interface EmojiSelection {
  emoji: string;
  emojiId?: string;
  fileUrl?: string;
}

/* ── Unicode emoji data with searchable names ── */

const UNICODE_CATEGORIES: { label: string; emojis: string[] }[] = [
  { label: 'Smileys & People', emojis: ['😀', '😃', '😄', '😁', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶', '🫥', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕'] },
  { label: 'Gestures & Body', emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '🫵', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏'] },
  { label: 'Hearts & Symbols', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💯', '🔥', '💥', '💢', '💨', '💦', '💤', '💬', '💭', '🔔', '❌', '⭕', '❗', '❓', '‼️', '⁉️', '✅', '☑️'] },
  { label: 'Objects & Activities', emojis: ['⭐', '🌟', '💫', '✨', '🎵', '🎶', '🎹', '🎸', '🎺', '🥁', '🎮', '🕹️', '🎯', '🎲', '🧩', '🏆', '🥇', '🥈', '🥉', '🎗️', '🎫', '🎟️'] },
];

// Build reverse map: emoji char → name(s)
const emojiToNames: Map<string, string[]> = new Map();
for (const [name, emoji] of Object.entries(EMOJI_NAME_MAP)) {
  const existing = emojiToNames.get(emoji) ?? [];
  existing.push(name);
  emojiToNames.set(emoji, existing);
}

export default function EmojiTab({ onSelect }: { onSelect: (selection: EmojiSelection) => void }) {
  const searchQuery = useMediaPickerStore((s) => s.searchQuery);
  const setSearchQuery = useMediaPickerStore((s) => s.setSearchQuery);
  const emojiUsage = useMediaPickerStore((s) => s.emojiUsage);
  const getFrequentEmojis = useMediaPickerStore((s) => s.getFrequentEmojis);

  const hubs = useHubStore((s) => s.hubs);
  const loadHubEmojis = useEmojiStore((s) => s.loadHubEmojis);
  const hubEmojisMap = useEmojiStore((s) => s.hubEmojis);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Load emojis for all hubs
  useEffect(() => {
    for (const hub of hubs) {
      void loadHubEmojis(hub.id);
    }
  }, [hubs, loadHubEmojis]);

  const q = searchQuery.toLowerCase().trim();

  // Frequently used emojis
  const frequentEmojis = useMemo(() => {
    if (q) return []; // Hide when searching
    return getFrequentEmojis();
  }, [getFrequentEmojis, emojiUsage, q]);

  // All hub emojis grouped by hub
  const hubEmojiGroups = useMemo(() => {
    return hubs
      .map((hub) => {
        const emojis = hubEmojisMap[hub.id] ?? [];
        const filtered = q ? emojis.filter((e) => e.name.toLowerCase().includes(q)) : emojis;
        return { hub, emojis: filtered };
      })
      .filter((g) => g.emojis.length > 0);
  }, [hubs, hubEmojisMap, q]);

  // Filtered unicode categories
  const filteredUnicode = useMemo(() => {
    if (!q) return UNICODE_CATEGORIES;
    return UNICODE_CATEGORIES.map((cat) => ({
      ...cat,
      emojis: cat.emojis.filter((emoji) => {
        const names = emojiToNames.get(emoji);
        return names?.some((n) => n.includes(q));
      }),
    })).filter((cat) => cat.emojis.length > 0);
  }, [q]);

  const handleSelectUnicode = useCallback((emoji: string) => {
    onSelect({ emoji });
  }, [onSelect]);

  const handleSelectCustom = useCallback((e: HubEmoji) => {
    onSelect({ emoji: `:${e.name}:`, emojiId: e.id, fileUrl: e.file_url });
  }, [onSelect]);

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b5bac1] pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search emoji"
            className="w-full pl-9 pr-3 py-2 bg-[#1e1f22] border border-[#3f4147]/60 rounded-md text-sm text-[#dbdee1] placeholder:text-[#72767d] focus:outline-none focus:border-[#5865f2]/50"
          />
        </div>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin">
        {/* Frequently Used */}
        {frequentEmojis.length > 0 && (
          <div className="mb-2">
            <div className="px-1 mb-1 text-[11px] font-bold uppercase tracking-wide text-[#b5bac1]">
              Frequently Used
            </div>
            <div className="grid grid-cols-9 gap-0.5">
              {frequentEmojis.map((entry) => (
                <button
                  key={entry.emojiId ?? entry.emoji}
                  type="button"
                  onClick={() => {
                    if (entry.emojiId) {
                      onSelect({ emoji: entry.emoji, emojiId: entry.emojiId, fileUrl: entry.fileUrl });
                    } else {
                      onSelect({ emoji: entry.emoji });
                    }
                  }}
                  className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-[#36373d] active:bg-[#3f4147] transition-colors duration-100"
                  title={entry.emoji}
                >
                  {entry.fileUrl ? (
                    <img src={publicAssetUrl(entry.fileUrl)} alt={entry.emoji} className="w-6 h-6 object-contain" loading="lazy" />
                  ) : (
                    <span className="text-[22px] leading-none">{entry.emoji}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Server emoji groups */}
        {hubEmojiGroups.map(({ hub, emojis }) => (
          <div key={hub.id} className="mb-2">
            <div className="px-1 mb-1 text-[11px] font-bold uppercase tracking-wide text-[#b5bac1]">
              {hub.name}
            </div>
            <div className="grid grid-cols-9 gap-0.5">
              {emojis.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => handleSelectCustom(e)}
                  className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-[#36373d] active:bg-[#3f4147] transition-colors duration-100 group/emoji"
                  title={`:${e.name}:`}
                >
                  <img
                    src={publicAssetUrl(e.file_url)}
                    alt={e.name}
                    className="w-6 h-6 object-contain group-hover/emoji:scale-110 transition-transform duration-100"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Unicode categories */}
        {filteredUnicode.map((cat) => (
          <div key={cat.label} className="mb-2">
            <div className="px-1 mb-1 text-[11px] font-bold uppercase tracking-wide text-[#b5bac1]">
              {cat.label}
            </div>
            <div className="grid grid-cols-9 gap-0.5">
              {cat.emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSelectUnicode(emoji)}
                  className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-[#36373d] active:bg-[#3f4147] transition-colors duration-100"
                >
                  <span className="text-[22px] leading-none">{emoji}</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        {q && hubEmojiGroups.length === 0 && filteredUnicode.length === 0 && (
          <div className="text-center text-[#b5bac1] text-sm py-8">No emoji found</div>
        )}
      </div>
    </div>
  );
}
