import { useMemo } from 'react';

export interface TimelineGridLine {
  time: number;
  px: number;
  major: boolean;
}

export function useTimelineGrid(zoom: number, duration: number) {
  return useMemo(() => {
    const lines: TimelineGridLine[] = [];
    let majorInterval = 60, minorInterval = 10;
    
    // Better zoom level handling to prevent disappearing timeline
    if (zoom >= 1000) {
      majorInterval = 1; minorInterval = 0.1;
    } else if (zoom >= 500) {
      majorInterval = 2; minorInterval = 0.25;
    } else if (zoom >= 200) {
      majorInterval = 5; minorInterval = 1;
    } else if (zoom >= 100) {
      majorInterval = 10; minorInterval = 2;
    } else if (zoom >= 50) {
      majorInterval = 15; minorInterval = 5;
    } else if (zoom >= 25) {
      majorInterval = 30; minorInterval = 10;
    } else {
      majorInterval = 60; minorInterval = 15;
    }
    
    // Ensure we always have markers even at very low zoom
    const minPixelDistance = 20; // Minimum pixels between markers
    const actualMinorInterval = Math.max(minorInterval, minPixelDistance / zoom);
    const actualMajorInterval = Math.max(majorInterval, actualMinorInterval * 4);
    
    for (let t = 0; t <= duration; t += actualMinorInterval) {
      lines.push({
        time: t,
        px: t * zoom,
        major: t % actualMajorInterval < actualMinorInterval / 2 // More flexible major detection
      });
    }
    return lines;
  }, [zoom, duration]);
}
