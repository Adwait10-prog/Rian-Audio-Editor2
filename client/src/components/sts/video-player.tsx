import { useState, useRef, useEffect, useCallback } from "react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, Volume2, Maximize } from "lucide-react";
import { useGlobalPlayhead } from "@/hooks/useGlobalPlayhead";

interface VideoPlayerProps {
  videoFile?: string;
  onAudioExtracted?: (audioUrl: string, waveformData: number[]) => void;
}

const VideoPlayer = React.forwardRef<HTMLVideoElement, VideoPlayerProps>(
  ({ videoFile, onAudioExtracted }, ref) => {
  // Use global playhead state
  const [playheadState, playheadActions] = useGlobalPlayhead();
  const [localDuration, setLocalDuration] = useState(0);

  const [volume, setVolume] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Combine internal ref with forwarded ref
  const combinedRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  }, [ref]);



  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Remove individual play/pause - only use global controls

  const handleStop = () => {
    playheadActions.stop();
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || video.seeking) return;
    
    // Only update if video is the master source (when playing)
    if (playheadState.isPlaying && !video.paused) {
      // Update global playhead with video time for smooth scrubbing
      const videoTime = video.currentTime;
      playheadActions.setCurrentTime(videoTime);
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    
    console.log('🎥 [Video Player] Metadata loaded:', {
      duration: video.duration,
      readyState: video.readyState,
      networkState: video.networkState,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      src: video.src,
      volume: video.volume,
      muted: video.muted
    });
    
    // Ensure video is not muted and has good volume
    video.volume = 0.8;
    video.muted = false;
    
    setLocalDuration(Math.floor(video.duration));
    playheadActions.setDuration(video.duration);
    playheadActions.syncToVideo(video);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickProgress = clickX / rect.width;
    const newTime = clickProgress * localDuration;
    
    playheadActions.seekTo(newTime);
  };

  const extractAudioFromVideo = async () => {
    if (!videoFile) return;
    
    setIsLoading(true);
    console.log(`🎥 [Video Player] Starting audio extraction for: ${videoFile}`);
    
    try {
      // Use full URL for Electron compatibility
      const baseUrl = window.location.origin;
      const extractUrl = `${baseUrl}/api/extract-audio`;
      
      console.log(`🎥 [Video Player] Calling extraction API: ${extractUrl}`);
      
      const response = await fetch(extractUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: `uploads/${videoFile}` })
      });
      
      console.log(`🎥 [Video Player] Extraction response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Extraction failed: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log(`🎥 [Video Player] Extraction result:`, result);
      
      if (result.success) {
        console.log(`✅ [Video Player] Audio extracted successfully: ${result.audioFile}`);
        onAudioExtracted?.(result.audioUrl || `/uploads/${result.audioFile}`, result.waveformData);
      } else {
        throw new Error(result.message || 'Audio extraction failed');
      }
    } catch (error) {
      console.error('🎥 [Video Player] Audio extraction failed:', error);
      // Show error to user but don't break the interface
      console.warn('Audio extraction failed, continuing without extracted audio');
    } finally {
      setIsLoading(false);
    }
  };

  // Simplified video sync - focus on making it work first
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    console.log(`🎥 [Video Player] SIMPLE SYNC:`, {
      globalPlaying: playheadState.isPlaying,
      videoPaused: video.paused,
      videoSrc: !!video.src,
      videoReady: video.readyState >= 2, // HAVE_CURRENT_DATA
      videoDuration: video.duration
    });
    
    // Simple play/pause sync
    if (playheadState.isPlaying && video.paused && video.readyState >= 2) {
      console.log('🎥 [Video Player] ▶️ PLAYING VIDEO');
      video.play()
        .then(() => console.log('✅ [Video Player] Play SUCCESS'))
        .catch((err) => {
          console.error('❌ [Video Player] Play FAILED:', err.name, err.message);
          // Don't reset global state immediately - let user retry
        });
    } else if (!playheadState.isPlaying && !video.paused) {
      console.log('🎥 [Video Player] ⏸️ PAUSING VIDEO');
      video.pause();
    }
  }, [playheadState.isPlaying]); // Only react to play/pause changes
  
  // Separate effect for time sync to avoid conflicts
  useEffect(() => {
    const video = videoRef.current;
    if (!video || video.seeking) return;
    
    // Only sync time when significantly different (avoid micro-adjustments)
    if (Math.abs(video.currentTime - playheadState.currentTime) > 0.5) {
      console.log(`🎥 [Video Player] Time sync: ${video.currentTime.toFixed(2)}s → ${playheadState.currentTime.toFixed(2)}s`);
      video.currentTime = playheadState.currentTime;
    }
  }, [playheadState.currentTime]);

  useEffect(() => {
    console.log('Video file changed:', videoFile);
    if (videoFile) {
      const videoSrc = videoFile.startsWith('http') || videoFile.startsWith('/') ? videoFile : `/uploads/${videoFile}`;
      console.log('Video source URL:', videoSrc);
      extractAudioFromVideo();
    }
  }, [videoFile]);

  // Add error handling for video load
  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.target as HTMLVideoElement;
    console.error('Video error:', video.error);
    console.error('Video network state:', video.networkState);
    console.error('Video ready state:', video.readyState);
  };

  const progressPercentage = localDuration > 0 ? (playheadState.currentTime / localDuration) * 100 : 0;

  return (
    <div className="rian-surface border-b rian-border" style={{ height: "300px" }}>
      <div className="h-full p-4">
        <div className="bg-black rounded-lg h-full relative overflow-hidden">
          {videoFile ? (
            <video
              key={videoFile} // Force re-mount when videoFile changes
              ref={combinedRef}
              className="w-full h-full object-contain cursor-pointer"
              src={videoFile.startsWith('http') || videoFile.startsWith('/') ? videoFile : `/uploads/${videoFile}`}
              muted={false} // Allow audio playback
              controls={false} // Hide default controls
              preload="metadata" // Preload metadata for faster playback
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => {
                console.log('🎥 [Video Player] ▶️ Video PLAY event fired');
                playheadActions.play();
              }}
              onPause={() => {
                console.log('🎥 [Video Player] ⏸️ Video PAUSE event fired');
                playheadActions.pause();
              }}
              onError={handleVideoError}
              onCanPlay={() => console.log('🎥 [Video Player] ✅ Video CAN PLAY')}
              onLoadStart={() => console.log('🎥 [Video Player] 📥 Video LOAD START')}
              onSeeking={() => console.log('🎥 [Video Player] ⏩ Video SEEKING')}
              onSeeked={() => console.log('🎥 [Video Player] ✅ Video SEEKED')}
              onWaiting={() => console.log('🎥 [Video Player] ⏳ Video WAITING')}
              onPlaying={() => console.log('🎥 [Video Player] ▶️ Video PLAYING')}
              onLoadedData={() => console.log('🎥 [Video Player] 📊 Video DATA LOADED')}
              onClick={() => {
                console.log('🎥 [Video Player] 🖱️ Video CLICKED - toggling playback');
                const video = videoRef.current;
                if (video) {
                  if (video.paused) {
                    video.play().then(() => {
                      console.log('🎥 [Video Player] Direct click play succeeded');
                    }).catch(err => {
                      console.error('🎥 [Video Player] Direct click play failed:', err);
                    });
                  } else {
                    video.pause();
                    console.log('🎥 [Video Player] Direct click pause');
                  }
                }
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
                  <Play className="w-8 h-8" />
                </div>
                <p className="text-lg">Video Player</p>
                <p className="text-sm">Upload a video file to begin</p>
              </div>
            </div>
          )}
          
          {isLoading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p>Extracting audio...</p>
              </div>
            </div>
          )}

          {/* Debug controls and time display */}
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 rounded px-2 py-1 flex items-center gap-2">
            <span className="text-white text-xs">
              {formatTime(Math.floor(playheadState.currentTime))} / {formatTime(localDuration)}
            </span>
            {/* Debug controls */}
            {process.env.NODE_ENV === 'development' && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  onClick={() => {
                    const video = videoRef.current;
                    if (video) {
                      console.log('🎥 [DEBUG] Direct video play attempt', {
                        paused: video.paused,
                        readyState: video.readyState,
                        networkState: video.networkState,
                        currentTime: video.currentTime,
                        duration: video.duration,
                        volume: video.volume,
                        muted: video.muted,
                        src: video.src
                      });
                      video.play().then(() => {
                        console.log('🎥 [DEBUG] ✅ Direct play SUCCEEDED');
                      }).catch(err => {
                        console.error('🎥 [DEBUG] ❌ Direct play FAILED:', err);
                      });
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white text-xs px-1 py-0"
                  title="Direct play test"
                >
                  ▶
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const video = videoRef.current;
                    if (video) {
                      video.pause();
                      console.log('🎥 [DEBUG] ⏸️ Direct pause');
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs px-1 py-0"
                  title="Direct pause test"
                >
                  ⏸
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
