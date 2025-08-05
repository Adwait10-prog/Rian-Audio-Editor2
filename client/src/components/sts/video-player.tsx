import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, Volume2, Maximize } from "lucide-react";

interface VideoPlayerProps {
  videoFile?: string;
  onAudioExtracted?: (audioUrl: string, waveformData: number[]) => void;
}

export default function VideoPlayer({ videoFile, onAudioExtracted }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [volume, setVolume] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);



  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    video.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(Math.floor(video.currentTime));
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(Math.floor(video.duration));
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickProgress = clickX / rect.width;
    const newTime = clickProgress * duration;
    
    video.currentTime = newTime;
    setCurrentTime(Math.floor(newTime));
  };

  const extractAudioFromVideo = async () => {
    if (!videoFile) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/extract-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoFile })
      });
      
      const result = await response.json();
      if (result.success) {
        onAudioExtracted?.(result.audioUrl, result.waveformData);
      }
    } catch (error) {
      console.error('Audio extraction failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const progressPercentage = (currentTime / duration) * 100;

  return (
    <div className="rian-surface border-b rian-border" style={{ height: "300px" }}>
      <div className="h-full p-4">
        <div className="bg-black rounded-lg h-full relative overflow-hidden">
          {videoFile ? (
            <video
              key={videoFile} // Force re-mount when videoFile changes
              ref={videoRef}
              className="w-full h-full object-contain"
              src={videoFile.startsWith('http') || videoFile.startsWith('/') ? videoFile : `/uploads/${videoFile}`}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={handleVideoError}
              onCanPlay={() => console.log('Video can play')}
              onLoadStart={() => console.log('Video load started')}
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

          {/* Video Controls Overlay */}
          <div className="absolute bottom-0 left-0 right-0 video-controls p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  onClick={handlePlayPause}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-3 transition-all"
                >
                  {isPlaying ? (
                    <Pause className="text-white text-lg" />
                  ) : (
                    <Play className="text-white text-lg" />
                  )}
                </Button>
                <Button
                  onClick={handleStop}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 transition-all"
                >
                  <Square className="text-white" />
                </Button>
                <span className="text-white font-mono text-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <Volume2 className="text-white w-4 h-4" />
                <div className="w-20 bg-white bg-opacity-20 rounded-full h-2 relative">
                  <div 
                    className="bg-white rounded-full h-2 transition-all"
                    style={{ width: `${volume}%` }}
                  />
                </div>
                <Button className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded p-2">
                  <Maximize className="text-white w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-3">
              <div 
                className="w-full bg-white bg-opacity-20 rounded-full h-1 relative cursor-pointer"
                onClick={handleProgressClick}
              >
                <div 
                  className="bg-[var(--rian-accent)] rounded-full h-1 transition-all"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
