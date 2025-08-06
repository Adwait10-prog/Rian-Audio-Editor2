import { useState, useCallback, useRef, useEffect } from 'react';

export interface GlobalPlayheadState {
  currentTime: number;
  isPlaying: boolean;
  duration: number;
  zoom: number;
  scrollLeft: number;
}

export interface GlobalPlayheadActions {
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setDuration: (duration: number) => void;
  setZoom: (zoom: number) => void;
  setScrollLeft: (scrollLeft: number) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seekTo: (time: number) => void;
  syncToVideo: (videoElement: HTMLVideoElement | null) => void;
  syncToAudio: (audioElement: HTMLAudioElement | WaveSurfer | null) => void;
}

export function useGlobalPlayhead(): [GlobalPlayheadState, GlobalPlayheadActions] {
  const [currentTime, setCurrentTimeState] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDurationState] = useState(300); // Default 5 minutes
  const [zoom, setZoomState] = useState(100);
  const [scrollLeft, setScrollLeftState] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRefs = useRef<Map<string, any>>(new Map());
  const syncInterval = useRef<NodeJS.Timeout | null>(null);

  // Sync all media to current time
  const syncAllMedia = useCallback((time: number) => {
    console.log(`🎬 [Global Playhead] Syncing all media to time: ${time.toFixed(2)}s`);
    
    // Sync video
    if (videoRef.current && Math.abs(videoRef.current.currentTime - time) > 0.1) {
      videoRef.current.currentTime = time;
    }
    
    // Sync all audio sources
    audioRefs.current.forEach((audioElement, key) => {
      try {
        if (audioElement?.seekTo) {
          // WaveSurfer instance
          audioElement.seekTo(time / (audioElement.getDuration() || 1));
        } else if (audioElement?.currentTime !== undefined) {
          // HTML Audio element
          if (Math.abs(audioElement.currentTime - time) > 0.1) {
            audioElement.currentTime = time;
          }
        }
      } catch (error) {
        console.warn(`Failed to sync audio element ${key}:`, error);
      }
    });
  }, []);

  // Update current time with sync
  const setCurrentTime = useCallback((time: number) => {
    const clampedTime = Math.max(0, Math.min(time, duration));
    console.log(`⏰ [Global Playhead] Setting time: ${clampedTime.toFixed(2)}s`);
    setCurrentTimeState(clampedTime);
    syncAllMedia(clampedTime);
    
    // Emit custom event for other components to listen
    window.dispatchEvent(new CustomEvent('global-playhead-update', {
      detail: { currentTime: clampedTime, isPlaying }
    }));
  }, [duration, isPlaying, syncAllMedia]);

  const setIsPlayingCallback = useCallback((playing: boolean) => {
    console.log(`▶️ [Global Playhead] ${playing ? 'Playing' : 'Pausing'} - Video ref:`, !!videoRef.current);
    setIsPlaying(playing);
    
    // Control video playback
    if (videoRef.current) {
      if (playing) {
        videoRef.current.play().catch(console.warn);
      } else {
        videoRef.current.pause();
      }
    }
    
    // Control audio playback
    audioRefs.current.forEach((audioElement) => {
      try {
        if (audioElement?.play && audioElement?.pause) {
          if (playing) {
            audioElement.play();
          } else {
            audioElement.pause();
          }
        }
      } catch (error) {
        console.warn('Failed to control audio playback:', error);
      }
    });

    // Emit event
    window.dispatchEvent(new CustomEvent('global-playback-state', {
      detail: { isPlaying: playing }
    }));
  }, []);

  const play = useCallback(() => setIsPlayingCallback(true), [setIsPlayingCallback]);
  const pause = useCallback(() => setIsPlayingCallback(false), [setIsPlayingCallback]);
  
  const stop = useCallback(() => {
    console.log('⏹️ [Global Playhead] Stopping playback');
    setIsPlayingCallback(false);
    setCurrentTime(0);
  }, [setIsPlayingCallback, setCurrentTime]);

  const seekTo = useCallback((time: number) => {
    console.log(`🎯 [Global Playhead] Seeking to: ${time.toFixed(2)}s`);
    setCurrentTime(time);
  }, [setCurrentTime]);

  const syncToVideo = useCallback((videoElement: HTMLVideoElement | null) => {
    videoRef.current = videoElement;
    if (videoElement) {
      console.log('🎥 [Global Playhead] Video element registered:', {
        src: videoElement.src,
        duration: videoElement.duration,
        readyState: videoElement.readyState,
        paused: videoElement.paused
      });
      setDurationState(Math.max(videoElement.duration || 300, duration));
    } else {
      console.log('🎥 [Global Playhead] Video element unregistered');
    }
  }, [duration]);

  const syncToAudio = useCallback((audioElement: any, id = 'default') => {
    if (audioElement) {
      audioRefs.current.set(id, audioElement);
      console.log(`🎵 [Global Playhead] Audio element registered: ${id}`);
      
      // Update duration if longer
      let audioDuration = 0;
      if (audioElement.getDuration) {
        audioDuration = audioElement.getDuration();
      } else if (audioElement.duration) {
        audioDuration = audioElement.duration;
      }
      
      if (audioDuration > 0) {
        setDurationState(Math.max(audioDuration, duration));
      }
    } else {
      audioRefs.current.delete(id);
      console.log(`🎵 [Global Playhead] Audio element unregistered: ${id}`);
    }
  }, [duration]);

  const setZoom = useCallback((newZoom: number) => {
    const clampedZoom = Math.max(10, Math.min(newZoom, 2000));
    console.log(`🔍 [Global Playhead] Zoom changed: ${clampedZoom}px/sec`);
    setZoomState(clampedZoom);
    
    // Emit zoom change event
    window.dispatchEvent(new CustomEvent('global-zoom-change', {
      detail: { zoom: clampedZoom }
    }));
  }, []);

  const setScrollLeft = useCallback((scroll: number) => {
    setScrollLeftState(Math.max(0, scroll));
  }, []);

  const setDuration = useCallback((newDuration: number) => {
    const validDuration = Math.max(1, newDuration);
    console.log(`⏱️ [Global Playhead] Duration updated: ${validDuration.toFixed(2)}s`);
    setDurationState(validDuration);
  }, []);

  // Continuous sync when playing - reduced frequency to prevent performance issues
  useEffect(() => {
    if (isPlaying) {
      syncInterval.current = setInterval(() => {
        if (videoRef.current && !videoRef.current.paused && !videoRef.current.seeking) {
          const videoTime = videoRef.current.currentTime;
          // Use larger threshold to reduce updates
          if (Math.abs(videoTime - currentTime) > 0.1) {
            setCurrentTimeState(videoTime);
            
            // Emit smooth playhead update for UI response
            window.dispatchEvent(new CustomEvent('playhead-smooth-update', {
              detail: { currentTime: videoTime, isPlaying: true }
            }));
          }
        } else if (!videoRef.current) {
          // If no video, still update time for audio-only playback
          const newTime = currentTime + 0.1; // 10fps update to reduce CPU load
          if (newTime <= duration) {
            setCurrentTimeState(newTime);
            window.dispatchEvent(new CustomEvent('playhead-smooth-update', {
              detail: { currentTime: newTime, isPlaying: true }
            }));
          }
        }
      }, 100); // 10fps updates to reduce performance impact
    } else {
      if (syncInterval.current) {
        clearInterval(syncInterval.current);
        syncInterval.current = null;
      }
    }

    return () => {
      if (syncInterval.current) {
        clearInterval(syncInterval.current);
      }
    };
  }, [isPlaying, currentTime, duration]);

  return [
    {
      currentTime,
      isPlaying,
      duration,
      zoom,
      scrollLeft
    },
    {
      setCurrentTime,
      setIsPlaying: setIsPlayingCallback,
      setDuration,
      setZoom,
      setScrollLeft,
      play,
      pause,
      stop,
      seekTo,
      syncToVideo,
      syncToAudio
    }
  ];
}