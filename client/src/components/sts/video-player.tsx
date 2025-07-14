import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, Volume2, Maximize } from "lucide-react";

export default function VideoPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(225); // 3:45 in seconds
  const [volume, setVolume] = useState(60);
  const videoRef = useRef<HTMLVideoElement>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    // Implementation would control actual video
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    // Implementation would stop and reset video
  };

  const progressPercentage = (currentTime / duration) * 100;

  return (
    <div className="rian-surface border-b rian-border" style={{ height: "300px" }}>
      <div className="h-full p-4">
        <div className="bg-black rounded-lg h-full relative overflow-hidden">
          {/* Video placeholder */}
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
                <Play className="w-8 h-8" />
              </div>
              <p className="text-lg">Video Player</p>
              <p className="text-sm">Upload a video file to begin</p>
            </div>
          </div>

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
              <div className="w-full bg-white bg-opacity-20 rounded-full h-1 relative cursor-pointer">
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
