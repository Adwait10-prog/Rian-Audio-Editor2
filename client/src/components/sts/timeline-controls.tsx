import { Button } from "@/components/ui/button";
import { Scissors, ZoomIn, ZoomOut, Play, Pause, Square, Volume2, VolumeX } from "lucide-react";

interface TimelineControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSplit: () => void;
  zoomLevel: number;
  // Master transport controls
  isPlaying: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  isMuted: boolean;
  onMuteToggle: () => void;
}

export default function TimelineControls({ 
  onZoomIn, onZoomOut, onSplit, zoomLevel,
  isPlaying, onPlayPause, onStop, isMuted, onMuteToggle 
}: TimelineControlsProps) {
  return (
    <div className="flex items-center justify-between gap-2 p-3 bg-[var(--rian-surface)] border-b border-[var(--rian-border)] sticky top-0 z-20">
      
      {/* Master Transport Controls */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-[var(--rian-elevated)] rounded-lg p-2">
          <Button 
            size="sm" 
            onClick={onPlayPause} 
            className={`${isPlaying ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button 
            size="sm" 
            onClick={onStop} 
            className="bg-red-600 hover:bg-red-700 text-white"
            title="Stop"
          >
            <Square className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-gray-600 mx-1"></div>
          <Button 
            size="sm" 
            onClick={onMuteToggle}
            className={`${isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'} text-white`}
            title={isMuted ? "Unmute Timeline Audio" : "Mute Timeline Audio"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Timeline Tools */}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onZoomIn} title="Zoom In">
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button size="sm" onClick={onZoomOut} title="Zoom Out" disabled={zoomLevel <= 30}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-xs text-gray-400 px-2">Zoom: {zoomLevel}px/sec</span>
        <Button size="sm" onClick={onSplit} title="Split (Cut) Selected Region">
          <Scissors className="w-4 h-4" />
        </Button>
      </div>
      
    </div>
  );
}
