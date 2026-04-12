import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type MenuPlacement = {
  x: number;
  y: number;
  transformOrigin: string;
};

function clampMenuPosition(x: number, y: number, w: number, h: number): MenuPlacement {
  const m = 8;
  const spaceRight = window.innerWidth - x - m;
  const spaceLeft = x - m;
  const spaceBelow = window.innerHeight - y - m;
  const spaceAbove = y - m;

  const openLeft = spaceRight < w && spaceLeft > spaceRight;
  const openUp = spaceBelow < h && spaceAbove > spaceBelow;

  let nx = openLeft ? x - w : x;
  let ny = openUp ? y - h : y;

  nx = Math.min(nx, window.innerWidth - w - m);
  ny = Math.min(ny, window.innerHeight - h - m);
  nx = Math.max(m, nx);
  ny = Math.max(m, ny);

  return {
    x: nx,
    y: ny,
    transformOrigin: `${openLeft ? 'right' : 'left'} ${openUp ? 'bottom' : 'top'}`,
  };
}

export function MenuOverlay({
  x,
  y,
  onClose,
  zIndex = 240,
  children,
}: {
  x: number;
  y: number;
  onClose: () => void;
  zIndex?: number;
  children: ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<MenuPlacement>({ x, y, transformOrigin: 'left top' });

  const reposition = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const next = clampMenuPosition(x, y, r.width, r.height);
    setPos((current) => (
      current.x === next.x
      && current.y === next.y
      && current.transformOrigin === next.transformOrigin
        ? current
        : next
    ));
  }, [x, y]);

  useLayoutEffect(() => {
    setPos({ x, y, transformOrigin: 'left top' });
  }, [x, y]);

  useLayoutEffect(() => {
    reposition();

    const el = wrapRef.current;
    if (!el) return;

    const handleViewportChange = () => {
      reposition();
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        reposition();
      });
      observer.observe(el);
    }

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
      observer?.disconnect();
    };
  }, [reposition]);

  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0"
      style={{ zIndex }}
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        ref={wrapRef}
        className="fixed w-max max-w-[calc(100vw-16px)] animate-scale-in"
        style={{ left: pos.x, top: pos.y, zIndex: zIndex + 1, transformOrigin: pos.transformOrigin }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function menuDivider() {
  return <div className="rift-context-menu-divider" />;
}
