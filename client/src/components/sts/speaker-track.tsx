import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, Square, VolumeX, Edit, Bot } from "lucide-react";
import Waveform from "./waveform";
import type { AudioTrack as AudioTrackType, VoiceClone } from "@shared/schema";

interface SpeakerTrackProps {
  track: AudioTrackType;
  voiceClones: VoiceClone[];
  onContextMenu: (event: React.MouseEvent, trackId: number) => void;
  onPlay: () => void;
  onStop: () => void;
  onMute: () => void;
  onSTSGenerate: () => void;
  onNameEdit: () => void;
  onVoiceChange: (voiceCloneId: number) => void;
  onFileUpload: (file: File) => void;
}

export default function SpeakerTrack({
  track,
  voiceClones,
  onContextMenu,
  onPlay,
  onStop,
  onMute,
  onSTSGenerate,
  onNameEdit,
  onVoiceChange,
  onFileUpload
}: SpeakerTrackProps) {
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
            <div className="flex items-center space-x-2">
              <h3 className="font-medium text-white">{track.trackName}</h3>
              <Button
                onClick={onNameEdit}
                variant="ghost"
                size="sm"
                className="text-[var(--rian-accent)] hover:text-blue-400 transition-colors p-1"
              >
                <Edit className="w-3 h-3" />
              </Button>
            </div>
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
              <Button
                onClick={onSTSGenerate}
                className="w-8 h-8 rounded bg-[var(--rian-accent)] hover:bg-blue-600 flex items-center justify-center transition-colors"
                title="Generate STS"
              >
                <Bot className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Voice Selection */}
          <div className="mb-3">
            <label className="block text-xs text-gray-400 mb-1">Voice Clone</label>
            <Select
              value={track.voiceClone || ""}
              onValueChange={(value) => onVoiceChange(parseInt(value))}
            >
              <SelectTrigger className="w-full rian-elevated border rian-border rounded px-3 py-2 text-sm text-white">
                <SelectValue placeholder="Select Voice..." />
              </SelectTrigger>
              <SelectContent className="rian-surface rian-border">
                {voiceClones.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id.toString()}>
                    {voice.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Right Waveform Area */}
        <div className="flex-1 p-4">
          {track.audioFile ? (
            <Waveform
              isActive={true}
              onContextMenu={(event) => onContextMenu(event, track.id)}
            />
          ) : (
            <div 
              className="waveform-container border-2 border-dashed rian-border rounded-lg h-16 flex items-center justify-center cursor-pointer hover:border-[var(--rian-accent)] transition-colors"
              onClick={handleFileClick}
            >
              <div className="text-center text-gray-500">
                <div className="text-xl mb-2">📁</div>
                <p className="text-sm">Drop audio file or click to upload</p>
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
