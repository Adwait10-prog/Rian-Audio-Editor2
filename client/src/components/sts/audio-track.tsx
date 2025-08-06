import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, VolumeX, Loader2 } from "lucide-react";
import WaveSurfer from 'wavesurfer.js';
import { audioService, type WaveformData } from "@/lib/audio-service";
import type { AudioTrack as AudioTrackType } from "@shared/schema";

interface AudioTrackProps {
  track: AudioTrackType;
  onContextMenu: (event: React.MouseEvent, trackId: number) => void;
  onPlay: () => void;
  onStop: () => void;
  onMute: () => void;
  onFileUpload: (file: File) => void;
  zoom: number;
  duration: number;
  setZoom: (z: number) => void;
  currentTime: number;
  waveformContainerId: string;
}

export default function AudioTrack({
  track,
  onContextMenu,
  onPlay,
  onStop,
  onMute,
  onFileUpload,
  zoom,
  duration,
  setZoom,
  currentTime,
  waveformContainerId
}: AudioTrackProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const audioUrl = track.audioFile ? audioService.getAudioUrl(track.audioFile) : undefined;

  // Initialize wavesurfer when the component mounts or when the audio URL changes
  useEffect(() => {
    if (!audioUrl || !waveformContainerId) return;

    // Clean up previous instance if it exists
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }

    const container = document.getElementById(waveformContainerId);
    if (!container) return;

    // Clear any existing content
    container.innerHTML = '';

    // Create new wavesurfer instance
    const wavesurfer = WaveSurfer.create({
      container: `#${waveformContainerId}`,
      waveColor: '#4fd1c5',
      progressColor: '#2c7a7b',
      height: 48,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      cursorWidth: 1,
      cursorColor: '#fff',
      hideScrollbar: true,
      normalize: true,
    } as any); // Using type assertion to bypass WaveSurfer type issues

    // Load audio file
    wavesurfer.load(audioUrl);
    wavesurferRef.current = wavesurfer;

    // Set up event listeners
    wavesurfer.on('play', () => {
      setIsPlaying(true);
      onPlay();
    });

    wavesurfer.on('pause', () => {
      setIsPlaying(false);
      onStop();
    });

    wavesurfer.on('finish', () => {
      setIsPlaying(false);
      onStop();
    });

    // Load waveform data if available
    const loadWaveformData = async () => {
      try {
        if (track.cacheKey) {
          const data = await audioService.getWaveform(track.id.toString());
          setWaveformData(data);
          
          // If we have waveform data, update the wavesurfer
          if (data.peaks && data.peaks.length > 0) {
            wavesurfer.zoom(1);
          }
        }
      } catch (error) {
        console.error('Failed to load waveform data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWaveformData();

    // Clean up on unmount
    return () => {
      wavesurfer.unAll();
      wavesurfer.destroy();
      wavesurferRef.current = null;
    };
  }, [audioUrl, waveformContainerId, track.id, track.cacheKey]);

  // Handle drag over for file upload
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  // Handle drop for file upload
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      onFileUpload(files[0]);
    }
  };

  // Handle play/pause
  const handlePlay = () => {
    if (!wavesurferRef.current) return;
    
    if (isPlaying) {
      wavesurferRef.current.pause();
    } else {
      wavesurferRef.current.play();
    }
  };

  // Handle stop
  const handleStop = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.stop();
      setIsPlaying(false);
      onStop();
    }
  };

  // Handle mute/unmute
  const handleMute = () => {
    if (wavesurferRef.current) {
      const newMutedState = !isMuted;
      wavesurferRef.current.setMuted(newMutedState);
      setIsMuted(newMutedState);
      onMute();
    }
  };

  // Update zoom when the zoom prop changes
  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.zoom(zoom);
    }
  }, [zoom]);

  // Update current time when it changes
  useEffect(() => {
    if (wavesurferRef.current && currentTime !== undefined) {
      wavesurferRef.current.seekTo(currentTime / duration);
    }
  }, [currentTime, duration]);

  return (
    <div className="rian-surface rounded-lg border rian-border track-row relative">
      <div className="flex items-stretch">
        {/* Fixed Left Control Panel */}
        <div className="w-60 p-4 border-r rian-border bg-[var(--rian-surface)] flex-shrink-0 z-20 sticky left-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-white">{track.trackName} {track.audioFile ? '🎵' : '🔇'}</h3>
            <div className="flex items-center space-x-1">
              <Button
                onClick={handlePlay}
                className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
                  isPlaying 
                    ? 'bg-[var(--rian-warning)] hover:bg-yellow-600' 
                    : 'bg-[var(--rian-primary)] hover:bg-[var(--rian-primary-dark)]'
                }`}
                size="icon"
                disabled={!track.audioFile || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
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
        <div className="flex-1 p-4 overflow-x-auto">
          <div
            className="waveform-zoom-area"
            style={{ width: `${(duration || 1) * (zoom || 100)}px`, minWidth: 300 }}
          >
            <div 
              className="w-full h-12 bg-[var(--rian-surface-light)] rounded overflow-hidden"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => audioUrl && handlePlay()}
            >
              <div id={waveformContainerId} className="w-full h-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
