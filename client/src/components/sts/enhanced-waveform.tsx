import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX, RotateCw } from "lucide-react";
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import { useGlobalPlayhead } from '@/hooks/useGlobalPlayhead';

interface EnhancedWaveformProps {
  trackId: string;
  audioUrl?: string;
  waveformData?: number[];
  isActive?: boolean;
  height?: number;
  zoom: number;
  currentTime: number;
  duration: number;
  scrollLeft: number;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onRegionSelect?: (start: number, end: number) => void;
  waveColor?: string;
  progressColor?: string;
  className?: string;
}

export default function EnhancedWaveform({
  trackId,
  audioUrl,
  waveformData,
  isActive = false,
  height = 80,
  zoom,
  currentTime,
  duration,
  scrollLeft,
  onTimeUpdate,
  onDurationChange,
  onPlay,
  onPause,
  onRegionSelect,
  waveColor = '#60a5fa',
  progressColor = '#2563eb',
  className = ''
}: EnhancedWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<any>(null);
  
  // Get global playhead actions to register this audio source
  const [, playheadActions] = useGlobalPlayhead();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [smoothTime, setSmoothTime] = useState(currentTime);
  
  // Calculate waveform width based on duration and zoom
  const waveformWidth = Math.max(duration * zoom, 200);

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
  
  console.log(`🌊 [Enhanced Waveform ${trackId}] Rendering - Active: ${isActive}, URL: ${audioUrl}, WaveformData: ${waveformData?.length || 0} peaks, Time: ${currentTime.toFixed(2)}s, Zoom: ${zoom}px/sec, Loading: ${isLoading}, Ready: ${isReady}`);

  // Initialize WaveSurfer or Custom Renderer
  useEffect(() => {
    if (!isActive || (!audioUrl && !waveformData) || !containerRef.current) {
      console.log(`🌊 [Enhanced Waveform ${trackId}] Skipping init - Active: ${isActive}, URL: ${!!audioUrl}, WaveformData: ${waveformData?.length || 0}, Container: ${!!containerRef.current}`);
      return;
    }

    console.log(`🌊 [Enhanced Waveform ${trackId}] Initializing waveform renderer`);
    setIsLoading(true);
    setError(null);

    // Cleanup previous instance
    if (wavesurferRef.current) {
      try {
        wavesurferRef.current.destroy();
      } catch (err) {
        console.warn(`Failed to destroy previous WaveSurfer instance:`, err);
      }
    }

    // Hybrid approach: Use Rust peaks for visualization + WaveSurfer for playback
    if (waveformData && waveformData.length > 0) {
      console.log(`🌊 [Enhanced Waveform ${trackId}] Using hybrid approach: Rust peaks (${waveformData.length}) + WaveSurfer playback`);
      
      try {
        // Create canvas for Rust-generated peaks
        const canvas = document.createElement('canvas');
        const container = containerRef.current;
        
        // Calculate proper dimensions based on duration and zoom
        // waveformData.length should be roughly duration * 115 peaks/second
        const estimatedDuration = waveformData.length / 115; // Rust generates ~115 peaks per second
        const containerWidth = Math.max(estimatedDuration * zoom, container.clientWidth || 800);
        
        console.log(`🌊 [Enhanced Waveform ${trackId}] Canvas dimensions: ${containerWidth}x${height}, Duration: ${estimatedDuration.toFixed(2)}s`);
        
        canvas.width = containerWidth;
        canvas.height = height;
        canvas.style.width = `${containerWidth}px`;
        canvas.style.height = `${height}px`;
        canvas.style.display = 'block';
        canvas.style.position = 'relative';
        canvas.style.backgroundColor = 'transparent';
        
        // Clear container and add canvas
        container.innerHTML = '';
        container.style.position = 'relative';
        container.style.width = `${containerWidth}px`;
        container.style.height = `${height}px`;
        container.appendChild(canvas);
        
        // Draw Rust-generated waveform
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Clear canvas first
          ctx.clearRect(0, 0, containerWidth, height);
          
          ctx.fillStyle = waveColor;
          const pixelsPerPeak = containerWidth / waveformData.length;
          const centerY = height / 2;
          
          console.log(`🌊 [Enhanced Waveform ${trackId}] Drawing ${waveformData.length} peaks, ${pixelsPerPeak.toFixed(2)} pixels per peak`);
          
          waveformData.forEach((peak, index) => {
            const x = index * pixelsPerPeak;
            const normalizedPeak = Math.min(Math.max(peak, 0), 1); // Ensure peak is between 0 and 1
            const barHeight = normalizedPeak * centerY * 0.9; // Scale to 90% of height
            
            // Draw symmetric waveform bars (top and bottom)
            if (barHeight > 0) {
              ctx.fillRect(x, centerY - barHeight, Math.max(pixelsPerPeak, 1), barHeight);
              ctx.fillRect(x, centerY, Math.max(pixelsPerPeak, 1), barHeight);
            }
          });
          
          console.log(`🌊 [Enhanced Waveform ${trackId}] Canvas waveform drawn successfully`);
        }
        
        // Set ready immediately for canvas visualization
        setIsReady(true);
        setIsLoading(false);
        onDurationChange?.(estimatedDuration);
        
        // Create invisible WaveSurfer for audio playback only
        if (audioUrl) {
          const invisibleContainer = document.createElement('div');
          invisibleContainer.style.position = 'absolute';
          invisibleContainer.style.top = '0';
          invisibleContainer.style.left = '0';
          invisibleContainer.style.width = '1px'; // Minimal size
          invisibleContainer.style.height = '1px';
          invisibleContainer.style.opacity = '0';
          invisibleContainer.style.pointerEvents = 'none';
          invisibleContainer.style.zIndex = '-1';
          container.appendChild(invisibleContainer);
          
          const ws = WaveSurfer.create({
            container: invisibleContainer,
            height: 1,
            waveColor: 'transparent',
            progressColor: 'transparent',
            cursorColor: 'transparent',
            interact: false,
            normalize: false
          });
          
          wavesurferRef.current = ws;
          
          ws.on('ready', () => {
            console.log(`🌊 [Enhanced Waveform ${trackId}] WaveSurfer ready for playback control`);
            const audioDuration = ws.getDuration();
            if (audioDuration > 0) {
              onDurationChange?.(audioDuration);
              playheadActions.syncToAudio(ws, trackId);
            }
          });
          
          ws.on('error', (error) => {
            console.warn(`🌊 [Enhanced Waveform ${trackId}] WaveSurfer error (canvas still works):`, error.message);
          });
          
          ws.load(audioUrl);
        }
        
        return; // Skip normal WaveSurfer initialization
        
      } catch (error) {
        console.error(`🌊 [Enhanced Waveform ${trackId}] Hybrid rendering error:`, error);
        // Fall through to normal WaveSurfer
      }
    }

    try {
      // Prepare WaveSurfer configuration
      const wsConfig: any = {
        container: containerRef.current,
        height: height,
        waveColor: waveColor,
        progressColor: progressColor,
        cursorColor: '#ef4444',
        barWidth: 2,
        barGap: 1,
        responsive: false,
        hideScrollbar: true,
        interact: true,
        normalize: true,
        minPxPerSec: zoom,
        plugins: [
          RegionsPlugin.create()
        ]
      };

      // WaveSurfer will handle audio loading and processing naturally

      const ws = WaveSurfer.create(wsConfig);

      wavesurferRef.current = ws;
      regionsRef.current = ws.plugins[0];

      // Set up event listeners
      ws.on('ready', () => {
        console.log(`🌊 [Enhanced Waveform ${trackId}] Ready - Duration: ${ws.getDuration()}s`);
        setIsReady(true);
        setIsLoading(false);
        const audioDuration = ws.getDuration();
        if (audioDuration > 0) {
          onDurationChange?.(audioDuration);
          // Register this audio source with the global playhead
          playheadActions.syncToAudio(ws, trackId);
        }
      });

      ws.on('error', (error) => {
        // Handle AbortError gracefully in development
        if (error.name === 'AbortError' && process.env.NODE_ENV === 'development') {
          console.debug(`🌊 [Enhanced Waveform ${trackId}] AbortError during development (ignoring):`, error.message);
          // Don't set error state for AbortError in development
          return;
        }
        
        console.error(`🌊 [Enhanced Waveform ${trackId}] Error:`, error);
        setError(error.message || 'Failed to load audio');
        setIsLoading(false);
      });

      ws.on('play', () => {
        console.log(`🌊 [Enhanced Waveform ${trackId}] Playing - syncing with global playhead`);
        setIsPlaying(true);
        onPlay?.();
      });

      ws.on('pause', () => {
        console.log(`🌊 [Enhanced Waveform ${trackId}] Paused - syncing with global playhead`);
        setIsPlaying(false);
        onPause?.();
      });

      ws.on('timeupdate', (time) => {
        onTimeUpdate?.(time);
      });

      ws.on('seeking', (time) => {
        console.log(`🌊 [Enhanced Waveform ${trackId}] Seeking to: ${time}s`);
        onTimeUpdate?.(time);
      });

      // Region events
      ws.on('region-created', (region: any) => {
        console.log(`🌊 [Enhanced Waveform ${trackId}] Region created:`, region.start, region.end);
        onRegionSelect?.(region.start, region.end);
      });

      // Load audio file naturally with WaveSurfer
      if (audioUrl) {
        console.log(`🌊 [Enhanced Waveform ${trackId}] Loading audio: ${audioUrl}`);
        ws.load(audioUrl);
      } else {
        console.warn(`🌊 [Enhanced Waveform ${trackId}] No audio URL available`);
        setError('No audio file available');
      }

    } catch (err) {
      console.error(`🌊 [Enhanced Waveform ${trackId}] Init error:`, err);
      setError('Failed to initialize audio player');
      setIsLoading(false);
    }

    return () => {
      if (wavesurferRef.current) {
        try {
          // Unregister from global playhead first
          playheadActions.syncToAudio(null, trackId);
          
          // Stop any ongoing operations
          if (wavesurferRef.current.isPlaying && wavesurferRef.current.isPlaying()) {
            wavesurferRef.current.pause();
          }
          
          // Safely destroy the instance
          const ws = wavesurferRef.current;
          wavesurferRef.current = null; // Clear reference first to prevent race conditions
          
          if (ws && typeof ws.destroy === 'function') {
            // Use setTimeout to defer destruction and avoid React strict mode issues
            setTimeout(() => {
              try {
                ws.destroy();
              } catch (destroyError) {
                // This error is expected during hot reloading and can be safely ignored
                if (process.env.NODE_ENV === 'development') {
                  console.debug(`WaveSurfer cleanup during component unmount (expected):`, destroyError.name);
                }
              }
            }, 0);
          }
        } catch (err) {
          console.warn(`WaveSurfer cleanup error:`, err);
        }
      }
      regionsRef.current = null;
    };
  }, [isActive, audioUrl, trackId, height]);

  // Sync external time changes
  useEffect(() => {
    if (!wavesurferRef.current || !isReady) return;
    
    const ws = wavesurferRef.current;
    
    try {
      // Only sync if WaveSurfer has loaded audio
      if (ws.getDuration && ws.getDuration() > 0) {
        const wsCurrentTime = ws.getCurrentTime();
        
        // Only update if there's a significant difference to avoid sync loops
        if (Math.abs(wsCurrentTime - currentTime) > 0.1) {
          console.log(`🌊 [Enhanced Waveform ${trackId}] Syncing time: ${wsCurrentTime.toFixed(2)}s → ${currentTime.toFixed(2)}s`);
          // Use a more precise sync to avoid audio stutter
          ws.seekTo(currentTime / Math.max(ws.getDuration() || 1, 0.1));
        }
      } else {
        console.log(`🌊 [Enhanced Waveform ${trackId}] Skipping time sync - no audio loaded in WaveSurfer`);
      }
    } catch (error) {
      console.warn(`🌊 [Enhanced Waveform ${trackId}] Sync error (expected in hybrid mode):`, error.message);
    }
  }, [currentTime, isReady, trackId]);

  // Update zoom
  useEffect(() => {
    if (!wavesurferRef.current || !isReady) return;
    
    // Only call zoom if WaveSurfer has loaded audio
    try {
      if (wavesurferRef.current.getDuration && wavesurferRef.current.getDuration() > 0) {
        console.log(`🌊 [Enhanced Waveform ${trackId}] Updating zoom: ${zoom}px/sec`);
        wavesurferRef.current.zoom(zoom);
      } else {
        console.log(`🌊 [Enhanced Waveform ${trackId}] Skipping zoom - no audio loaded in WaveSurfer`);
      }
    } catch (error) {
      console.warn(`🌊 [Enhanced Waveform ${trackId}] Zoom error (expected in hybrid mode):`, error.message);
    }
  }, [zoom, isReady, trackId]);

  // Handle play/pause
  const handlePlayPause = useCallback(() => {
    if (!wavesurferRef.current || !isReady) return;
    
    try {
      // Only control playback if WaveSurfer has loaded audio
      if (wavesurferRef.current.getDuration && wavesurferRef.current.getDuration() > 0) {
        if (isPlaying) {
          wavesurferRef.current.pause();
        } else {
          wavesurferRef.current.play();
        }
      } else {
        console.log(`🌊 [Enhanced Waveform ${trackId}] Playback control skipped - no audio loaded in WaveSurfer`);
        // For canvas-only mode, still trigger the callbacks
        if (isPlaying) {
          onPause?.();
        } else {
          onPlay?.();
        }
      }
    } catch (error) {
      console.warn(`🌊 [Enhanced Waveform ${trackId}] Playback error (expected in hybrid mode):`, error.message);
    }
  }, [isPlaying, isReady, trackId, onPlay, onPause]);

  // Handle volume change
  const handleVolumeChange = useCallback((newVolume: number) => {
    if (!wavesurferRef.current) return;
    
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(clampedVolume);
    
    try {
      if (wavesurferRef.current.setVolume) {
        wavesurferRef.current.setVolume(isMuted ? 0 : clampedVolume);
      }
    } catch (error) {
      console.warn(`🌊 [Enhanced Waveform ${trackId}] Volume change error:`, error.message);
    }
  }, [isMuted, trackId]);

  // Handle mute toggle
  const handleMuteToggle = useCallback(() => {
    if (!wavesurferRef.current) return;
    
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    
    try {
      if (wavesurferRef.current.setVolume) {
        wavesurferRef.current.setVolume(newMuted ? 0 : volume);
      }
    } catch (error) {
      console.warn(`🌊 [Enhanced Waveform ${trackId}] Mute toggle error:`, error.message);
    }
  }, [isMuted, volume, trackId]);

  // Handle retry
  const handleRetry = useCallback(() => {
    if (!audioUrl) return;
    
    setError(null);
    setIsLoading(true);
    
    // Trigger re-initialization
    if (wavesurferRef.current) {
      wavesurferRef.current.load(audioUrl);
    }
  }, [audioUrl]);

  // Render inactive state
  if (!isActive) {
    return (
      <div 
        className={`border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center text-gray-500 hover:border-blue-400 transition-colors ${className}`}
        style={{ height, minWidth: 200 }}
      >
        <div className="text-center">
          <div className="text-2xl mb-2">🎵</div>
          <p className="text-sm">Upload audio file</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div 
        className={`bg-red-900/20 border border-red-500 rounded-lg flex items-center justify-between px-4 ${className}`}
        style={{ height, minWidth: 200 }}
      >
        <div className="flex items-center space-x-2">
          <div className="text-red-400">⚠️</div>
          <div>
            <p className="text-red-400 text-sm font-medium">Audio Error</p>
            <p className="text-red-300 text-xs">{error}</p>
          </div>
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleRetry}
          className="text-red-400 border-red-400 hover:bg-red-900/30"
        >
          <RotateCw className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // Render loading state
  if (isLoading) {
    return (
      <div 
        className={`bg-gray-800 border border-gray-600 rounded-lg flex items-center justify-center ${className}`}
        style={{ height, minWidth: 200 }}
      >
        <div className="flex items-center space-x-3">
          <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="text-gray-400">Loading audio...</span>
        </div>
      </div>
    );
  }

  // Calculate playhead position for overlay using smooth time - EXACT same calculation as timeline ruler
  const playheadPositionPx = smoothTime * zoom; // pixels from start
  const playheadPosition = playheadPositionPx; // position within the waveform container

  return (
    <div className={`relative bg-gray-900 border border-gray-600 rounded-lg overflow-hidden ${className}`}>
      {/* No individual controls - use global timeline controls */}

      {/* Track info */}
      <div className="absolute top-2 right-2 bg-black bg-opacity-50 rounded px-2 py-1 text-xs text-gray-300 z-10">
        {trackId}
      </div>

      {/* Waveform container with proper sizing */}
      <div 
        className="relative"
        style={{ 
          height, 
          width: waveformWidth,
          minWidth: '100%'
        }}
      >
        <div 
          ref={containerRef}
          className="w-full h-full"
          style={{ width: waveformWidth }}
        />
        
        {/* Individual waveform playheads removed - using global unified playhead */}
      </div>

      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-1 left-1 text-xs text-gray-500 bg-black bg-opacity-50 px-1 rounded">
          {trackId}: {smoothTime.toFixed(1)}s / {duration.toFixed(1)}s (Z: {zoom})
        </div>
      )}
    </div>
  );
}