import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useTimelineGrid } from './useTimelineGrid';
import { formatTime } from './formatTime';

interface TimelineRulerProps {
  zoom: number;
  duration: number;
  scrollLeft: number;
  width: number;
  currentTime: number;
  onSnap?: (time: number) => void;
  onSeek?: (time: number) => void;
}

export default function TimelineRuler({ zoom, duration, scrollLeft, width, currentTime, onSnap, onSeek }: TimelineRulerProps) {
  const grid = useTimelineGrid(zoom, duration);
  const rulerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [smoothTime, setSmoothTime] = useState(currentTime);

  console.log(`📏 [Timeline Ruler] Rendering - Time: ${currentTime.toFixed(2)}s, Zoom: ${zoom}px/sec, Scroll: ${scrollLeft}px`);

  // Listen for smooth playhead updates for DaVinci-style movement
  useEffect(() => {
    const handleSmoothUpdate = (e: CustomEvent) => {
      const { currentTime: newTime } = e.detail;
      setSmoothTime(newTime);
    };

    window.addEventListener('playhead-smooth-update', handleSmoothUpdate as EventListener);
    return () => window.removeEventListener('playhead-smooth-update', handleSmoothUpdate as EventListener);
  }, []);

  // Also update smooth time when currentTime changes (for seeking)
  useEffect(() => {
    setSmoothTime(currentTime);
  }, [currentTime]);

  // Convert time to pixel position
  const timeToPixel = useCallback((time: number) => {
    const pixel = time * zoom;
    console.log(`🔄 [Timeline Ruler] Time ${time.toFixed(2)}s → ${pixel}px (zoom: ${zoom})`);
    return pixel;
  }, [zoom]);

  // Convert pixel position to time
  const pixelToTime = useCallback((pixel: number) => {
    const time = (pixel + scrollLeft) / zoom;
    console.log(`🔄 [Timeline Ruler] Pixel ${pixel}px (+ scroll ${scrollLeft}) → Time ${time.toFixed(2)}s`);
    return Math.max(0, Math.min(time, duration));
  }, [zoom, scrollLeft, duration]);

  // Handle ruler click and drag
  const handleMouseEvent = useCallback((e: React.MouseEvent, isDrag = false) => {
    if (!rulerRef.current) return;
    
    const rect = rulerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickTime = pixelToTime(x);
    
    console.log(`🖱️ [Timeline Ruler] ${isDrag ? 'Drag' : 'Click'} at ${x}px → ${clickTime.toFixed(2)}s`);
    
    if (isDrag && isDraggingRef.current) {
      onSeek?.(clickTime);
    } else if (!isDrag) {
      // Find nearest major tick for snapping
      let minDist = Infinity;
      let snapTime = clickTime;
      
      for (const line of grid) {
        if (line.major) {
          const dist = Math.abs(line.time - clickTime);
          if (dist < minDist && dist < 1.0) { // Snap within 1 second
            minDist = dist;
            snapTime = line.time;
          }
        }
      }
      
      console.log(`🧲 [Timeline Ruler] Snapping ${clickTime.toFixed(2)}s → ${snapTime.toFixed(2)}s (dist: ${minDist.toFixed(2)}s)`);
      
      if (onSnap) {
        onSnap(snapTime);
      } else {
        onSeek?.(snapTime);
      }
    }
  }, [grid, pixelToTime, onSnap, onSeek]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    handleMouseEvent(e, false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingRef.current) {
      handleMouseEvent(e, true);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDraggingRef.current = false;
    };
    
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Calculate playhead position using smooth time for DaVinci-style movement
  const playheadLeft = timeToPixel(smoothTime); // No scroll offset needed since ruler content moves
  
  return (
    <div className="w-full border-b border-[var(--rian-border)] bg-[var(--rian-surface)] z-20" style={{ height: 40, overflow: 'hidden' }}>
      <div
        ref={rulerRef}
        className="relative select-none cursor-crosshair"
        style={{ height: 40, width, marginLeft: -scrollLeft }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
      {/* Background grid */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-800 to-gray-750" />
      
      {/* Grid lines and labels */}
      {grid.map((line, index) => {
        const lineLeft = line.px; // No scroll offset needed since ruler content moves with marginLeft
        
        // Only render visible lines relative to scroll position
        if (lineLeft < scrollLeft - 50 || lineLeft > scrollLeft + width + 50) return null;
        
        return (
          <div
            key={`${line.time}-${line.px}-${index}`}
            className={line.major ? 'absolute border-l-2 border-blue-400' : 'absolute border-l border-gray-500 opacity-60'}
            style={{ 
              left: lineLeft, 
              top: 0, 
              height: line.major ? '100%' : '50%', 
              zIndex: line.major ? 3 : 2 
            }}
          >
            {line.major && (
              <div className="absolute bg-gray-800 px-1 rounded text-xs text-blue-300 font-mono border border-gray-600"
                   style={{ top: 22, left: 4, fontSize: '10px' }}>
                {formatTime(line.time)}
              </div>
            )}
          </div>
        );
      })}
      
      {/* Current time display using smooth time */}
      <div className="absolute top-1 right-2 bg-gray-900 px-2 py-1 rounded text-xs font-mono text-yellow-300 border border-gray-600">
        {formatTime(smoothTime)} / {formatTime(duration)}
      </div>
      
      {/* Ruler playhead handle only - no line (line comes from timeline below) */}
      <div
        className="absolute pointer-events-none z-30"
        style={{
          left: playheadLeft,
          top: 0,
          width: 0, // No width - just the handle and triangle
          height: '100%',
        }}
      >
        {/* DaVinci Resolve-style playhead handle at ruler top */}
        <div
          className="absolute cursor-grab"
          style={{
            left: -12,
            top: 0,
            width: 24,
            height: 6,
            transform: 'translateZ(0)', // GPU acceleration
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
            borderRadius: '3px 3px 0 0',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: `
              0 2px 8px rgba(0, 0, 0, 0.4),
              inset 0 1px 0 rgba(255, 255, 255, 0.2)
            `,
          }}
        />
        {/* Professional playhead triangle pointer */}
        <div
          className="absolute"
          style={{
            left: -6,
            top: 6,
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid #dc2626',
            filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))',
          }}
        />
      </div>
      
      {/* Debug info overlay */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-0 left-2 text-xs text-gray-400 font-mono bg-black bg-opacity-50 px-1 rounded">
          Z:{zoom} S:{scrollLeft.toFixed(0)} T:{smoothTime.toFixed(2)} P:{playheadLeft.toFixed(0)}
        </div>
      )}
      </div>
    </div>
  );
}
