import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Scissors } from "lucide-react";
import WaveSurfer from "wavesurfer.js";

interface WaveformProps {
  audioUrl?: string;
  data?: number[];
  isActive?: boolean;
  height?: number;
  onContextMenu?: (event: React.MouseEvent) => void;
  onSelectionSTS?: (startTime: number, endTime: number) => void;
  onTextToSpeech?: (text: string, startTime: number, endTime: number) => void;
}

export default function Waveform({ 
  audioUrl,
  data = [], 
  isActive = false, 
  height = 60,
  onContextMenu,
  onSelectionSTS,
  onTextToSpeech
}: WaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [showTextDialog, setShowTextDialog] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<{ start: number; end: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current || !isActive) return;

    // Clean up previous instance
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#4F46E5',
      progressColor: '#818CF8',
      cursorColor: '#C7D2FE',
      barWidth: 2,
      barRadius: 1,
      responsive: true,
      height: height,
      normalize: true,
      backend: 'WebAudio',
      barGap: 1,
    });

    wavesurferRef.current = wavesurfer;

    // Load audio if URL provided
    if (audioUrl) {
      setIsLoading(true);
      wavesurfer.load(audioUrl);
      
      wavesurfer.on('ready', () => {
        setIsLoading(false);
      });

      wavesurfer.on('error', (error) => {
        console.error('WaveSurfer error:', error);
        setIsLoading(false);
        // Generate fallback waveform data
        generateFallbackWaveform(wavesurfer);
      });
    } else if (data.length > 0) {
      // Use provided data to generate peaks
      generateWaveformFromData(wavesurfer, data);
    } else {
      // Generate sample waveform
      generateFallbackWaveform(wavesurfer);
    }

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
    };
  }, [audioUrl, data, height, isActive]);

  const generateFallbackWaveform = (wavesurfer: WaveSurfer) => {
    const sampleData = Array.from({ length: 200 }, (_, i) => {
      const frequency = 0.05;
      const amplitude = Math.sin(i * frequency) * 0.5 + 0.5;
      return amplitude * (0.3 + Math.random() * 0.7);
    });
    generateWaveformFromData(wavesurfer, sampleData);
  };

  const generateWaveformFromData = (wavesurfer: WaveSurfer, waveData: number[]) => {
    // Create a silent audio buffer and draw the waveform visually
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const buffer = audioContext.createBuffer(1, waveData.length * 100, 44100);
    const channelData = buffer.getChannelData(0);
    
    // Fill with silence but draw the waveform visually
    for (let i = 0; i < channelData.length; i++) {
      channelData[i] = 0;
    }
    
    wavesurfer.loadDecodedBuffer(buffer);
  };

  const handleSTSClick = useCallback(() => {
    if (!selection) return;
    const start = Math.min(selection.start, selection.end);
    const end = Math.max(selection.start, selection.end);
    onSelectionSTS?.(start, end);
    setSelection(null);
    setSelectedRegion(null);
  }, [selection, onSelectionSTS]);

  const handleTextToSpeechClick = useCallback(() => {
    if (!selection) return;
    const start = Math.min(selection.start, selection.end);
    const end = Math.max(selection.start, selection.end);
    setSelectedRegion({ start, end });
    setShowTextDialog(true);
  }, [selection]);

  const handleTTSSubmit = useCallback(() => {
    if (!selectedRegion || !textInput.trim()) return;
    onTextToSpeech?.(textInput, selectedRegion.start, selectedRegion.end);
    setShowTextDialog(false);
    setTextInput("");
    setSelectedRegion(null);
    setSelection(null);
  }, [selectedRegion, textInput, onTextToSpeech]);

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
    <div className="relative">
      <div 
        ref={containerRef}
        className="w-full rounded border"
        style={{ height: `${height}px` }}
        onContextMenu={onContextMenu}
      />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded">
          <div className="text-white text-sm">Loading waveform...</div>
        </div>
      )}
      
      {/* Selection indicators and controls */}
      {selection && isActive && (
        <div className="absolute top-1 right-1 flex space-x-1">
          <Button
            onClick={handleSTSClick}
            className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded text-xs h-6"
            title="Generate STS for selection"
          >
            <Bot className="w-3 h-3" />
          </Button>
          <Button
            onClick={handleTextToSpeechClick}
            className="bg-green-600 hover:bg-green-700 text-white p-1 rounded text-xs h-6"
            title="Text to Speech for selection"
          >
            <Scissors className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Text to Speech Dialog */}
      <Dialog open={showTextDialog} onOpenChange={setShowTextDialog}>
        <DialogContent className="rian-surface rian-border">
          <DialogHeader>
            <DialogTitle>Generate Text-to-Speech</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Enter text to convert to speech:</label>
              <Textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type your text here..."
                className="mt-2 rian-surface rian-border"
                rows={4}
              />
            </div>
            {selectedRegion && (
              <div className="text-sm text-gray-400">
                Selected region: {selectedRegion.start.toFixed(2)}s - {selectedRegion.end.toFixed(2)}s
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowTextDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleTTSSubmit} className="bg-blue-600 hover:bg-blue-700">
                Generate Speech
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}