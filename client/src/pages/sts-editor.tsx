import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import MenuBar from "@/components/sts/menu-bar";
import VideoPlayer from "@/components/sts/video-player";
import AudioTrack from "@/components/sts/audio-track";
import SpeakerTrack from "@/components/sts/speaker-track";
import METrack from "@/components/sts/me-track";
import TrackSection from "@/components/sts/track-section";
import ContextMenu from "@/components/sts/context-menu";
import STSModal from "@/components/sts/sts-modal";
import EditSpeakerModal from "@/components/sts/edit-speaker-modal";
import { useToast } from "@/hooks/use-toast";
import type { AudioTrack as AudioTrackType, VoiceClone } from "@shared/schema";

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewSettings, setViewSettings] = useState({
    showVideo: true,
    showAudio: true,
    showME: true
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ["/api/projects", currentProject.id, "tracks"],
    enabled: !!currentProject.id
  });

  const { data: voiceClones = [] } = useQuery<VoiceClone[]>({
    queryKey: ["/api/voice-clones"]
  });

  const { data: project } = useQuery({
    queryKey: ["/api/projects", currentProject.id],
    enabled: !!currentProject.id
  });



  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      return response.json();
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
  const handleAudioExtracted = async (audioUrl: string) => {
    try {
      // Create or update source audio track with extracted audio
      // Try to find source track, update if exists, else create
      const sourceTrack = tracks.find((t: any) => t.trackType === 'source');
      const audioFileName = audioUrl?.replace('/uploads/', '') || undefined;
      if (sourceTrack) {
        await updateTrackMutation.mutateAsync({ id: sourceTrack.id, updates: { audioFile: audioFileName } });
      } else {
        await createTrackMutation.mutateAsync({ trackType: 'source', trackName: 'Source Audio', audioFile: audioFileName });
      }
      toast({
        title: "Audio Extracted",
        description: "Audio has been extracted from video and added to source track."
      });
    } catch (error) {
      toast({ title: "Audio Extract Failed", description: "Could not extract audio from video.", variant: "destructive" });
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
        const audioData = await apiRequest('/api/extract-audio', {
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
      const sourceTrack = tracks.find((t: any) => t.trackType === 'source');
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
    setIsPlaying(!isPlaying);
    // Implementation would control all audio tracks
  };

  const handleStopAll = () => {
    setIsPlaying(false);
    // Implementation would stop all audio tracks
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

  const sourceTrack = tracks.find(t => t.trackType === 'source');
  const speakerTracks = tracks.filter(t => t.trackType === 'speaker');
  const meTrack = tracks.find(t => t.trackType === 'me');

  if (isLoading) {
    return (
      <div className="h-screen bg-[var(--rian-dark)] flex items-center justify-center">
        <div className="text-white">Loading STS Editor...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--rian-dark)] text-white">
      <MenuBar
        onPlayAll={handlePlayAll}
        onStopAll={handleStopAll}
        isPlaying={isPlaying}
        onFileUpload={handleFileUpload}
        onVideoUpload={handleVideoUpload}
        onNavigateToProjects={() => setLocation('/')}
        viewSettings={viewSettings}
        onViewSettingsChange={setViewSettings}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {viewSettings.showVideo && (
          <VideoPlayer 
            videoFile={project?.videoFile}
            onAudioExtracted={handleAudioExtracted}
          />
        )}

        <div className="flex-1 overflow-auto">
          <div className="p-4 space-y-3">
            {/* Source Audio Section */}
            {viewSettings.showAudio && (
              <TrackSection 
                title="Source Audio" 
                icon="🎤"
                defaultExpanded={true}
              >
                {sourceTrack ? (
                  <AudioTrack
                    track={sourceTrack}
                    onContextMenu={handleContextMenu}
                    onPlay={() => {}}
                    onStop={() => {}}
                    onMute={() => {}}
                    onFileUpload={(file) => handleTrackAudioUpload(file, sourceTrack)}
                    waveformContainerId={`waveform-source-${sourceTrack.id}`}
                  />
                ) : (
                  <div className="rian-surface rounded-lg border rian-border p-4">
                    <input
                      type="file"
                      accept="audio/*,video/*"
                      style={{ display: 'none' }}
                      id="source-audio-upload"
                      onChange={handleSourceAudioUpload}
                    />
                    <button
                      onClick={() => document.getElementById('source-audio-upload')?.click()}
                      className="w-full border-2 border-dashed rian-border rounded-lg p-6 text-center text-gray-500 hover:text-white hover:border-[var(--rian-accent)] transition-colors"
                    >
                      <div className="text-xl mb-2">🎤</div>
                      <p>Upload Source Audio/Video</p>
                    </button>
                  </div>
                )}
              </TrackSection>
            )}

            {/* Speaker Tracks Section */}
            {viewSettings.showAudio && (
              <TrackSection 
                title={`Speaker Tracks (${speakerTracks.length})`}
                icon="👥"
                defaultExpanded={true}
              >
                {speakerTracks.map((track, index) => (
                  <SpeakerTrack
                    key={track.id}
                    track={track}
                    voiceClones={voiceClones}
                    onContextMenu={handleContextMenu}
                    onPlay={() => {}}
                    onStop={() => {}}
                    onMute={() => {}}
                    onSTSGenerate={() => handleSTSGeneration(track.id)}
                    onNameEdit={() => handleSpeakerNameEdit(track.id, track.trackName)}
                    onVoiceChange={(voiceCloneId) => updateTrackMutation.mutate({
                      id: track.id,
                      updates: { voiceClone: voiceCloneId.toString() }
                    })}
                    onFileUpload={(file) => handleFileUpload(file, 'speaker', `Speaker ${speakerTracks.length + 1}`)}
                  />
                ))}

                {/* Add Speaker Track Button */}
                <div className="rian-surface rounded-lg border rian-border p-4">
                  <button
                    onClick={() => createTrackMutation.mutate({
                      trackType: 'speaker',
                      trackName: `Speaker ${speakerTracks.length + 1}`
                    })}
                    className="w-full border-2 border-dashed rian-border rounded-lg p-6 text-center text-gray-500 hover:text-white hover:border-[var(--rian-accent)] transition-colors"
                  >
                    <div className="text-xl mb-2">➕</div>
                    <p>Add Speaker Track</p>
                  </button>
                </div>
              </TrackSection>
            )}

            {/* M&E Section */}
            {viewSettings.showME && (
              <TrackSection 
                title="M&E File" 
                icon="🎵"
                defaultExpanded={true}
              >
                <METrack
                  track={meTrack}
                  onContextMenu={handleContextMenu}
                  onPlay={() => {}}
                  onStop={() => {}}
                  onMute={() => {}}
                  onFileUpload={(file) => handleFileUpload(file, 'me', 'M&E File')}
                />
              </TrackSection>
            )}
          </div>
        </div>
      </div>

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
