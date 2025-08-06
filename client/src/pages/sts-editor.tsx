import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import MenuBar from "@/components/sts/menu-bar";
import TimelineControls from "@/components/sts/timeline-controls";
import TimelineRuler from "@/components/sts/timeline-ruler";
import VideoPlayer from "@/components/sts/video-player";
import AudioTrack from "@/components/sts/audio-track";
import SpeakerTrack from "@/components/sts/speaker-track";
import METrack from "@/components/sts/me-track";
import TrackSection from "@/components/sts/track-section";
import ContextMenu from "@/components/sts/context-menu";
import STSModal from "@/components/sts/sts-modal";
import EditSpeakerModal from "@/components/sts/edit-speaker-modal";
import MediaImportPanel from "@/components/sts/media-import-panel";
import ScrollableTimeline from "@/components/sts/scrollable-timeline";
import EnhancedWaveform from "@/components/sts/enhanced-waveform";
import { useGlobalPlayhead } from "@/hooks/useGlobalPlayhead";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/debug-logger";
import type { AudioTrack as AudioTrackType, VoiceClone } from "@shared/schema";
import type WaveSurfer from 'wavesurfer.js';

export default function STSEditor() {
  const [currentProject] = useState({ id: 1, name: "Sample Project" });
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; trackId?: number }>({
    visible: false,
    x: 0,
    y: 0
  });
  const [stsModal, setStsModal] = useState<{ visible: boolean; trackId?: number; timeRange?: { start: number; end: number } }>({
    visible: false
  });
  const [editSpeakerModal, setEditSpeakerModal] = useState<{ visible: boolean; trackId?: number; currentName?: string }>({
    visible: false
  });
  
  // Global playhead state using custom hook
  const [playheadState, playheadActions] = useGlobalPlayhead();
  
  const [viewSettings, setViewSettings] = useState({
    showVideo: true,
    showAudio: true,
    showME: true
  });
  
  const [masterMuted, setMasterMuted] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Initialize logger
  useEffect(() => {
    logger.info('STS Editor', 'Initializing audio editor interface');
  }, []);

  const { data: tracks = [], isLoading } = useQuery<AudioTrackType[]>({
    queryKey: ["/api/projects", currentProject.id, "tracks"],
    enabled: !!currentProject.id
  });

  const { data: voiceClones = [] } = useQuery<VoiceClone[]>({
    queryKey: ["/api/voice-clones"]
  });

  const { data: project } = useQuery<{ id: number; name: string; videoFile?: string; createdAt: string }>({
    queryKey: ["/api/projects", currentProject.id],
    enabled: !!currentProject.id
  });

  // Compute max duration from all tracks
  const computeMaxDuration = () => {
    let maxDur = 300; // Default 5 minutes
    
    // TODO: Add audio track durations when available
    tracks.forEach(track => {
      // If we had duration metadata, we'd use it here
    });
    
    return maxDur;
  };

  const maxDuration = computeMaxDuration();

  // Global event listeners for timeline interactions
  useEffect(() => {
    const handleZoomRequest = (e: CustomEvent) => {
      const { direction, focusTime, mouseX } = e.detail;
      const ZOOM_LEVELS = [30, 50, 80, 100, 150, 200, 300, 400, 600, 1000, 1500, 2000];
      const currentIndex = ZOOM_LEVELS.findIndex(z => z >= playheadState.zoom);
      
      let newZoom = playheadState.zoom;
      if (direction === 'out' && currentIndex > 0) {
        newZoom = ZOOM_LEVELS[currentIndex - 1];
      } else if (direction === 'in' && currentIndex < ZOOM_LEVELS.length - 1) {
        newZoom = ZOOM_LEVELS[currentIndex + 1];
      }
      
      if (newZoom !== playheadState.zoom) {
        logger.timelineEvent('STS Editor', `Zoom changed: ${playheadState.zoom} → ${newZoom}px/sec`);
        playheadActions.setZoom(newZoom);
      }
    };

    const handlePlayPause = () => {
      if (playheadState.isPlaying) {
        playheadActions.pause();
      } else {
        playheadActions.play();
      }
    };

    window.addEventListener('timeline-zoom-request', handleZoomRequest as EventListener);
    window.addEventListener('timeline-play-pause', handlePlayPause);

    return () => {
      window.removeEventListener('timeline-zoom-request', handleZoomRequest as EventListener);
      window.removeEventListener('timeline-play-pause', handlePlayPause);
    };
  }, [playheadState, playheadActions]);

  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        // Use full URL for Electron compatibility
        const baseUrl = window.location.origin;
        const response = await fetch(`${baseUrl}/api/upload`, {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Upload failed: ${response.status} - ${error}`);
        }
        
        const result = await response.json();
        console.log('Upload successful:', result);
        return result;
      } catch (error) {
        console.error('Upload error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", currentProject.id, "tracks"] });
    }
  });

  const createTrackMutation = useMutation({
    mutationFn: async (trackData: { trackType: string; trackName: string; audioFile?: string }) => {
      return apiRequest(`/api/projects/${currentProject.id}/tracks`, {
        method: 'POST',
        body: trackData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", currentProject.id, "tracks"] });
    }
  });

  const updateTrackMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<AudioTrackType> }) => {
      return apiRequest(`/api/tracks/${id}`, {
        method: 'PUT',
        body: updates
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", currentProject.id, "tracks"] });
    }
  });

  const deleteTrackMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/tracks/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", currentProject.id, "tracks"] });
    }
  });

  const generateSTSMutation = useMutation({
    mutationFn: async ({ trackId, voiceCloneId, timeRange }: { trackId: number; voiceCloneId: number; timeRange?: { start: number; end: number } }) => {
      return apiRequest("/api/generate-sts", {
        method: 'POST',
        body: { trackId, voiceCloneId, timeRange }
      });
    },
    onSuccess: (data) => {
      toast({
        title: "STS Generation Complete",
        description: "Speech-to-speech conversion has been completed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", currentProject.id, "tracks"] });
    }
  });

  const handleFileUpload = async (file: File, trackType: string, trackName: string) => {
    try {
      const uploadResult = await uploadFileMutation.mutateAsync(file);
      await createTrackMutation.mutateAsync({
        trackType,
        trackName,
        audioFile: uploadResult.filename
      });
      toast({
        title: "File Uploaded",
        description: `${trackName} has been uploaded successfully.`,
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload the file. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleVideoUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiRequest('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      // Update current project with video file
      await apiRequest(`/api/projects/${currentProject.id}`, {
        method: 'PUT',
        body: { videoFile: response.filename }
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/projects", currentProject.id] });
      toast({
        title: "Video Uploaded",
        description: "Video file has been uploaded successfully."
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload video file.",
        variant: "destructive"
      });
    }
  };

  // --- WAVEFORM STATE ---
  // Store waveform data for each track by trackId
  const [waveforms, setWaveforms] = useState<{ [trackId: number]: WaveSurfer | null }>({});

  // --- AUDIO EXTRACTED HANDLER (after FFmpeg) ---
  const handleAudioExtracted = async (audioUrl: string, waveformData?: number[]) => {
    logger.audioEvent('STS Editor', 'Audio extraction completed', undefined, { audioUrl, waveformPoints: waveformData?.length });
    
    try {
      // Create or update source audio track with extracted audio
      const sourceTrack = tracks.find((t) => t.trackType === 'source');
      const audioFileName = audioUrl?.replace('/uploads/', '') || undefined;
      
      const trackData = {
        audioFile: audioFileName,
        waveformData: waveformData || []
      };
      
      if (sourceTrack) {
        logger.debug('STS Editor', 'Updating existing source track', { trackId: sourceTrack.id });
        await updateTrackMutation.mutateAsync({ id: sourceTrack.id, updates: trackData });
      } else {
        logger.debug('STS Editor', 'Creating new source track');
        await createTrackMutation.mutateAsync({ 
          trackType: 'source', 
          trackName: 'Source Audio', 
          ...trackData
        });
      }
      
      toast({
        title: "✅ Audio Extracted Successfully",
        description: `Audio extracted with ${waveformData?.length || 0} waveform points`
      });
      
    } catch (error) {
      logger.error('STS Editor', 'Audio extraction handler failed', error);
      toast({ 
        title: "Audio Extract Failed", 
        description: "Could not save extracted audio to track.", 
        variant: "destructive" 
      });
    }
  };

  // --- GENERIC AUDIO UPLOAD HANDLER (for source & speakers) ---
  const handleTrackAudioUpload = async (file: File, track: any) => {
    try {
      // Upload file
      const uploadResult = await uploadFileMutation.mutateAsync(file);
      if (!uploadResult.filename) throw new Error('Upload failed');
      // Update track with new audio file
      await updateTrackMutation.mutateAsync({ id: track.id, updates: { audioFile: uploadResult.filename } });
      toast({ title: "Audio Uploaded", description: `${track.trackName} audio updated.` });
    } catch (error) {
      toast({ title: "Upload Failed", description: "Failed to upload audio.", variant: "destructive" });
    }
  };

  // --- SOURCE AUDIO UPLOAD HANDLER ---
  const handleSourceAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    // If video, extract audio via backend
    if (file.type.startsWith('video/')) {
      try {
        const uploadData = await uploadFileMutation.mutateAsync(file);
        if (!uploadData.filename) throw new Error('Video upload failed');
        // Call backend to extract audio
        const audioData = await apiRequest(`${window.location.origin}/api/extract-audio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: `uploads/${uploadData.filename}` })
        });
        if (!audioData.success) throw new Error(audioData.message || 'Audio extraction failed');
        await handleAudioExtracted(audioData.audioFile);
      } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    } else if (file.type.startsWith('audio/')) {
      // Directly upload audio to source track
      const sourceTrack = tracks.find((t) => t.trackType === 'source');
      if (sourceTrack) {
        await handleTrackAudioUpload(file, sourceTrack);
      } else {
        // If no source track, create one
        const uploadResult = await uploadFileMutation.mutateAsync(file);
        await createTrackMutation.mutateAsync({ trackType: 'source', trackName: 'Source Audio', audioFile: uploadResult.filename });
      }
      toast({ title: 'Success', description: 'Source audio updated.' });
    }
  };


  const handleContextMenu = (event: React.MouseEvent, trackId: number) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      trackId
    });
  };

  const handlePlayAll = () => {
    console.log('🎮 [STS Editor] Play button clicked:', {
      currentlyPlaying: playheadState.isPlaying,
      action: playheadState.isPlaying ? 'PAUSE' : 'PLAY'
    });
    
    logger.audioEvent('STS Editor', playheadState.isPlaying ? 'Stop all' : 'Play all');
    if (playheadState.isPlaying) {
      playheadActions.pause();
    } else {
      playheadActions.play();
    }
  };

  const handleStopAll = () => {
    logger.audioEvent('STS Editor', 'Stop all');
    playheadActions.stop();
  };

  const handleSpeakerNameEdit = (trackId: number, currentName: string) => {
    setEditSpeakerModal({
      visible: true,
      trackId,
      currentName
    });
  };

  const handleSTSGeneration = (trackId: number, timeRange?: { start: number; end: number }) => {
    setStsModal({
      visible: true,
      trackId,
      timeRange
    });
  };

  const sourceTrack = tracks.find((t) => t.trackType === 'source');
  const speakerTracks = tracks.filter((t) => t.trackType === 'speaker');
  const meTrack = tracks.find((t) => t.trackType === 'me');

  // Debug: Log track data to understand the structure
  useEffect(() => {
    if (sourceTrack) {
      console.log(`📊 [STS Editor] Source track data:`, {
        id: sourceTrack.id,
        audioFile: sourceTrack.audioFile,
        waveformDataType: typeof sourceTrack.waveformData,
        waveformDataLength: Array.isArray(sourceTrack.waveformData) ? sourceTrack.waveformData.length : 'not array',
        waveformDataSample: Array.isArray(sourceTrack.waveformData) ? sourceTrack.waveformData.slice(0, 5) : sourceTrack.waveformData
      });
    }
  }, [sourceTrack]);

  if (isLoading) {
    return (
      <div className="h-screen bg-[var(--rian-dark)] flex items-center justify-center">
        <div className="text-white">Loading STS Editor...</div>
      </div>
    );
  }

  // --- PROFESSIONAL TIMELINE CONTROLS ---
  const handleZoomIn = () => {
    const ZOOM_LEVELS = [30, 50, 80, 100, 150, 200, 300, 400, 600, 1000, 1500, 2000];
    const currentIndex = ZOOM_LEVELS.findIndex(z => z >= playheadState.zoom);
    if (currentIndex < ZOOM_LEVELS.length - 1) {
      const newZoom = ZOOM_LEVELS[currentIndex + 1];
      logger.timelineEvent('STS Editor', `Zoom in: ${playheadState.zoom} → ${newZoom}px/sec`);
      playheadActions.setZoom(newZoom);
    }
  };
  
  const handleZoomOut = () => {
    const ZOOM_LEVELS = [30, 50, 80, 100, 150, 200, 300, 400, 600, 1000, 1500, 2000];
    const currentIndex = ZOOM_LEVELS.findIndex(z => z >= playheadState.zoom);
    if (currentIndex > 0) {
      const newZoom = ZOOM_LEVELS[currentIndex - 1];
      logger.timelineEvent('STS Editor', `Zoom out: ${playheadState.zoom} → ${newZoom}px/sec`);
      playheadActions.setZoom(newZoom);
    }
  };
  
  const handleSplit = () => {
    logger.timelineEvent('STS Editor', `Split at ${playheadState.currentTime.toFixed(3)}s`);
    // TODO: Implement split functionality
    toast({
      title: "Split Tool",
      description: `Split at ${playheadState.currentTime.toFixed(2)}s - Feature coming soon!`
    });
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--rian-dark)] text-white overflow-hidden">
      {/* Menu Bar */}
      <MenuBar
        onPlayAll={handlePlayAll}
        onStopAll={handleStopAll}
        isPlaying={playheadState.isPlaying}
        onFileUpload={handleFileUpload}
        onVideoUpload={handleVideoUpload}
        onNavigateToProjects={() => setLocation('/')}
        viewSettings={viewSettings}
        onViewSettingsChange={setViewSettings}
      />
      
      {/* Master Timeline Controls */}
      <TimelineControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onSplit={handleSplit}
        zoomLevel={playheadState.zoom}
        isPlaying={playheadState.isPlaying}
        onPlayPause={handlePlayAll}
        onStop={handleStopAll}
        isMuted={masterMuted}
        onMuteToggle={() => setMasterMuted(!masterMuted)}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Enhanced Media Import Panel */}
        <MediaImportPanel
          onAudioUpload={handleFileUpload}
          onVideoUpload={handleVideoUpload}
          onAddAudioTrack={(trackType, trackName) => createTrackMutation.mutate({ trackType, trackName })}
          speakerCount={speakerTracks.length}
          isUploading={uploadFileMutation.isPending}
        />
        
        {/* Right: Professional Timeline Interface */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Video Player with Sync */}
          {viewSettings.showVideo && project?.videoFile && (
            <div className="flex-shrink-0 bg-[var(--rian-surface)] border-b border-[var(--rian-border)] p-4">
              <VideoPlayer 
                videoFile={project.videoFile}
                onAudioExtracted={handleAudioExtracted}
              />
            </div>
          )}

          {/* Professional Timeline Container */}
          <div className="flex-1 flex flex-col p-4 overflow-hidden">
            {/* Fixed Timeline Ruler - NEVER scrolls */}
            <TimelineRuler
              zoom={playheadState.zoom}
              duration={playheadState.duration}
              scrollLeft={playheadState.scrollLeft}
              width={Math.max(playheadState.duration * playheadState.zoom, 1000)}
              currentTime={playheadState.currentTime}
              onSeek={playheadActions.seekTo}
            />
            
            {/* Scrollable Timeline Content */}
            <ScrollableTimeline
              zoom={playheadState.zoom}
              currentTime={playheadState.currentTime}
              duration={playheadState.duration}
              scrollLeft={playheadState.scrollLeft}
              onScrollChange={playheadActions.setScrollLeft}
              onTimelineClick={playheadActions.seekTo}
              className="bg-[var(--rian-surface)] flex-1"
            >
              {/* Audio Tracks */}
              <div className="space-y-2">
                {/* Source Audio Track */}
                {sourceTrack && (
                  <div className="bg-[var(--rian-elevated)] rounded-lg p-2">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-white">Source Audio</h3>
                    </div>
                    <EnhancedWaveform
                      trackId={`source-${sourceTrack.id}`}
                      audioUrl={sourceTrack.audioFile ? `/uploads/${sourceTrack.audioFile}` : undefined}
                      waveformData={Array.isArray(sourceTrack.waveformData) ? sourceTrack.waveformData : undefined}
                      isActive={!!sourceTrack.audioFile}
                      height={80}
                      zoom={playheadState.zoom}
                      currentTime={playheadState.currentTime}
                      duration={playheadState.duration}
                      scrollLeft={playheadState.scrollLeft}
                      onDurationChange={playheadActions.setDuration}
                      onTimeUpdate={playheadActions.setCurrentTime}
                      onPlay={playheadActions.play}
                      onPause={playheadActions.pause}
                      waveColor="#60a5fa"
                      progressColor="#2563eb"
                    />
                  </div>
                )}
                
                {/* Speaker Tracks */}
                {speakerTracks.map((track, index) => (
                  <div key={track.id} className="bg-[var(--rian-elevated)] rounded-lg p-2">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-white">{track.trackName}</h3>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleSpeakerNameEdit(track.id, track.trackName)}
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleSTSGeneration(track.id)}
                          className="text-xs text-green-400 hover:text-green-300"
                        >
                          Generate
                        </button>
                      </div>
                    </div>
                    <EnhancedWaveform
                      trackId={`speaker-${track.id}`}
                      audioUrl={track.audioFile ? `/uploads/${track.audioFile}` : undefined}
                      isActive={!!track.audioFile}
                      height={80}
                      zoom={playheadState.zoom}
                      currentTime={playheadState.currentTime}
                      duration={playheadState.duration}
                      scrollLeft={playheadState.scrollLeft}
                      onDurationChange={playheadActions.setDuration}
                      waveColor="#10b981"
                      progressColor="#059669"
                    />
                  </div>
                ))}
                
                {/* M&E Track */}
                {meTrack && (
                  <div className="bg-[var(--rian-elevated)] rounded-lg p-2">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-white">M&E File</h3>
                    </div>
                    <EnhancedWaveform
                      trackId={`me-${meTrack.id}`}
                      audioUrl={meTrack.audioFile ? `/uploads/${meTrack.audioFile}` : undefined}
                      isActive={!!meTrack.audioFile}
                      height={60}
                      zoom={playheadState.zoom}
                      currentTime={playheadState.currentTime}
                      duration={playheadState.duration}
                      scrollLeft={playheadState.scrollLeft}
                      onDurationChange={playheadActions.setDuration}
                      waveColor="#f59e0b"
                      progressColor="#d97706"
                    />
                  </div>
                )}
              </div>
            </ScrollableTimeline>
          </div>
        </div>
      </div>

      {/* Modals and Context Menus */}
      <ContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={() => setContextMenu({ visible: false, x: 0, y: 0 })}
        onGenerateSTS={() => {
          if (contextMenu.trackId) {
            handleSTSGeneration(contextMenu.trackId);
          }
        }}
        onDownload={() => {
          // Implementation for download
          toast({
            title: "Download Started",
            description: "Audio file download has started.",
          });
        }}
        onDelete={() => {
          if (contextMenu.trackId) {
            deleteTrackMutation.mutate(contextMenu.trackId);
          }
        }}
      />

      <STSModal
        visible={stsModal.visible}
        voiceClones={voiceClones}
        onClose={() => setStsModal({ visible: false })}
        onGenerate={(voiceCloneId) => {
          if (stsModal.trackId) {
            generateSTSMutation.mutate({
              trackId: stsModal.trackId,
              voiceCloneId,
              timeRange: stsModal.timeRange
            });
          }
          setStsModal({ visible: false });
        }}
        isLoading={generateSTSMutation.isPending}
      />

      <EditSpeakerModal
        visible={editSpeakerModal.visible}
        currentName={editSpeakerModal.currentName || ""}
        onClose={() => setEditSpeakerModal({ visible: false })}
        onSave={(newName) => {
          if (editSpeakerModal.trackId) {
            updateTrackMutation.mutate({
              id: editSpeakerModal.trackId,
              updates: { trackName: newName }
            });
          }
          setEditSpeakerModal({ visible: false });
        }}
      />

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleFileUpload(file, 'source', 'Source Audio');
          }
        }}
      />
    </div>
  );
}
