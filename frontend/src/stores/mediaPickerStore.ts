import { create } from 'zustand';

export type MediaTab = 'gifs' | 'stickers' | 'emojis';

interface GifFavourite {
  url: string;
  previewUrl: string;
  width: number;
  height: number;
}

interface EmojiUsageEntry {
  /** Unicode char or `:name:` for custom. */
  emoji: string;
  emojiId?: string;
  fileUrl?: string;
  hubId?: string;
  count: number;
  lastUsed: number;
}

const GIF_FAV_KEY = 'riftapp:gif-favourites';
const EMOJI_USAGE_KEY = 'riftapp:emoji-usage';
const MAX_FREQUENT_EMOJIS = 30;

function loadGifFavourites(): GifFavourite[] {
  try {
    const raw = localStorage.getItem(GIF_FAV_KEY);
    if (raw) return JSON.parse(raw) as GifFavourite[];
  } catch { /* ignore */ }
  return [];
}

function saveGifFavourites(favs: GifFavourite[]) {
  try {
    localStorage.setItem(GIF_FAV_KEY, JSON.stringify(favs));
  } catch { /* ignore */ }
}

function loadEmojiUsage(): EmojiUsageEntry[] {
  try {
    const raw = localStorage.getItem(EMOJI_USAGE_KEY);
    if (raw) return JSON.parse(raw) as EmojiUsageEntry[];
  } catch { /* ignore */ }
  return [];
}

function saveEmojiUsage(entries: EmojiUsageEntry[]) {
  try {
    localStorage.setItem(EMOJI_USAGE_KEY, JSON.stringify(entries));
  } catch { /* ignore */ }
}

interface MediaPickerState {
  isOpen: boolean;
  activeTab: MediaTab;
  searchQuery: string;

  /** GIF favourites (persisted in localStorage). */
  gifFavourites: GifFavourite[];
  /** Emoji usage tracking (persisted in localStorage). */
  emojiUsage: EmojiUsageEntry[];

  open: (tab?: MediaTab) => void;
  close: () => void;
  toggle: (tab?: MediaTab) => void;
  setActiveTab: (tab: MediaTab) => void;
  setSearchQuery: (query: string) => void;

  addGifFavourite: (gif: GifFavourite) => void;
  removeGifFavourite: (url: string) => void;
  isGifFavourited: (url: string) => boolean;

  trackEmojiUsage: (emoji: string, emojiId?: string, fileUrl?: string, hubId?: string) => void;
  getFrequentEmojis: () => EmojiUsageEntry[];
}

export const useMediaPickerStore = create<MediaPickerState>((set, get) => ({
  isOpen: false,
  activeTab: 'gifs',
  searchQuery: '',
  gifFavourites: loadGifFavourites(),
  emojiUsage: loadEmojiUsage(),

  open: (tab) => set({ isOpen: true, activeTab: tab ?? get().activeTab, searchQuery: '' }),
  close: () => set({ isOpen: false, searchQuery: '' }),
  toggle: (tab) => {
    const s = get();
    if (s.isOpen && (!tab || s.activeTab === tab)) {
      set({ isOpen: false, searchQuery: '' });
    } else {
      set({ isOpen: true, activeTab: tab ?? s.activeTab, searchQuery: '' });
    }
  },
  setActiveTab: (tab) => set({ activeTab: tab, searchQuery: '' }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  addGifFavourite: (gif) => {
    const favs = get().gifFavourites;
    if (favs.some((f) => f.url === gif.url)) return;
    const next = [gif, ...favs];
    saveGifFavourites(next);
    set({ gifFavourites: next });
  },

  removeGifFavourite: (url) => {
    const next = get().gifFavourites.filter((f) => f.url !== url);
    saveGifFavourites(next);
    set({ gifFavourites: next });
  },

  isGifFavourited: (url) => get().gifFavourites.some((f) => f.url === url),

  trackEmojiUsage: (emoji, emojiId, fileUrl, hubId) => {
    const entries = [...get().emojiUsage];
    const key = emojiId ?? emoji;
    const idx = entries.findIndex((e) => (e.emojiId ?? e.emoji) === key);
    if (idx >= 0) {
      entries[idx] = { ...entries[idx], count: entries[idx].count + 1, lastUsed: Date.now() };
    } else {
      entries.push({ emoji, emojiId, fileUrl, hubId, count: 1, lastUsed: Date.now() });
    }
    // Keep only top N by score
    entries.sort((a, b) => {
      const scoreA = a.count * 10 + a.lastUsed / 1e10;
      const scoreB = b.count * 10 + b.lastUsed / 1e10;
      return scoreB - scoreA;
    });
    const trimmed = entries.slice(0, MAX_FREQUENT_EMOJIS);
    saveEmojiUsage(trimmed);
    set({ emojiUsage: trimmed });
  },

  getFrequentEmojis: () => {
    const entries = get().emojiUsage;
    return [...entries].sort((a, b) => {
      const scoreA = a.count * 10 + a.lastUsed / 1e10;
      const scoreB = b.count * 10 + b.lastUsed / 1e10;
      return scoreB - scoreA;
    });
  },
}));
