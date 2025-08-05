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

interface SpeakerTrackProps {
  track: any;
  voiceClones: any[];
  onContextMenu: (event: React.MouseEvent, trackId: number) => void;
  onPlay: () => void;
  onStop: () => void;
  onMute: () => void;
  onSTSGenerate: () => void;
  onNameEdit: () => void;
  onVoiceChange: (voiceCloneId: number) => void;
  onFileUpload: (file: File) => void;
  zoom: number;
  duration: number;
  setZoom: (z: number) => void;
  currentTime: number;
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
  onFileUpload,
  zoom,
  duration,
  setZoom,
  currentTime
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
    <div className="rian-surface rounded-lg border rian-border track-row w-full relative">
      <div className="flex items-stretch w-full">
        {/* Fixed Left Control Panel */}
        <div className="w-60 p-4 border-r rian-border bg-[var(--rian-surface)] flex-shrink-0 z-20 sticky left-0">
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
                className="w-8 h-8 rounded bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                title="Generate Speech-to-Speech"
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
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{voice.name}</span>
                      <span className="text-xs text-gray-400 capitalize">{voice.voiceType}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Scrollable Right Waveform Area */}
        <div className="flex-1 p-4">
          {track.audioFile ? (
            <div
              className="waveform-zoom-area"
              style={{ width: `${(duration || 1) * (zoom || 100)}px`, minWidth: 300 }}
            >
              <Waveform
                data={track.waveformData as number[] || []}
                isActive={true}
                audioUrl={track.audioFile ? (track.audioFile.startsWith('http') || track.audioFile.startsWith('/') ? track.audioFile : `/uploads/${track.audioFile}`) : undefined}
                onContextMenu={(event) => onContextMenu(event, track.id)}
                zoom={zoom}
                setZoom={setZoom}
                currentTime={currentTime}
                onSelectionSTS={(start: number, end: number) => {
                  console.log(`Generate STS for selection: ${start} - ${end}`);
                  onSTSGenerate();
                }}
                onTextToSpeech={(text: string, start: number, end: number) => {
                  console.log(`Generate TTS for "${text}" at ${start} - ${end}`);
                  // Call TTS API endpoint with proper error handling
                  fetch('/api/generate-tts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      text,
                      voiceCloneId: track.voiceClone,
                      startTime: start,
                      endTime: end
                    })
                  }).then(res => res.json()).then(data => {
                    console.log('TTS generated:', data);
                  }).catch(error => {
                    console.error('TTS generation failed:', error);
                  });
                }}
              />
            </div>
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
