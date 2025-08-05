import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Scissors } from "lucide-react";

interface WaveformProps {
  data?: number[];
  isActive?: boolean;
  audioUrl?: string;
  height?: number;
  onContextMenu?: (event: React.MouseEvent) => void;
  onSelectionSTS?: (startTime: number, endTime: number) => void;
  onTextToSpeech?: (text: string, startTime: number, endTime: number) => void;
}

export default function Waveform({ 
  data = [], 
  isActive = false, 
  audioUrl,
  height = 60,
  onContextMenu,
  onSelectionSTS,
  onTextToSpeech
}: WaveformProps) {
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
          className="waveform-active rounded-lg overflow-hidden cursor-crosshair"
          style={{ height }}
          onContextMenu={onContextMenu}
        >
          <canvas
            ref={canvasRef}
            width={600}
            height={height}
            className="w-full h-full"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          />
        </div>
        
        {/* Selection Controls */}
        {selectedRegion && (
          <div className="absolute top-2 right-2 flex space-x-2">
            <Button
              size="sm"
              onClick={handleSTSGenerate}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
              title="Generate STS for selection"
            >
              <Bot className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              onClick={handleCutWaveform}
              className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg"
              title="Add text to selection"
            >
              <Scissors className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Text-to-Speech Dialog */}
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
