import React, { useRef, useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, Volume2, VolumeX } from "lucide-react";

interface SimpleTimelineProps {
  videoFile?: string;
  audioUrl?: string;
  waveformData?: number[];
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

export default function SimpleTimeline({ 
  videoFile, 
  audioUrl, 
  waveformData, 
  zoom, 
  onZoomChange 
}: SimpleTimelineProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  
  // SIMPLE: Draw waveform from Rust peaks
  useEffect(() => {
    if (!waveformData || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = waveformData.length * 2; // 2px per peak
    const height = 80;
    
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    // Clear and draw waveform
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#60a5fa';
    
    const centerY = height / 2;
    waveformData.forEach((peak, i) => {
      const x = i * 2;
      const barHeight = peak * centerY * 0.8;
      
      // Draw symmetric bars
      ctx.fillRect(x, centerY - barHeight, 1, barHeight);
      ctx.fillRect(x, centerY, 1, barHeight);
    });
    
    console.log(`🌊 Waveform drawn: ${waveformData.length} peaks, ${width}px wide`);
  }, [waveformData]);
  
  // SIMPLE: Video sync
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isPlaying && video.paused) {
      video.play().catch(console.error);
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
  }, [isPlaying]);
  
  // SIMPLE: Update time from video
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video) {
      setCurrentTime(video.currentTime);
    }
  };
  
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
      video.volume = 0.8;
      console.log(`🎥 Video loaded: ${video.duration}s`);
    }
  };
  
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    console.log(`🎮 ${!isPlaying ? 'PLAY' : 'PAUSE'}`);
  };
  
  const toggleMute = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted);
    }
  };
  
  // Calculate playhead position
  const playheadPosition = duration > 0 ? (currentTime / duration) * (waveformData?.length * 2 || 800) : 0;
  
  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* MASTER CONTROLS */}
      <div className="flex items-center gap-4 p-4 bg-gray-800 border-b border-gray-700">
        <Button onClick={togglePlay} className={isPlaying ? 'bg-green-600' : 'bg-blue-600'}>
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button onClick={() => { setIsPlaying(false); setCurrentTime(0); }} className="bg-red-600">
          <Square className="w-4 h-4" />
        </Button>
        <Button onClick={toggleMute} className={isMuted ? 'bg-red-600' : 'bg-gray-600'}>
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </Button>
        <span className="text-sm">
          {Math.floor(currentTime)}s / {Math.floor(duration)}s
        </span>
      </div>
      
      <div className="flex-1 flex">
        {/* VIDEO PLAYER */}
        <div className="w-1/2 p-4">
          <div className="bg-black rounded-lg h-full flex items-center justify-center">
            {videoFile ? (
              <video
                ref={videoRef}
                src={videoFile.startsWith('/') ? videoFile : `/uploads/${videoFile}`}
                className="max-w-full max-h-full"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onClick={togglePlay}
              />
            ) : (
              <div className="text-gray-400">No video loaded</div>
            )}
          </div>
        </div>
        
        {/* TIMELINE */}
        <div className="w-1/2 p-4">
          <div className="bg-gray-800 rounded-lg h-full relative overflow-hidden">
            {/* TIME RULER */}
            <div className="h-8 bg-gray-700 border-b border-gray-600 relative">
              <div className="absolute inset-0 flex items-center px-2 text-xs text-gray-300">
                Timeline: {Math.floor(duration)}s
              </div>
              {/* Ruler playhead */}
              <div 
                className="absolute top-0 w-0.5 h-full bg-red-500"
                style={{ left: playheadPosition }}
              />
            </div>
            
            {/* WAVEFORM */}
            <div className="p-4 relative">
              <canvas
                ref={canvasRef}
                className="border border-gray-600 rounded bg-gray-900"
                style={{ width: '100%', height: '80px', objectFit: 'contain' }}
              />
              {/* Waveform playhead */}
              <div 
                className="absolute top-4 bottom-4 w-0.5 bg-red-500 pointer-events-none"
                style={{ left: playheadPosition + 16 /* padding */ }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}