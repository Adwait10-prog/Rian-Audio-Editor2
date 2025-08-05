import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Scissors, Play, Pause } from "lucide-react";
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';

interface WaveformProps {
  data?: number[];
  isActive?: boolean;
  audioUrl?: string;
  height?: number;
  onContextMenu?: (event: React.MouseEvent) => void;
  onSelectionSTS?: (startTime: number, endTime: number) => void;
  onTextToSpeech?: (text: string, startTime: number, endTime: number) => void;
  zoom: number;
  setZoom?: (z: number) => void;
  currentTime?: number;
}

export default function Waveform({ 
  data = [], 
  isActive = false, 
  audioUrl,
  height = 60,
  onContextMenu,
  onSelectionSTS,
  onTextToSpeech,
  zoom,
  setZoom,
  currentTime
}: WaveformProps) {
  // Only declare these once
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer|null>(null);
  const waveformScrollRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ready, setReady] = useState(false); // Only declare ONCE
  const [duration, setDuration] = useState(1);

  // Sync currentTime with WaveSurfer events (fix 'seek' type error)
  // No-op: currentTime is now a prop, so we do not update it here.
  useEffect(() => {
    // Optionally, you can emit an event or call a callback if you want to notify parent of playback position.
  }, [ready]);

  // Listen for duration
  useEffect(() => {
    if (wavesurferRef.current) {
      const ws = wavesurferRef.current;
      const setWSduration = () => setDuration(ws.getDuration() || 1);
      ws.on('ready', setWSduration);
      return () => ws.un('ready', setWSduration);
    }
  }, [audioUrl, zoom]);

  // Keyboard split handler (Cmd/Ctrl+B)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        // Perform split at currentTime for this waveform
        if (wavesurferRef.current) {
          // Visual feedback: add a region at playhead
          const ws = wavesurferRef.current as any;
          ws.addRegion && ws.addRegion({
            start: currentTime,
            end: currentTime + 0.01,
            color: 'rgba(250, 204, 21, 0.7)'
          });
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentTime]);


  useEffect(() => {
    let isMounted = true;
    let ws: WaveSurfer | null = null;
    
    if (!audioUrl || !waveformRef.current) return;
    
    // Cleanup previous instance
    if (wavesurferRef.current) {
      try {
        wavesurferRef.current.unAll && wavesurferRef.current.unAll();
        wavesurferRef.current.destroy();
      } catch (error) {
        console.warn('Error destroying previous WaveSurfer instance:', error);
      }
      wavesurferRef.current = null;
    }
    
    try {
      ws = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#60a5fa',
        progressColor: '#2563eb',
        height: height,
        barWidth: 2,
        cursorColor: '#facc15',
        interact: true,
        hideScrollbar: true,
        minPxPerSec: zoom, // use px per sec for zoom
        plugins: [
          RegionsPlugin.create({
            dragSelection: true,
          })
        ]
      });
      
      wavesurferRef.current = ws;
      
      const handleReady = () => { 
        if (isMounted && wavesurferRef.current) {
          setReady(true); 
        }
      };
      
      const handleFinish = () => { 
        if (isMounted && wavesurferRef.current) {
          setIsPlaying(false); 
        }
      };
      
      ws.on('ready', handleReady);
      ws.on('finish', handleFinish);
      
      // Load audio with error handling
      ws.load(audioUrl).catch((error) => {
        console.warn('Error loading audio:', error);
      });
      
    } catch (error) {
      console.warn('Error creating WaveSurfer instance:', error);
    }
    
    return () => {
      isMounted = false;
      if (ws) {
        try {
          ws.unAll && ws.unAll();
          ws.destroy();
        } catch (error) {
          console.warn('Error cleaning up WaveSurfer instance:', error);
        }
      }
      wavesurferRef.current = null;
    };
  }, [audioUrl, height, zoom]);

  const handlePlayPause = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
      setIsPlaying(wavesurferRef.current.isPlaying());
    }
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [showTextDialog, setShowTextDialog] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<{ start: number; end: number } | null>(null);

  // Generate sample waveform data if none provided
  const generateSampleData = (length: number = 100) => {
    return Array.from({ length }, (_, i) => {
      const frequency = 0.1;
      const amplitude = Math.sin(i * frequency) * 0.5 + 0.5;
      return amplitude * (0.3 + Math.random() * 0.7);
    });
  };

  const [waveformData, setWaveformData] = useState<number[]>(data.length > 0 ? data : generateSampleData());

  // Load and decode audio to generate waveform
  useEffect(() => {
    if (!audioUrl) return;
    const fetchAndDecode = async () => {
      try {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const rawData = audioBuffer.getChannelData(0);
        const samples = 200;
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData = Array(samples).fill(0).map((_, i) => {
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[(i * blockSize) + j]);
          }
          return sum / blockSize;
        });
        setWaveformData(filteredData);
      } catch (err) {
        setWaveformData(generateSampleData());
      }
    };
    fetchAndDecode();
  }, [audioUrl]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const normalizedX = x / canvas.width;
    
    setIsSelecting(true);
    setSelection({ start: normalizedX, end: normalizedX });
  }, [isActive]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSelecting || !selection) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const normalizedX = x / canvas.width;
    
    setSelection({ ...selection, end: normalizedX });
  }, [isSelecting, selection]);

  const handleMouseUp = useCallback(() => {
    if (!isSelecting || !selection) return;
    setIsSelecting(false);
    
    const start = Math.min(selection.start, selection.end);
    const end = Math.max(selection.start, selection.end);
    
    // Only create selection if it's meaningful (more than 1% of waveform)
    if (end - start > 0.01) {
      setSelectedRegion({ start, end });
    } else {
      setSelection(null);
    }
  }, [isSelecting, selection]);

  const handleCutWaveform = () => {
    if (!selectedRegion) return;
    setShowTextDialog(true);
  };

  const handleSTSGenerate = () => {
    if (!selectedRegion) return;
    onSelectionSTS?.(selectedRegion.start, selectedRegion.end);
    setSelectedRegion(null);
    setSelection(null);
  };

  const handleTextToSpeechGenerate = () => {
    if (!selectedRegion || !textInput.trim()) return;
    onTextToSpeech?.(textInput, selectedRegion.start, selectedRegion.end);
    setShowTextDialog(false);
    setTextInput("");
    setSelectedRegion(null);
    setSelection(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height: canvasHeight } = canvas;
    ctx.clearRect(0, 0, width, canvasHeight);

    if (!isActive) {
      // Draw placeholder pattern for inactive waveforms
      ctx.fillStyle = 'rgba(75, 85, 99, 0.3)';
      for (let i = 0; i < width; i += 8) {
        for (let j = 0; j < canvasHeight; j += 8) {
          if ((i + j) % 16 === 0) {
            ctx.fillRect(i, j, 4, 4);
          }
        }
      }
      return;
    }

    // Draw active waveform
    const barWidth = Math.max(1, width / waveformData.length);
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, 'hsl(207, 90%, 54%)');
    gradient.addColorStop(1, 'hsl(207, 90%, 45%)');
    
    ctx.fillStyle = gradient;

    waveformData.forEach((value, index) => {
      const barHeight = value * (canvasHeight - 10);
      const x = index * barWidth;
      const y = (canvasHeight - barHeight) / 2;
      
      // Check if this bar is in the selection
      const barStart = index / waveformData.length;
      const barEnd = (index + 1) / waveformData.length;
      const isInSelection = selection && (
        (barStart >= Math.min(selection.start, selection.end) && barStart <= Math.max(selection.start, selection.end)) ||
        (barEnd >= Math.min(selection.start, selection.end) && barEnd <= Math.max(selection.start, selection.end))
      );
      
      const isInFinalSelection = selectedRegion && (
        (barStart >= selectedRegion.start && barStart <= selectedRegion.end) ||
        (barEnd >= selectedRegion.start && barEnd <= selectedRegion.end)
      );
      
      if (isInFinalSelection) {
        ctx.fillStyle = 'hsl(45, 90%, 60%)'; // Yellow for final selection
      } else if (isInSelection) {
        ctx.fillStyle = 'hsl(120, 90%, 60%)'; // Green for current selection
      } else {
        ctx.fillStyle = gradient;
      }
      
      ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
    });
  }, [waveformData, isActive, selection, selectedRegion]);

  if (!isActive) {
    return (
      <div 
        className="waveform-container border-2 border-dashed rian-border rounded-lg flex items-center justify-center text-center text-gray-500 cursor-pointer hover:border-[var(--rian-accent)] transition-colors"
        style={{ height }}
        onContextMenu={onContextMenu}
      >
        <div>
          <div className="text-xl mb-2">📁</div>
          <p className="text-sm">Drop audio file or click to upload</p>
        </div>
      </div>
    );
  }



  return (
    <>
      <div className="relative">
        <div 
          ref={waveformScrollRef}
          className="waveform-scroll rounded-lg overflow-x-auto overflow-y-hidden"
          style={{ height, width: '100%', position: 'relative', background: 'transparent' }}
        >
          <div
            ref={waveformRef}
            style={{
              width: `${duration * zoom}px`,
              height,
              minWidth: '100%',
              position: 'relative',
              overflow: 'hidden',
              background: 'transparent',
            }}
          />
          {/* Playhead (red line) */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: `${((currentTime ?? 0) / (duration || 1)) * (duration * zoom)}px`,
              width: 2,
              height: '100%',
              background: 'red',
              zIndex: 10,
              pointerEvents: 'none',
              transition: 'left 0.03s linear',
            }}
          />
        </div>
        <div className="absolute top-2 left-2 flex space-x-2 z-10">
          <Button
            size="sm"
            onClick={handlePlayPause}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
            title={isPlaying ? 'Pause' : 'Play'}
            disabled={!ready}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Text-to-Speech Dialog (kept for future) */}
      <Dialog open={showTextDialog} onOpenChange={setShowTextDialog}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Add Text for Speech Generation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Enter text to generate speech for the selected region:
              </label>
              <Textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type the text you want to convert to speech..."
                className="bg-gray-700 border-gray-600 text-white min-h-[100px]"
                autoFocus
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowTextDialog(false);
                setTextInput("");
              }}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleTextToSpeechGenerate}
              disabled={!textInput.trim()}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Bot className="w-4 h-4 mr-2" />
              Generate Speech
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
