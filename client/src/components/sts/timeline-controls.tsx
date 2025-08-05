import { Button } from "@/components/ui/button";
import { Scissors, ZoomIn, ZoomOut } from "lucide-react";

interface TimelineControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSplit: () => void;
  zoomLevel: number;
}

export default function TimelineControls({ onZoomIn, onZoomOut, onSplit, zoomLevel }: TimelineControlsProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-[var(--rian-surface)] border-b border-[var(--rian-border)] sticky top-0 z-20">
      <Button size="sm" onClick={onZoomIn} title="Zoom In">
        <ZoomIn className="w-4 h-4" />
      </Button>
      <Button size="sm" onClick={onZoomOut} title="Zoom Out" disabled={zoomLevel <= 1}>
        <ZoomOut className="w-4 h-4" />
      </Button>
      <span className="text-xs text-gray-400 px-2">Zoom: {zoomLevel.toFixed(2)}x</span>
      <Button size="sm" onClick={onSplit} title="Split (Cut) Selected Region">
        <Scissors className="w-4 h-4" />
      </Button>
    </div>
  );
}
