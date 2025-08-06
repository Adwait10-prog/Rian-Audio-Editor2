import React, { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Plus, FolderOpen, FileAudio, FileVideo, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/debug-logger';

interface MediaImportPanelProps {
  onAudioUpload: (file: File, trackType: string, trackName: string) => void;
  onVideoUpload: (file: File) => void;
  onAddAudioTrack: (trackType: string, trackName: string) => void;
  speakerCount: number;
  isUploading?: boolean;
}

export default function MediaImportPanel({
  onAudioUpload,
  onVideoUpload,
  onAddAudioTrack,
  speakerCount,
  isUploading = false
}: MediaImportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();

  logger.debug('Media Import Panel', `Rendered with ${speakerCount} speakers`, { isUploading });

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    logger.info('Media Import Panel', `File selected: ${file.name} (${file.type}, ${file.size} bytes)`);

    // Validate file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      logger.warn('Media Import Panel', 'File too large', { size: file.size });
      toast({
        title: "File Too Large",
        description: "Please select a file smaller than 100MB.",
        variant: "destructive"
      });
      return;
    }

    if (file.type.startsWith('video/')) {
      logger.audioEvent('Media Import Panel', 'Video file upload started', undefined, { 
        name: file.name, 
        type: file.type, 
        size: file.size 
      });
      onVideoUpload(file);
    } else if (file.type.startsWith('audio/')) {
      logger.audioEvent('Media Import Panel', 'Audio file upload started', undefined, { 
        name: file.name, 
        type: file.type, 
        size: file.size 
      });
      onAudioUpload(file, 'source', 'Source Audio');
    } else {
      logger.warn('Media Import Panel', 'Unsupported file type', { type: file.type });
      toast({
        title: "Unsupported File Type",
        description: "Please select an audio or video file.",
        variant: "destructive"
      });
    }
  }, [onAudioUpload, onVideoUpload, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    
    const files = e.dataTransfer?.files;
    if (files) {
      logger.debug('Media Import Panel', 'Files dropped', { count: files.length });
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  const handleImportClick = useCallback(() => {
    logger.debug('Media Import Panel', 'Import button clicked');
    fileInputRef.current?.click();
  }, []);

  const handleVideoImportClick = useCallback(() => {
    logger.debug('Media Import Panel', 'Video import button clicked');
    videoInputRef.current?.click();
  }, []);

  const handleAddSpeakerTrack = useCallback(() => {
    const trackName = `Speaker ${speakerCount + 1}`;
    logger.debug('Media Import Panel', `Adding speaker track: ${trackName}`);
    onAddAudioTrack('speaker', trackName);
  }, [onAddAudioTrack, speakerCount]);

  const supportedFormats = [
    'MP3', 'WAV', 'FLAC', 'AAC', 'OGG',
    'MP4', 'MOV', 'AVI', 'MKV', 'WebM'
  ];

  return (
    <div className="w-64 bg-[var(--rian-surface)] border-r border-[var(--rian-border)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[var(--rian-border)]">
        <h2 className="text-lg font-semibold text-white flex items-center">
          <FolderOpen className="w-5 h-5 mr-2" />
          Media Pool
        </h2>
      </div>
      
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Main Import Area */}
        <div 
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
            dragOver 
              ? 'border-blue-400 bg-blue-900/20' 
              : 'border-gray-600 hover:border-[var(--rian-accent)]'
          } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleImportClick}
        >
          {isUploading ? (
            <div className="space-y-3">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-blue-400">Uploading...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <Upload className="w-8 h-8 mx-auto text-gray-400" />
              <div>
                <p className="text-white font-medium">Import Media</p>
                <p className="text-xs text-gray-400 mt-1">
                  Click or drag files here
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <Button 
            onClick={handleVideoImportClick}
            disabled={isUploading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center space-x-2"
          >
            <FileVideo className="w-4 h-4" />
            <span>Import Video</span>
          </Button>

          <Button 
            onClick={handleImportClick}
            disabled={isUploading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center space-x-2"
          >
            <FileAudio className="w-4 h-4" />
            <span>Import Audio</span>
          </Button>

          <Button 
            onClick={handleAddSpeakerTrack}
            disabled={isUploading}
            className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Audio Track</span>
          </Button>
        </div>

        {/* Supported Formats */}
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
          <h3 className="text-sm font-medium text-white mb-2 flex items-center">
            <AlertCircle className="w-4 h-4 mr-1 text-blue-400" />
            Supported Formats
          </h3>
          <div className="grid grid-cols-3 gap-1 text-xs">
            {supportedFormats.map((format) => (
              <span 
                key={format} 
                className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-center"
              >
                {format}
              </span>
            ))}
          </div>
        </div>

        {/* Current Status */}
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
          <h3 className="text-sm font-medium text-white mb-2">Project Status</h3>
          <div className="space-y-1 text-xs text-gray-400">
            <div className="flex justify-between">
              <span>Speaker Tracks:</span>
              <span className="text-blue-400">{speakerCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span className={isUploading ? "text-yellow-400" : "text-green-400"}>
                {isUploading ? "Uploading..." : "Ready"}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Voice Profiles Section */}
      <div className="mt-auto p-4 border-t border-[var(--rian-border)]">
        <h3 className="text-sm font-medium text-white mb-2 flex items-center">
          👤 Voice Profiles
        </h3>
        <p className="text-xs text-gray-400">No voice profiles loaded</p>
        <Button 
          size="sm" 
          variant="outline" 
          className="w-full mt-2 text-gray-400 border-gray-600 hover:bg-gray-700"
        >
          Import Profiles
        </Button>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,video/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />
      
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />
    </div>
  );
}