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
    if (zoom >= 1000) {
      majorInterval = 1; minorInterval = 0.2;
    } else if (zoom >= 500) {
      majorInterval = 2; minorInterval = 0.5;
    } else if (zoom >= 200) {
      majorInterval = 5; minorInterval = 1;
    } else if (zoom >= 100) {
      majorInterval = 10; minorInterval = 2;
    }
    for (let t = 0; t <= duration; t += minorInterval) {
      lines.push({
        time: t,
        px: t * zoom,
        major: t % majorInterval === 0
      });
    }
    return lines;
  }, [zoom, duration]);
}
