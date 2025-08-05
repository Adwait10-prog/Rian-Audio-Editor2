import React, { useRef, useEffect } from 'react';
import { useTimelineGrid } from './useTimelineGrid';
import { formatTime } from './formatTime';

interface TimelineRulerProps {
  zoom: number;
  duration: number;
  scrollLeft: number;
  width: number;
  currentTime: number;
  onSnap?: (time: number) => void;
}

export default function TimelineRuler({ zoom, duration, scrollLeft, width, currentTime, onSnap }: TimelineRulerProps) {
  const grid = useTimelineGrid(zoom, duration);
  const rulerRef = useRef<HTMLDivElement>(null);

  // Snap to nearest major tick on click
  const handleRulerClick = (e: React.MouseEvent) => {
    if (!onSnap || !rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollLeft;
    // Find nearest major tick
    let minDist = Infinity;
    let snapTime = 0;
    for (const line of grid) {
      if (line.major) {
        const dist = Math.abs(line.px - x);
        if (dist < minDist) {
          minDist = dist;
          snapTime = line.time;
        }
      }
    }
    onSnap(snapTime);
  };

  return (
    <div
      ref={rulerRef}
      className="relative w-full select-none border-b border-[var(--rian-border)] bg-[var(--rian-surface)]"
      style={{ height: 32, overflow: 'hidden', width }}
      onClick={handleRulerClick}
    >
      {/* Grid lines */}
      {grid.map(line => (
        <div
          key={line.px}
          className={line.major ? 'absolute border-l border-blue-500' : 'absolute border-l border-gray-300'}
          style={{ left: line.px - scrollLeft, top: 0, height: line.major ? '100%' : '60%', zIndex: line.major ? 2 : 1 }}
        >
          {line.major && (
            <span
              className="absolute text-xs text-blue-700 font-mono"
              style={{ top: 18, left: 2 }}
            >
              {formatTime(line.time)}
            </span>
          )}
        </div>
      ))}
      {/* Highlighted now marker */}
      <div
        className="absolute bg-yellow-400"
        style={{
          left: (currentTime * zoom) - scrollLeft,
          top: 0,
          width: 2,
          height: '100%',
          zIndex: 10,
          borderRadius: 1,
          boxShadow: '0 0 4px 2px #facc15',
        }}
      />
    </div>
  );
}
