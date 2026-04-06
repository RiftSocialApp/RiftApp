import { useState, useEffect, useMemo } from 'react';
import { useHubStore } from '../../stores/hubStore';
import { useMediaPickerStore } from '../../stores/mediaPickerStore';
import { api } from '../../api/client';
import { publicAssetUrl } from '../../utils/publicAssetUrl';
import type { HubSticker } from '../../types';

/** Local cache so we don't re-fetch on every tab switch. */
const stickerCache: Record<string, HubSticker[]> = {};

export default function StickerTab({ onSelect }: { onSelect: (sticker: HubSticker) => void }) {
  const searchQuery = useMediaPickerStore((s) => s.searchQuery);
  const setSearchQuery = useMediaPickerStore((s) => s.setSearchQuery);
  const hubs = useHubStore((s) => s.hubs);

  const [hubStickers, setHubStickers] = useState<Record<string, HubSticker[]>>({});
  const [loading, setLoading] = useState(true);

  // Load stickers for all hubs the user is in
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      const result: Record<string, HubSticker[]> = {};
      await Promise.all(
        hubs.map(async (hub) => {
          if (stickerCache[hub.id]) {
            result[hub.id] = stickerCache[hub.id];
            return;
          }
          try {
            const stickers = await api.getHubStickers(hub.id);
            stickerCache[hub.id] = stickers;
            result[hub.id] = stickers;
          } catch {
            result[hub.id] = [];
          }
        }),
      );
      if (!cancelled) {
        setHubStickers(result);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [hubs]);

  const filteredHubs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return hubs
      .map((hub) => {
        const stickers = hubStickers[hub.id] ?? [];
        const filtered = q ? stickers.filter((s) => s.name.toLowerCase().includes(q)) : stickers;
        return { hub, stickers: filtered };
      })
      .filter((entry) => entry.stickers.length > 0);
  }, [hubs, hubStickers, searchQuery]);

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
            placeholder="Find the perfect sticker"
            className="w-full pl-9 pr-3 py-2 bg-[#1e1f22] border border-[#3f4147]/60 rounded-md text-sm text-[#dbdee1] placeholder:text-[#72767d] focus:outline-none focus:border-[#5865f2]/50"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#5865f2] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && filteredHubs.length === 0 && (
          <div className="text-center text-[#b5bac1] text-sm py-8">
            {searchQuery.trim() ? 'No stickers found' : 'No stickers available'}
          </div>
        )}

        {!loading && filteredHubs.map(({ hub, stickers }) => (
          <div key={hub.id} className="mb-3">
            <div className="px-1 mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#b5bac1]">
              {hub.name}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {stickers.map((sticker) => (
                <button
                  key={sticker.id}
                  onClick={() => onSelect(sticker)}
                  className="aspect-square rounded-lg bg-[#2b2d31] hover:bg-[#36373d] p-2 flex items-center justify-center transition-colors group"
                  title={sticker.name}
                >
                  <img
                    src={publicAssetUrl(sticker.file_url)}
                    alt={sticker.name}
                    loading="lazy"
                    className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-150"
                  />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
