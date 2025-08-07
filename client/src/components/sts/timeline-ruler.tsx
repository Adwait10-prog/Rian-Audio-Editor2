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
      className="relative w-full select-none border-b border-[var(--rian-border)] bg-gradient-to-b from-gray-800 to-gray-900"
      style={{ height: 40, overflow: 'hidden', width }}
      onClick={handleRulerClick}
    >
      {/* Background pattern for professional look */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-900/10 to-transparent" />
      
      {/* Grid lines */}
      {grid.map((line, index) => (
        <div
          key={`${line.px}-${index}`}
          className={line.major 
            ? 'absolute border-l border-blue-400 shadow-sm' 
            : 'absolute border-l border-gray-500 opacity-50'
          }
          style={{ 
            left: line.px - scrollLeft, 
            top: 0, 
            height: line.major ? '100%' : '50%', 
            zIndex: line.major ? 2 : 1,
            borderWidth: line.major ? '1px' : '0.5px'
          }}
        >
          {line.major && (
            <>
              <span
                className="absolute text-xs text-blue-300 font-mono font-medium bg-gray-800/80 px-1 rounded"
                style={{ 
                  top: 20, 
                  left: 3,
                  textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                }}
              >
                {formatTime(line.time)}
              </span>
              {/* Small tick mark at top */}
              <div 
                className="absolute w-3 h-1 bg-blue-400 rounded-b"
                style={{ top: 0, left: -1 }}
              />
            </>
          )}
        </div>
      ))}
      {/* Enhanced current time marker */}
      <div
        className="absolute bg-yellow-400 border-yellow-300"
        style={{
          left: (currentTime * zoom) - scrollLeft,
          top: 0,
          width: 3,
          height: '100%',
          zIndex: 10,
          borderRadius: '1px',
          boxShadow: '0 0 8px 2px rgba(250, 204, 21, 0.6), inset 0 0 2px rgba(255, 255, 255, 0.3)',
          background: 'linear-gradient(to bottom, #fbbf24, #f59e0b)'
        }}
      >
        {/* Arrow indicator at top */}
        <div 
          className="absolute w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-yellow-400"
          style={{ top: -4, left: -4 }}
        />
        {/* Time display tooltip */}
        <div 
          className="absolute bg-yellow-400 text-black text-xs font-mono px-1 py-0.5 rounded shadow-lg"
          style={{ 
            top: -25, 
            left: -20, 
            fontSize: '10px',
            whiteSpace: 'nowrap'
          }}
        >
          {formatTime(currentTime)}
        </div>
      </div>
    </div>
  );
}
