import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, VolumeX } from "lucide-react";
import WaveSurfer from 'wavesurfer.js';
import 'wavesurfer.js/dist/wavesurfer.css';
import type { AudioTrack as AudioTrackType } from "@shared/schema";

interface AudioTrackProps {
  track: AudioTrackType;
  onContextMenu: (event: React.MouseEvent, trackId: number) => void;
  onPlay: () => void;
  onStop: () => void;
  onMute: () => void;
  waveformContainerId: string;
}

export default function AudioTrack({
  track,
  onContextMenu,
  onPlay,
  onStop,
  onMute,
  waveformContainerId
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

  // Log audio URL for debugging
  const audioUrl = track.audioFile ? 
    (track.audioFile.startsWith('http') || track.audioFile.startsWith('/') ? 
      track.audioFile : 
      `/uploads/${track.audioFile}`) : 
    undefined;
    
  console.log(`AudioTrack [${track.trackName}]:`, { 
    track, 
    audioUrl,
    hasAudioFile: !!track.audioFile 
  });

  useEffect(() => {
    if (!audioUrl || !waveformContainerId) return;
    let wavesurfer: WaveSurfer | null = null;
    // Clean up previous
    const container = document.getElementById(waveformContainerId);
    if (container) {
      container.innerHTML = '';
      wavesurfer = WaveSurfer.create({
        container: `#${waveformContainerId}`,
        waveColor: '#4fd1c5',
        progressColor: '#2c7a7b',
        height: 48,
        responsive: true
      });
      wavesurfer.load(audioUrl);
    }
    return () => {
      if (wavesurfer) wavesurfer.destroy();
    };
  }, [audioUrl, waveformContainerId]);

  return (
    <div className="rian-surface rounded-lg border rian-border track-row">
      <div className="flex items-center">
        {/* Left Control Panel */}
        <div className="w-60 p-4 border-r rian-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-white">{track.trackName} {track.audioFile ? '🎵' : '🔇'}</h3>
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
          <div className="relative">
            <Waveform
              isActive={!!track.audioFile}
              audioUrl={audioUrl}
              onContextMenu={(event) => onContextMenu(event, track.id)}
            />
            {!track.audioFile && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                No audio file
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
