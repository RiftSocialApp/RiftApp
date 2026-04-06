import { useState, useEffect } from 'react';

const isTauri = '__TAURI_INTERNALS__' in window;

function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!isTauri) return;
    let cancelled = false;
    const check = async () => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const win = getCurrentWindow();
      const m = await win.isMaximized();
      if (!cancelled) setMaximized(m);

      const unlisten = await win.onResized(async () => {
        const m2 = await win.isMaximized();
        if (!cancelled) setMaximized(m2);
      });
      return unlisten;
    };
    const p = check();
    return () => {
      cancelled = true;
      p.then((u) => u?.());
    };
  }, []);

  if (!isTauri) return null;

  const handleMinimize = async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    getCurrentWindow().minimize();
  };

  const handleToggleMaximize = async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    getCurrentWindow().toggleMaximize();
  };

  const handleClose = async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    getCurrentWindow().close();
  };

  return (
    <div
      data-tauri-drag-region
      className="h-8 bg-riftapp-bg flex items-center justify-between select-none shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Left: app title */}
      <div className="flex items-center pl-3 gap-2 pointer-events-none">
        <span className="text-xs font-semibold text-riftapp-text-muted tracking-wide">Rift</span>
      </div>

      {/* Right: window controls */}
      <div className="flex h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {/* Minimize */}
        <button
          onClick={handleMinimize}
          className="w-11 h-full flex items-center justify-center text-riftapp-text-muted hover:bg-riftapp-surface transition-colors"
          aria-label="Minimize"
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
            <rect width="10" height="1" />
          </svg>
        </button>

        {/* Maximize / Restore */}
        <button
          onClick={handleToggleMaximize}
          className="w-11 h-full flex items-center justify-center text-riftapp-text-muted hover:bg-riftapp-surface transition-colors"
          aria-label={maximized ? 'Restore' : 'Maximize'}
        >
          {maximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="2" y="0" width="8" height="8" rx="0.5" />
              <rect x="0" y="2" width="8" height="8" rx="0.5" fill="#0f1117" />
              <rect x="0" y="2" width="8" height="8" rx="0.5" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="0.5" y="0.5" width="9" height="9" rx="0.5" />
            </svg>
          )}
        </button>

        {/* Close */}
        <button
          onClick={handleClose}
          className="w-11 h-full flex items-center justify-center text-riftapp-text-muted hover:bg-red-600 hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
            <line x1="0" y1="0" x2="10" y2="10" />
            <line x1="10" y1="0" x2="0" y2="10" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default TitleBar;
