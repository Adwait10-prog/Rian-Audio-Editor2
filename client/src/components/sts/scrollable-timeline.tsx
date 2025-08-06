import React, { useRef, useEffect, useCallback, useState } from 'react';
import { logger } from '@/lib/debug-logger';

interface ScrollableTimelineProps {
  children: React.ReactNode;
  zoom: number;
  currentTime: number;
  duration: number;
  scrollLeft: number;
  onScrollChange: (scrollLeft: number) => void;
  onTimelineClick: (time: number) => void;
  className?: string;
}

export default function ScrollableTimeline({
  children,
  zoom,
  currentTime,
  duration,
  scrollLeft,
  onScrollChange,
  onTimelineClick,
  className = ''
}: ScrollableTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [smoothTime, setSmoothTime] = useState(currentTime);

  // Calculate timeline width based on duration and zoom
  const timelineWidth = Math.max(duration * zoom, 1000);

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

  // Calculate global playhead position
  const globalPlayheadPosition = smoothTime * zoom;

  logger.trace('Scrollable Timeline', 'Rendering', { 
    zoom, 
    currentTime, 
    duration, 
    scrollLeft, 
    timelineWidth 
  });

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (!containerRef.current || isDragging) return;
    
    const newScrollLeft = containerRef.current.scrollLeft;
    if (newScrollLeft !== scrollLeft) {
      logger.trace('Scrollable Timeline', 'Scroll changed', { 
        from: scrollLeft, 
        to: newScrollLeft 
      });
      onScrollChange(newScrollLeft);
    }
  }, [scrollLeft, onScrollChange, isDragging]);

  // Handle mouse wheel with Ctrl/Cmd for zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const mouseX = e.clientX - rect.left;
      const focusTime = (mouseX + scrollLeft) / zoom;
      
      logger.trace('Scrollable Timeline', 'Zoom wheel event', { 
        mouseX, 
        focusTime, 
        deltaY: e.deltaY 
      });
      
      // Emit zoom event for parent to handle
      window.dispatchEvent(new CustomEvent('timeline-zoom-request', {
        detail: { 
          direction: e.deltaY > 0 ? 'out' : 'in',
          focusTime,
          mouseX
        }
      }));
    }
  }, [zoom, scrollLeft]);

  // Handle timeline clicks
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollLeft;
    const clickTime = Math.max(0, Math.min(x / zoom, duration));
    
    logger.timelineEvent('Scrollable Timeline', `Click at ${clickTime.toFixed(3)}s`);
    onTimelineClick(clickTime);
  }, [zoom, scrollLeft, duration, onTimelineClick]);

  // Handle drag scrolling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left mouse button
    
    setIsDragging(true);
    const startX = e.clientX;
    const startScrollLeft = scrollLeft;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newScrollLeft = Math.max(0, startScrollLeft - deltaX);
      
      if (containerRef.current) {
        containerRef.current.scrollLeft = newScrollLeft;
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [scrollLeft]);

  // Sync external scroll changes
  useEffect(() => {
    if (!containerRef.current || isDragging) return;
    
    if (Math.abs(containerRef.current.scrollLeft - scrollLeft) > 1) {
      logger.trace('Scrollable Timeline', 'Syncing scroll position', { 
        current: containerRef.current.scrollLeft, 
        target: scrollLeft 
      });
      containerRef.current.scrollLeft = scrollLeft;
    }
  }, [scrollLeft, isDragging]);

  // Auto-scroll to follow playhead
  const autoScrollToPlayhead = useCallback(() => {
    if (!containerRef.current) return;
    
    const playheadPosition = currentTime * zoom;
    const containerWidth = containerRef.current.clientWidth;
    const currentScroll = containerRef.current.scrollLeft;
    
    // Check if playhead is outside visible area
    if (playheadPosition < currentScroll + 50) {
      // Playhead is too far left, scroll left
      const newScroll = Math.max(0, playheadPosition - 100);
      containerRef.current.scrollLeft = newScroll;
      onScrollChange(newScroll);
    } else if (playheadPosition > currentScroll + containerWidth - 50) {
      // Playhead is too far right, scroll right
      const newScroll = playheadPosition - containerWidth + 100;
      containerRef.current.scrollLeft = newScroll;
      onScrollChange(newScroll);
    }
  }, [currentTime, zoom, onScrollChange]);

  // Track container width changes
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;
      
      switch (e.key) {
        case 'Home':
          e.preventDefault();
          containerRef.current.scrollLeft = 0;
          onScrollChange(0);
          onTimelineClick(0);
          break;
        case 'End':
          e.preventDefault();
          const maxScroll = timelineWidth - containerWidth;
          containerRef.current.scrollLeft = maxScroll;
          onScrollChange(maxScroll);
          onTimelineClick(duration);
          break;
        case 'ArrowLeft':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const newTime = Math.max(0, currentTime - 1);
            onTimelineClick(newTime);
          }
          break;
        case 'ArrowRight':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const newTime = Math.min(duration, currentTime + 1);
            onTimelineClick(newTime);
          }
          break;
        case ' ':
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('timeline-play-pause'));
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, duration, timelineWidth, containerWidth, onTimelineClick, onScrollChange]);

  return (
    <div className="relative flex-1 bg-[var(--rian-surface)] border border-[var(--rian-border)] rounded-lg overflow-hidden">
      {/* Timeline container */}
      <div
        ref={containerRef}
        className={`w-full h-full overflow-x-auto overflow-y-auto cursor-grab ${isDragging ? 'cursor-grabbing' : ''} ${className}`}
        style={{ 
          scrollBehavior: isDragging ? 'auto' : 'smooth',
        }}
        onScroll={handleScroll}
        onWheel={handleWheel}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        tabIndex={0} // Make focusable for keyboard events
      >
        {/* Timeline content with proper width */}
        <div 
          style={{ 
            width: timelineWidth,
            minHeight: '100%',
            position: 'relative'
          }}
        >
          {children}
          
          {/* Unified playhead line extending UP into ruler area and down through tracks */}
          <div
            className="absolute bg-red-500 pointer-events-none z-40"
            style={{
              left: globalPlayheadPosition, // No scroll offset since this content scrolls
              top: -40, // Extend UP into ruler area (40px ruler height)
              width: 3,
              height: 'calc(100% + 40px)', // Extend from ruler through all tracks
              transform: 'translateZ(0)', // GPU acceleration
              willChange: 'left',
              boxShadow: `
                0 0 8px 2px rgba(239, 68, 68, 0.6),
                0 0 4px 1px rgba(255, 255, 255, 0.3)
              `,
              background: 'linear-gradient(to bottom, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
              borderRadius: '1px',
            }}
          />
        </div>
      </div>
      
      {/* Scroll indicators */}
      <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 rounded px-2 py-1 text-xs text-gray-300 pointer-events-none">
        {Math.round((scrollLeft / Math.max(timelineWidth - containerWidth, 1)) * 100)}%
      </div>
      
      {/* Auto-scroll button */}
      <button
        onClick={autoScrollToPlayhead}
        className="absolute top-2 right-2 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition-colors"
        title="Follow Playhead"
      >
        📍
      </button>
      
      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 left-2 bg-black bg-opacity-50 rounded px-2 py-1 text-xs text-gray-400 pointer-events-none">
          Timeline: {timelineWidth}px | Scroll: {scrollLeft}px | Time: {currentTime.toFixed(1)}s
        </div>
      )}
    </div>
  );
}