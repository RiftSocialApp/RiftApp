import { useState, useEffect, useCallback, useRef } from 'react';
import { useMediaPickerStore } from '../../stores/mediaPickerStore';

const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ'; // Public Google Tenor API key
const TENOR_BASE = 'https://tenor.googleapis.com/v2';
const DEBOUNCE_MS = 350;
const PAGE_SIZE = 30;

interface TenorGif {
  id: string;
  url: string;       // Full-size GIF URL
  previewUrl: string; // Smaller preview (tinygif)
  width: number;
  height: number;
}

interface TenorMediaFormat {
  url: string;
  dims: [number, number];
}

interface TenorResult {
  id: string;
  media_formats: Record<string, TenorMediaFormat>;
}

function parseTenorResults(results: TenorResult[]): TenorGif[] {
  return results.map((r) => {
    const gif = r.media_formats.gif ?? r.media_formats.mediumgif ?? r.media_formats.tinygif;
    const preview = r.media_formats.tinygif ?? r.media_formats.nanogif ?? gif;
    return {
      id: r.id,
      url: gif?.url ?? '',
      previewUrl: preview?.url ?? '',
      width: preview?.dims?.[0] ?? 200,
      height: preview?.dims?.[1] ?? 200,
    };
  }).filter((g) => g.url);
}

export default function GifTab({ onSelect }: { onSelect: (url: string, previewUrl: string, width: number, height: number) => void }) {
  const searchQuery = useMediaPickerStore((s) => s.searchQuery);
  const setSearchQuery = useMediaPickerStore((s) => s.setSearchQuery);
  const gifFavourites = useMediaPickerStore((s) => s.gifFavourites);
  const addGifFavourite = useMediaPickerStore((s) => s.addGifFavourite);
  const removeGifFavourite = useMediaPickerStore((s) => s.removeGifFavourite);
  const isGifFavourited = useMediaPickerStore((s) => s.isGifFavourited);

  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextPos, setNextPos] = useState<string | null>(null);
  const [showFavSection, setShowFavSection] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number>();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadGifs = useCallback(async (query: string, append = false) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const params: Record<string, string> = {
        limit: String(PAGE_SIZE),
        media_filter: 'gif,tinygif,nanogif',
      };
      if (append && nextPos) params.pos = nextPos;

      const endpoint = query.trim() ? 'search' : 'featured';
      if (query.trim()) params.q = query.trim();

      const qs = new URLSearchParams({ key: TENOR_API_KEY, client_key: 'riftapp', ...params });
      const res = await fetch(`${TENOR_BASE}/${endpoint}?${qs}`, { signal: controller.signal });
      if (!res.ok) return;
      const data = await res.json();
      const parsed = parseTenorResults(data.results ?? []);
      setGifs((prev) => append ? [...prev, ...parsed] : parsed);
      setNextPos(data.next ?? null);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setGifs((prev) => append ? prev : []);
      }
    } finally {
      setLoading(false);
    }
  }, [nextPos]);

  // Initial load - trending
  useEffect(() => {
    void loadGifs('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setGifs([]);
      setNextPos(null);
      void loadGifs(searchQuery);
    }, DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || loading || !nextPos) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
      void loadGifs(searchQuery, true);
    }
  }, [loading, nextPos, searchQuery, loadGifs]);

  const handleFavToggle = useCallback((gif: TenorGif, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isGifFavourited(gif.url)) {
      removeGifFavourite(gif.url);
    } else {
      addGifFavourite({ url: gif.url, previewUrl: gif.previewUrl, width: gif.width, height: gif.height });
    }
  }, [isGifFavourited, removeGifFavourite, addGifFavourite]);

  const showFavourites = !searchQuery.trim() && gifFavourites.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b5bac1] pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Tenor"
            className="w-full pl-9 pr-3 py-2 bg-[#1e1f22] border border-[#3f4147]/60 rounded-md text-sm text-[#dbdee1] placeholder:text-[#72767d] focus:outline-none focus:border-[#5865f2]/50"
          />
        </div>
      </div>

      {/* Content */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin">
        {/* Favourites section */}
        {showFavourites && (
          <div className="mb-3">
            <button
              onClick={() => setShowFavSection((v) => !v)}
              className="flex items-center gap-1.5 px-1 mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#b5bac1] hover:text-[#dbdee1] transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className={`transition-transform ${showFavSection ? '' : '-rotate-90'}`}>
                <path d="M7 10l5 5 5-5z" />
              </svg>
              Favourites
            </button>
            {showFavSection && (
              <div className="grid grid-cols-3 gap-1">
                {gifFavourites.map((fav) => (
                  <GifCell
                    key={fav.url}
                    gif={{ id: fav.url, url: fav.url, previewUrl: fav.previewUrl, width: fav.width, height: fav.height }}
                    isFav
                    onSelect={onSelect}
                    onFavToggle={handleFavToggle}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Trending / Search results */}
        {!searchQuery.trim() && (
          <div className="px-1 mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#b5bac1]">
            Trending GIFs
          </div>
        )}
        <div className="grid grid-cols-3 gap-1">
          {gifs.map((gif) => (
            <GifCell
              key={gif.id}
              gif={gif}
              isFav={isGifFavourited(gif.url)}
              onSelect={onSelect}
              onFavToggle={handleFavToggle}
            />
          ))}
        </div>
        {loading && (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-[#5865f2] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!loading && gifs.length === 0 && searchQuery.trim() && (
          <div className="text-center text-[#b5bac1] text-sm py-8">No GIFs found</div>
        )}
      </div>
    </div>
  );
}

function GifCell({
  gif,
  isFav,
  onSelect,
  onFavToggle,
}: {
  gif: TenorGif;
  isFav: boolean;
  onSelect: (url: string, previewUrl: string, width: number, height: number) => void;
  onFavToggle: (gif: TenorGif, e: React.MouseEvent) => void;
}) {
  return (
    <div
      className="relative group cursor-pointer rounded-md overflow-hidden bg-[#2b2d31] aspect-square"
      onClick={() => onSelect(gif.url, gif.previewUrl, gif.width, gif.height)}
    >
      <img
        src={gif.previewUrl}
        alt=""
        loading="lazy"
        className="w-full h-full object-cover"
      />
      {/* Favourite star overlay */}
      <button
        onClick={(e) => onFavToggle(gif, e)}
        className={`absolute top-1 right-1 w-7 h-7 rounded-full flex items-center justify-center transition-all
          ${isFav ? 'bg-[#5865f2] text-white opacity-100' : 'bg-black/50 text-white/70 opacity-0 group-hover:opacity-100 hover:text-white'}
        `}
        title={isFav ? 'Remove from Favourites' : 'Add to Favourites'}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      </button>
    </div>
  );
}
