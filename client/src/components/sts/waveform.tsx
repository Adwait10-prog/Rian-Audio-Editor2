import { useEffect, useRef } from "react";

interface WaveformProps {
  data?: number[];
  isActive?: boolean;
  height?: number;
  onContextMenu?: (event: React.MouseEvent) => void;
}

export default function Waveform({ 
  data = [], 
  isActive = false, 
  height = 60,
  onContextMenu 
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate sample waveform data if none provided
  const generateSampleData = (length: number = 100) => {
    return Array.from({ length }, (_, i) => {
      const frequency = 0.1;
      const amplitude = Math.sin(i * frequency) * 0.5 + 0.5;
      return amplitude * (0.3 + Math.random() * 0.7);
    });
  };

  const waveformData = data.length > 0 ? data : generateSampleData();

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
      
      ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
    });
  }, [waveformData, isActive]);

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
    <div 
      className="waveform-active rounded-lg overflow-hidden cursor-pointer"
      style={{ height }}
      onContextMenu={onContextMenu}
    >
      <canvas
        ref={canvasRef}
        width={600}
        height={height}
        className="w-full h-full"
      />
    </div>
  );
}
