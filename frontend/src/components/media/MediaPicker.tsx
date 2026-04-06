import { useEffect, useRef, useCallback } from 'react';
import { useMediaPickerStore, type MediaTab } from '../../stores/mediaPickerStore';
import GifTab from './GifTab';
import StickerTab from './StickerTab';
import EmojiTab, { type EmojiSelection } from './EmojiTab';
import type { HubSticker } from '../../types';

const TABS: { key: MediaTab; label: string }[] = [
  { key: 'gifs', label: 'GIFs' },
  { key: 'stickers', label: 'Stickers' },
  { key: 'emojis', label: 'Emoji' },
];

interface MediaPickerProps {
  onEmojiSelect: (selection: EmojiSelection) => void;
  onGifSelect: (url: string) => void;
  onStickerSelect: (sticker: HubSticker) => void;
}

export default function MediaPicker({ onEmojiSelect, onGifSelect, onStickerSelect }: MediaPickerProps) {
  const isOpen = useMediaPickerStore((s) => s.isOpen);
  const activeTab = useMediaPickerStore((s) => s.activeTab);
  const setActiveTab = useMediaPickerStore((s) => s.setActiveTab);
  const close = useMediaPickerStore((s) => s.close);
  const trackEmojiUsage = useMediaPickerStore((s) => s.trackEmojiUsage);

  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        // Don't close if clicking on the media buttons in the input bar
        const target = e.target as HTMLElement;
        if (target.closest('[data-media-btn]')) return;
        close();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, close]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, close]);

  const handleEmojiSelect = useCallback((sel: EmojiSelection) => {
    trackEmojiUsage(sel.emoji, sel.emojiId, sel.fileUrl);
    onEmojiSelect(sel);
    close();
  }, [onEmojiSelect, close, trackEmojiUsage]);

  const handleGifSelect = useCallback((url: string) => {
    onGifSelect(url);
    close();
  }, [onGifSelect, close]);

  const handleStickerSelect = useCallback((sticker: HubSticker) => {
    onStickerSelect(sticker);
    close();
  }, [onStickerSelect, close]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute bottom-full right-0 mb-2 z-50 w-[420px] h-[410px] bg-[#2b2d31] border border-[#1e1f22] rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.45)] flex flex-col overflow-hidden animate-scale-in"
    >
      {/* Tab bar */}
      <div className="flex border-b border-[#1e1f22] px-2 bg-[#2b2d31] flex-shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-[13px] font-semibold transition-colors relative
              ${activeTab === tab.key
                ? 'text-[#dbdee1]'
                : 'text-[#949ba4] hover:text-[#dbdee1]'
              }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#5865f2] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content - keep all mounted but hidden to preserve state */}
      <div className="flex-1 min-h-0 relative">
        <div className={`absolute inset-0 ${activeTab === 'gifs' ? '' : 'hidden'}`}>
          <GifTab onSelect={handleGifSelect} />
        </div>
        <div className={`absolute inset-0 ${activeTab === 'stickers' ? '' : 'hidden'}`}>
          <StickerTab onSelect={handleStickerSelect} />
        </div>
        <div className={`absolute inset-0 ${activeTab === 'emojis' ? '' : 'hidden'}`}>
          <EmojiTab onSelect={handleEmojiSelect} />
        </div>
      </div>
    </div>
  );
}
