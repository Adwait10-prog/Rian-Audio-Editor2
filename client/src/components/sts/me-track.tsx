import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, VolumeX } from "lucide-react";
import Waveform from "./waveform";
import type { AudioTrack as AudioTrackType } from "@shared/schema";

interface METrackProps {
  track?: AudioTrackType;
  onContextMenu: (event: React.MouseEvent, trackId: number) => void;
  onPlay: () => void;
  onStop: () => void;
  onMute: () => void;
  onFileUpload: (file: File) => void;
}

export default function METrack({
  track,
  onContextMenu,
  onPlay,
  onStop,
  onMute,
  onFileUpload
}: METrackProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <div className="rian-surface rounded-lg border rian-border track-row">
      <div className="flex items-center">
        {/* Left Control Panel */}
        <div className="w-60 p-4 border-r rian-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-white">M&E File</h3>
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
          {track?.audioFile ? (
            <Waveform
              audioUrl={track.audioFile ? `/uploads/${track.audioFile}` : undefined}
              isActive={true}
              onContextMenu={(event) => track && onContextMenu(event, track.id)}
            />
          ) : (
            <div 
              className="waveform-container border-2 border-dashed rian-border rounded-lg h-16 flex items-center justify-center cursor-pointer hover:border-[var(--rian-accent)] transition-colors"
              onClick={handleFileClick}
            >
              <div className="text-center text-gray-500">
                <div className="text-xl mb-2">🎵</div>
                <p className="text-sm">Drop M&E file or click to upload</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
