import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, VolumeX } from "lucide-react";
import Waveform from "./waveform";
import type { AudioTrack as AudioTrackType } from "@shared/schema";

interface AudioTrackProps {
  track: AudioTrackType;
  onContextMenu: (event: React.MouseEvent, trackId: number) => void;
  onPlay: () => void;
  onStop: () => void;
  onMute: () => void;
}

export default function AudioTrack({
  track,
  onContextMenu,
  onPlay,
  onStop,
  onMute
}: AudioTrackProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
    onPlay();
  };

  const handleStop = () => {
    setIsPlaying(false);
    onStop();
  };

  const handleMute = () => {
    setIsMuted(!isMuted);
    onMute();
  };

  return (
    <div className="rian-surface rounded-lg border rian-border track-row">
      <div className="flex items-center">
        {/* Left Control Panel */}
        <div className="w-60 p-4 border-r rian-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-white">{track.trackName}</h3>
            <div className="flex items-center space-x-1">
              <Button
                onClick={handlePlay}
                className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
                  isPlaying 
                    ? 'bg-[var(--rian-warning)] hover:bg-yellow-600' 
                    : 'bg-[var(--rian-success)] hover:bg-green-600'
                }`}
              >
                {isPlaying ? (
                  <Pause className="w-3 h-3" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
              </Button>
              <Button
                onClick={handleStop}
                className="w-8 h-8 rounded bg-[var(--rian-danger)] hover:bg-red-600 flex items-center justify-center transition-colors"
              >
                <Square className="w-3 h-3" />
              </Button>
              <Button
                onClick={handleMute}
                className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
                  isMuted 
                    ? 'bg-[var(--rian-danger)] hover:bg-red-600' 
                    : 'rian-elevated hover:bg-gray-600'
                }`}
              >
                <VolumeX className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Waveform Area */}
        <div className="flex-1 p-4">
          <Waveform
            isActive={!!track.audioFile}
            onContextMenu={(event) => onContextMenu(event, track.id)}
          />
        </div>
      </div>
    </div>
  );
}
