'use client';

import { useEffect, useRef, useState } from 'react';

export interface PresenceEntry {
  userId: number;
  userName: string;
  line: number;
  color: string;
}

interface PresenceOverlayProps {
  entries: PresenceEntry[];
}

const LINE_HEIGHT_PX = 21;
const TEXTAREA_PADDING_TOP = 10;

interface TextareaGeometry {
  top: number;    // offset from overlay container to textarea top edge
  left: number;   // offset from overlay container to textarea left edge
  height: number; // visible height of the textarea
  scrollTop: number;
}

const DEFAULT_GEO: TextareaGeometry = { top: 0, left: 0, height: 0, scrollTop: 0 };

export default function PresenceOverlay({ entries }: PresenceOverlayProps) {
  const [geo, setGeo] = useState<TextareaGeometry>(DEFAULT_GEO);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const textarea = document.querySelector(
      '.w-md-editor-text-input',
    ) as HTMLTextAreaElement | null;
    if (!textarea) return;

    const measure = () => {
      const container = containerRef.current;
      if (!container) return;
      const tr = textarea.getBoundingClientRect();
      const cr = container.getBoundingClientRect();
      setGeo({
        top: tr.top - cr.top,
        left: tr.left - cr.left,
        height: textarea.clientHeight,
        scrollTop: textarea.scrollTop,
      });
    };

    const onScroll = () =>
      setGeo((prev) => ({ ...prev, scrollTop: textarea.scrollTop }));

    // Double-rAF: let Framer Motion layout animations finish before measuring
    requestAnimationFrame(() => requestAnimationFrame(measure));

    textarea.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure, { passive: true });

    // Re-measure whenever the textarea or the overlay container resize
    const observer = new ResizeObserver(measure);
    observer.observe(textarea);

    return () => {
      textarea.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
      observer.disconnect();
    };
  }, []);

  // Also re-measure when entries change (e.g., sidebar opens and shifts layout)
  useEffect(() => {
    const container = containerRef.current;
    const textarea = document.querySelector(
      '.w-md-editor-text-input',
    ) as HTMLTextAreaElement | null;
    if (!container || !textarea) return;
    const tr = textarea.getBoundingClientRect();
    const cr = container.getBoundingClientRect();
    setGeo((prev) => ({
      ...prev,
      top: tr.top - cr.top,
      left: tr.left - cr.left,
      height: textarea.clientHeight,
    }));
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 50 }}
      aria-hidden="true"
    >
      {entries.map((entry) => {
        const y =
          geo.top +
          (entry.line - 1) * LINE_HEIGHT_PX +
          TEXTAREA_PADDING_TOP -
          geo.scrollTop;

        // Clamp to visible textarea bounds
        if (geo.height > 0 && (y < geo.top || y > geo.top + geo.height)) {
          return null;
        }

        return (
          <div
            key={entry.userId}
            className="absolute flex items-center"
            style={{ top: y, left: geo.left + 4 }}
          >
            <span
              className="text-[10px] font-[600] px-1.5 py-0.5 rounded-[6px] leading-none whitespace-nowrap text-white shadow-sm opacity-90"
              style={{ backgroundColor: entry.color }}
            >
              {entry.userName}
            </span>
          </div>
        );
      })}
    </div>
  );
}
