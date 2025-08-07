import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import WaveSurfer from "wavesurfer.js";
import MenuBar from "@/components/sts/menu-bar";
import TimelineControls from "@/components/sts/timeline-controls";
import TimelineRuler from "@/components/sts/timeline-ruler";
import VideoPlayer from "@/components/sts/video-player";
import ContextMenu from "@/components/sts/context-menu";
import STSModal from "@/components/sts/sts-modal";
import EditSpeakerModal from "@/components/sts/edit-speaker-modal";
import VoicesManager from "@/components/sts/voices-manager";
import { useToast } from "@/hooks/use-toast";
import type { AudioTrack as AudioTrackType } from "@shared/schema";

interface Project {
  id: number;
  name: string;
  clientName: string;
  languagePair: string;
  videoFile: string | null;
  sourceAudioFile: string | null;
  videoDuration: number | null;
  createdAt: string;
  updatedAt: string;
}

export default function STSEditor() {
  // Get project ID from URL params first
  const [match, params] = useRoute("/sts-editor/:projectId?");
  const urlProjectId = params?.projectId ? parseInt(params.projectId) : 1;
  
  const [currentProject, setCurrentProject] = useState<Project>({ 
    id: urlProjectId, 
    name: "Loading...",
    clientName: "Loading...",
    languagePair: "English to English",
    videoFile: null,
    sourceAudioFile: null,
    videoDuration: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
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
  const [voicesManagerOpen, setVoicesManagerOpen] = useState(false);
  const [selectedVoices, setSelectedVoices] = useState<Array<{
    voice_id: string;
    name: string;
    description?: string;
    category: string;
    labels: Record<string, string>;
  }>>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  // Global timeline zoom state
  const [zoomLevel, setZoomLevel] = useState(100);
  const [viewSettings, setViewSettings] = useState({
    showVideo: true,
    showAudio: true,
    showME: true
  });
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    size: number;
    trackId?: number;
    isFromTrack?: boolean;
  }>>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: tracks = [], isLoading, refetch: refetchTracks } = useQuery<AudioTrackType[]>({
    queryKey: ["/api/projects", currentProject.id, "tracks"],
    enabled: !!currentProject.id
  });

  // Voice clones query - removed in favor of selectedVoices state managed by VoicesManager

  const { data: project } = useQuery<Project>({
    queryKey: ["/api/projects", currentProject.id],
    queryFn: () => apiRequest(`/api/projects/${currentProject.id}`),
    enabled: !!currentProject.id
  });

  // Update current project when data changes
  useEffect(() => {
    if (project && project.id === currentProject.id) {
      setCurrentProject(project);
    }
  }, [project, currentProject.id]);

  // Update project ID when URL parameter changes (for page refreshes)
  useEffect(() => {
    if (urlProjectId !== currentProject.id) {
      setCurrentProject(prev => ({ ...prev, id: urlProjectId }));
    }
  }, [urlProjectId, currentProject.id]);

  // Reset UI state when project changes
  useEffect(() => {
    // Clear any visual artifacts when project ID changes
    setIsGlobalPlaying(false);
    setGlobalPlaybackTime(0);
  }, [currentProject.id]);

  // Timeline scroll and duration state
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const tracksScrollRef = useRef<HTMLDivElement>(null);
  const sourceAudioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [globalPlaybackTime, setGlobalPlaybackTime] = useState(0);
  const [isGlobalPlaying, setIsGlobalPlaying] = useState(false);
  const lastUpdateTime = useRef(0);
  const autoScrollEnabled = useRef(true);

  // Compute max duration from all tracks (for ruler/grid) - moved after track definitions

  // Track solo/mute handlers
  const toggleTrackSolo = useCallback((trackId: number) => {
    setTrackStates(prev => ({
      ...prev,
      [trackId]: {
        ...prev[trackId],
        isSolo: !prev[trackId]?.isSolo,
        isMuted: prev[trackId]?.isMuted || false
      }
    }));
  }, []);
  
  const toggleTrackMute = useCallback((trackId: number) => {
    setTrackStates(prev => ({
      ...prev,
      [trackId]: {
        ...prev[trackId],
        isSolo: prev[trackId]?.isSolo || false,
        isMuted: !prev[trackId]?.isMuted
      }
    }));
  }, []);

  // Handle audio duration detection
  const handleAudioDurationDetected = useCallback((trackId: number, duration: number) => {
    setAudioDurations(prev => ({ ...prev, [trackId]: duration }));
    
    // Update container width after duration is detected
    setTimeout(() => {
      const sourceContainer = document.getElementById(`waveform-source-${trackId}`);
      const speakerContainer = document.getElementById(`waveform-speaker-${trackId}`);
      
      const newWidth = `${duration * zoomLevel}px`;
      
      if (sourceContainer) {
        sourceContainer.style.width = newWidth;
      }
      if (speakerContainer) {
        speakerContainer.style.width = newWidth;
      }
    }, 100);
  }, [zoomLevel]);

  // Handle scroll sync with auto-scroll disable - throttled for better performance
  const scrollThrottleRef = useRef<number>(0);
  const handleTimelineScroll = useCallback(() => {
    if (timelineScrollRef.current) {
      const now = performance.now();
      if (now - scrollThrottleRef.current > 8) { // Throttle to ~120fps for smooth scrolling
        const newScrollLeft = timelineScrollRef.current.scrollLeft;
        setScrollLeft(newScrollLeft);
        scrollThrottleRef.current = now;
      }
      
      // Disable auto-scroll if user manually scrolled
      if (isGlobalPlaying) {
        autoScrollEnabled.current = false;
        // Re-enable after 3 seconds of no manual scrolling
        setTimeout(() => {
          autoScrollEnabled.current = true;
        }, 3000);
      }
      
      // Sync vertical scroll between left and right panels
      if (tracksScrollRef.current) {
        tracksScrollRef.current.scrollTop = timelineScrollRef.current.scrollTop;
      }
    }
  }, [isGlobalPlaying]);

  const handleTracksScroll = () => {
    if (tracksScrollRef.current && timelineScrollRef.current) {
      // Sync vertical scroll from left to right
      timelineScrollRef.current.scrollTop = tracksScrollRef.current.scrollTop;
    }
  };

  // Mouse wheel + Ctrl/Cmd zoom
  const handleTimelineWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const rect = timelineScrollRef.current?.getBoundingClientRect();
    const mouseX = rect ? e.clientX - rect.left : 0;
    const focusTime = ((mouseX + (timelineScrollRef.current?.scrollLeft || 0)) / zoomLevel) || 0;
    const ZOOM_LEVELS = [10, 15, 25, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000];
    const currentIndex = ZOOM_LEVELS.findIndex(z => z >= zoomLevel);
    let newZoom = zoomLevel;
    if (e.deltaY > 0 && currentIndex > 0) newZoom = ZOOM_LEVELS[currentIndex - 1];
    else if (e.deltaY < 0 && currentIndex < ZOOM_LEVELS.length - 1) newZoom = ZOOM_LEVELS[currentIndex + 1];
    if (newZoom !== zoomLevel) {
      setZoomLevel(newZoom);
      setTimeout(() => {
        if (timelineScrollRef.current) {
          const newMouseX = focusTime * newZoom;
          timelineScrollRef.current.scrollLeft = Math.max(0, newMouseX - mouseX);
        }
      }, 0);
    }
  };

  // Snap to major interval (from TimelineRuler)
  const handleSnap = (snapTime: number) => {
    setCurrentTime(snapTime);
    // Optionally, scroll to snapped time
    if (timelineScrollRef.current) {
      timelineScrollRef.current.scrollLeft = Math.max(0, snapTime * zoomLevel - 100);
    }
  };

  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!currentProject?.id) {
        throw new Error('No project selected');
      }
      
      const formData = new FormData();
      formData.append('file', file);
      console.log('Uploading to project:', currentProject.id);
      
      const response = await fetch(`/api/projects/${currentProject.id}/upload`, {
        method: 'POST',
        body: formData
      });
      
      console.log('Upload response status:', response.status);
      
      if (!response.ok) {
        // Try to parse as JSON first, fallback to text if it fails
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          throw new Error(error.message || 'Upload failed');
        } else {
          const text = await response.text();
          console.error('Non-JSON response:', text);
          throw new Error('Upload failed - server returned non-JSON response');
        }
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", currentProject.id, "tracks"] });
    }
  });

  const createTrackMutation = useMutation({
    mutationFn: async (trackData: { 
      trackType: string; 
      trackName: string; 
      audioFile?: string;
      originalFileName?: string;
      fileSize?: number;
      duration?: number;
    }) => {
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
    mutationFn: async ({ trackId, voiceCloneId, timeRange }: { trackId: number; voiceCloneId: number | string; timeRange?: { start: number; end: number } }) => {
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
      // Store the full project-specific path
      const audioFilePath = `project-${currentProject.id}/${uploadResult.filename}`;
      await createTrackMutation.mutateAsync({
        trackType,
        trackName,
        audioFile: audioFilePath,
        originalFileName: file.name,
        fileSize: file.size,
        duration: undefined // Will be determined by audio analysis if needed
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
      
      const response = await fetch(`/api/projects/${currentProject.id}/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const result = await response.json();
      
      // Update current project with video file - store with project folder path
      await apiRequest(`/api/projects/${currentProject.id}`, {
        method: 'PUT',
        body: { 
          videoFile: `project-${currentProject.id}/${result.filename}`,
          videoDuration: null // Will be updated when audio is extracted
        }
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/projects", currentProject.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", currentProject.id, "tracks"] });
      
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

  // --- AUDIO EXTRACTED HANDLER (after FFmpeg) ---
  const handleAudioExtracted = async (audioUrl: string) => {
    console.log('handleAudioExtracted called with audioUrl:', audioUrl);
    try {
      // Create or update source audio track with extracted audio
      // Try to find source track, update if exists, else create
      const sourceTrack = tracks.find((t) => t.trackType === 'source');
      console.log('Found source track:', sourceTrack);
      
      // Extract just the filename from the URL
      const audioFileName = audioUrl?.startsWith('/uploads/') 
        ? audioUrl.replace('/uploads/', '') 
        : audioUrl?.replace('uploads/', '') || undefined;
      
      console.log('Extracted audio filename:', audioFileName);
      
      if (sourceTrack) {
        // Clear old waveform cache for this track before updating
        const oldWaveformKeys = Array.from(waveformInitialized.current)
          .filter(key => key.includes(`waveform-source-${sourceTrack.id}`));
        oldWaveformKeys.forEach(key => waveformInitialized.current.delete(key));
        
        // Clear the container to remove old waveform
        const container = document.getElementById(`waveform-source-${sourceTrack.id}`);
        if (container) {
          container.innerHTML = '';
        }
        
        await updateTrackMutation.mutateAsync({ id: sourceTrack.id, updates: { audioFile: audioFileName } });
        
        // Also update project with source audio file
        await apiRequest(`/api/projects/${currentProject.id}`, {
          method: 'PUT',
          body: { sourceAudioFile: audioFileName }
        });
      } else {
        await createTrackMutation.mutateAsync({ trackType: 'source', trackName: 'Source Audio', audioFile: audioFileName });
        
        // Also update project with source audio file
        await apiRequest(`/api/projects/${currentProject.id}`, {
          method: 'PUT',
          body: { sourceAudioFile: audioFileName }
        });
      }
      
      // Force waveform re-initialization after a short delay
      setTimeout(() => {
        const event = new CustomEvent('force-waveform-init');
        document.dispatchEvent(event);
      }, 500);
      
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
      // Store the full project-specific path
      const audioFilePath = `project-${currentProject.id}/${uploadResult.filename}`;
      // Update track with new audio file
      await updateTrackMutation.mutateAsync({ id: track.id, updates: { audioFile: audioFilePath } });
      toast({ title: "Audio Uploaded", description: `${track.trackName} audio updated.` });
    } catch (error) {
      toast({ title: "Upload Failed", description: "Failed to upload audio.", variant: "destructive" });
    }
  };

  // Auto-scroll effect to keep playhead visible with smoother scrolling
  useEffect(() => {
    if (isGlobalPlaying && autoScrollEnabled.current && timelineScrollRef.current) {
      const playheadPosition = globalPlaybackTime * zoomLevel;
      const scrollLeft = timelineScrollRef.current.scrollLeft;
      const viewportWidth = timelineScrollRef.current.clientWidth;
      
      // Auto-scroll when playhead approaches the right edge OR when playhead is not visible at all
      const playheadVisible = playheadPosition >= scrollLeft && playheadPosition <= scrollLeft + viewportWidth;
      
      if (!playheadVisible || playheadPosition > scrollLeft + viewportWidth - 200) {
        // Use smooth scrolling with requestAnimationFrame for better performance
        const targetScroll = Math.max(0, playheadPosition - 200);
        const startScroll = scrollLeft;
        const scrollDiff = targetScroll - startScroll;
        const duration = 300; // ms
        const startTime = performance.now();
        
        const animateScroll = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeOut = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
          
          if (timelineScrollRef.current) {
            timelineScrollRef.current.scrollLeft = startScroll + (scrollDiff * easeOut);
          }
          
          if (progress < 1) {
            requestAnimationFrame(animateScroll);
          }
        };
        
        requestAnimationFrame(animateScroll);
      }
    }
  }, [globalPlaybackTime, isGlobalPlaying, zoomLevel]);

  // Throttled playback time update callback - improved smoothness
  const handlePlaybackTimeUpdate = useCallback((time: number) => {
    const now = performance.now();
    if (now - lastUpdateTime.current > 16) { // Throttle to ~60fps for smoother updates
      setGlobalPlaybackTime(time);
      lastUpdateTime.current = now;
    }
  }, []);


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
        const audioData = await apiRequest(`/api/projects/${currentProject.id}/extract-audio`, {
          method: 'POST',
          body: { filePath: `uploads/project-${currentProject.id}/${uploadData.filename}` }
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
        const audioFilePath = `project-${currentProject.id}/${uploadResult.filename}`;
        await createTrackMutation.mutateAsync({ trackType: 'source', trackName: 'Source Audio', audioFile: audioFilePath });
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

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    console.log('Drop event triggered');
    
    // Check if it's a file from masters panel
    const masterFileData = e.dataTransfer.getData('application/json');
    if (masterFileData) {
      console.log('Dropping file from masters panel:', masterFileData);
      const masterFile = JSON.parse(masterFileData);
      await handleMasterFileDrop(masterFile, e);
      return;
    }

    // Handle direct file drops
    const files = Array.from(e.dataTransfer.files);
    console.log('Direct file drop - files:', files.map(f => ({name: f.name, type: f.type, size: f.size})));
    
    const file = files[0];
    
    if (!file) {
      console.log('No file found in drop');
      return;
    }

    // Handle video files
    if (file.type.startsWith('video/')) {
      console.log('Detected video file, processing...');
      await handleVideoFileDrop(file);
      return;
    }

    // Handle audio files
    const audioFile = files.find(file => file.type.startsWith('audio/'));
    
    if (!audioFile) {
      console.log('No valid audio or video file found');
      toast({
        title: "Invalid File",
        description: "Please drop an audio or video file.",
        variant: "destructive"
      });
      return;
    }

    console.log('Processing audio file:', audioFile.name);

    // Find target track
    let targetElement = e.target as HTMLElement;
    while (targetElement && !targetElement.dataset.trackId) {
      targetElement = targetElement.parentElement as HTMLElement;
    }

    if (targetElement?.dataset.trackId) {
      // Drop on existing speaker track
      const trackId = parseInt(targetElement.dataset.trackId);
      const track = speakerTracks.find(t => t.id === trackId);
      if (track) {
        try {
          // Upload file and update track
          const uploadResult = await uploadFileMutation.mutateAsync(audioFile);
          
          // Get first 4 characters of filename (without extension)
          const fileName = audioFile.name.replace(/\.[^/.]+$/, ""); // Remove extension
          const newTrackName = fileName.substring(0, 4).toUpperCase();
          
          // Update track with new audio file and name (with project-specific path)
          await updateTrackMutation.mutateAsync({ 
            id: trackId, 
            updates: { 
              audioFile: `project-${currentProject.id}/${uploadResult.filename}`,
              trackName: newTrackName
            } 
          });
          
          toast({
            title: "Audio Assigned",
            description: `Audio assigned to track ${newTrackName}`,
          });
        } catch (error) {
          toast({
            title: "Upload Failed",
            description: "Failed to upload audio file.",
            variant: "destructive"
          });
        }
      }
    } else {
      // Drop in empty area - create new speaker track
      try {
        const uploadResult = await uploadFileMutation.mutateAsync(audioFile);
        const fileName = audioFile.name.replace(/\.[^/.]+$/, "");
        const newTrackName = fileName.substring(0, 4).toUpperCase();
        
        await createTrackMutation.mutateAsync({
          trackType: 'speaker',
          trackName: newTrackName,
          audioFile: `project-${currentProject.id}/${uploadResult.filename}`
        });
        
        toast({
          title: "Track Created",
          description: `New track ${newTrackName} created with audio.`,
        });
      } catch (error) {
        toast({
          title: "Upload Failed",
          description: "Failed to create new track.",
          variant: "destructive"
        });
      }
    }
  };

  // Handle video file drop
  const handleVideoFileDrop = async (file: File) => {
    try {
      console.log('Processing video file:', file.name, file.type, file.size);
      
      toast({
        title: "Processing Video",
        description: "Uploading video and extracting audio...",
      });

      // Upload video file
      console.log('Starting video upload...');
      const uploadResult = await uploadFileMutation.mutateAsync(file);
      console.log('Video upload result:', uploadResult);
      
      if (!uploadResult || !uploadResult.filename) {
        throw new Error('Upload failed - no filename returned');
      }
      
      // Add to uploaded files list
      const newFile = {
        id: `video-${Date.now()}`,
        name: file.name,
        type: file.type,
        url: `/uploads/${uploadResult.filename}`,
        size: file.size
      };
      setUploadedFiles(prev => [...prev, newFile]);

      // Update project with video file - store with project folder path
      console.log('Updating project with video file...');
      await apiRequest(`/api/projects/${currentProject.id}`, {
        method: 'PUT',
        body: { videoFile: `project-${currentProject.id}/${uploadResult.filename}` }
      });

      // Extract audio in real-time
      console.log('Extracting audio from video...');
      const audioData = await apiRequest(`/api/projects/${currentProject.id}/extract-audio`, {
        method: 'POST',
        body: { filePath: `uploads/project-${currentProject.id}/${uploadResult.filename}` }
      });
      
      console.log('Audio extraction result:', audioData);

      if (audioData.success) {
        await handleAudioExtracted(audioData.audioFile);
        toast({
          title: "Video Processed",
          description: "Video loaded and audio extracted successfully.",
        });
      } else {
        throw new Error(audioData.message || 'Audio extraction failed');
      }

      queryClient.invalidateQueries({ queryKey: ["/api/projects", currentProject.id] });
    } catch (error: any) {
      console.error('Video processing error:', error);
      toast({
        title: "Processing Failed",
        description: error.message || "Failed to process video file.",
        variant: "destructive"
      });
    }
  };

  // Handle file upload to masters
  const handleMasterFileUpload = async (file: File) => {
    try {
      console.log('Starting master file upload:', file.name, 'Project ID:', currentProject.id);
      const uploadResult = await uploadFileMutation.mutateAsync(file);
      console.log('Upload result:', uploadResult);
      
      const newFile = {
        id: `file-${Date.now()}`,
        name: file.name,
        type: file.type,
        url: `/uploads/project-${currentProject.id}/${uploadResult.filename}`,
        size: file.size,
        isFromTrack: false // Mark as manual upload
      };
      setUploadedFiles(prev => [...prev, newFile]);
      
      toast({
        title: "File Uploaded",
        description: `${file.name} added to masters.`,
      });
    } catch (error: any) {
      console.error('Master file upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file.",
        variant: "destructive"
      });
    }
  };

  // Handle drag from masters panel
  const handleMasterFileDrop = async (masterFile: any, e: React.DragEvent) => {
    console.log('handleMasterFileDrop called with:', masterFile);
    
    if (masterFile.type.startsWith('video/')) {
      // Update project with video file
      try {
        // Extract the path after /uploads/ (includes project folder)
        const videoPath = masterFile.url.replace(/^\/uploads\//, '');
        console.log('Updating project with video path:', videoPath);
        
        await apiRequest(`/api/projects/${currentProject.id}`, {
          method: 'PUT',
          body: { videoFile: videoPath }
        });
        
        // Extract audio - the file is already in the project folder
        console.log('Extracting audio from:', masterFile.url.replace(/^\//, ''));
        const audioData = await apiRequest(`/api/projects/${currentProject.id}/extract-audio`, {
          method: 'POST',
          body: { filePath: masterFile.url.replace(/^\//, '') } // Remove leading slash
        });
        
        console.log('Audio extraction response:', audioData);

        if (audioData.success) {
          console.log('Calling handleAudioExtracted with:', audioData.audioFile);
          await handleAudioExtracted(audioData.audioFile);
          console.log('handleAudioExtracted completed');
        } else {
          console.error('Audio extraction failed:', audioData);
        }
        
        // Fetch updated project data directly using simple fetch
        try {
          const response = await fetch(`/api/projects/${currentProject.id}`);
          if (response.ok) {
            const updatedProject = await response.json();
            console.log('Updated project data:', updatedProject);
            setCurrentProject(updatedProject);
          }
        } catch (fetchError) {
          console.error('Failed to fetch updated project:', fetchError);
        }
        
        // Invalidate queries to refresh tracks
        await queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/projects", currentProject.id] });
        await queryClient.invalidateQueries({ queryKey: ["/api/projects", currentProject.id, "tracks"] });
        
        // Explicitly refetch tracks
        console.log('Refetching tracks after video drop...');
        await refetchTracks();
        
        // Force waveform re-initialization with longer delay to ensure tracks are updated
        waveformInitialized.current.clear();
        setTimeout(() => {
          console.log('Forcing waveform re-initialization...');
          const event = new CustomEvent('force-waveform-init');
          document.dispatchEvent(event);
        }, 1000);
        
        toast({
          title: "Video Loaded",
          description: "Video loaded in player and audio extracted.",
        });
      } catch (error) {
        console.error('Error in handleMasterFileDrop:', error);
        toast({
          title: "Error",
          description: "Failed to load video.",
          variant: "destructive"
        });
      }
    } else if (masterFile.type.startsWith('audio/')) {
      // Handle audio file assignment to tracks
      let targetElement = e.target as HTMLElement;
      while (targetElement && !targetElement.dataset.trackId) {
        targetElement = targetElement.parentElement as HTMLElement;
      }

      // Extract the path after /uploads/ (already includes project folder)
      const audioPath = masterFile.url.replace(/^\/uploads\//, '');
      const newTrackName = masterFile.name.replace(/\.[^/.]+$/, "").substring(0, 4).toUpperCase();

      if (targetElement?.dataset.trackId) {
        // Assign to existing track (with confirmation if track already has audio)
        const trackId = parseInt(targetElement.dataset.trackId);
        const existingTrack = tracks.find(t => t.id === trackId);
        
        if (existingTrack?.audioFile) {
          // Track already has audio, show confirmation
          const confirmed = window.confirm(`Replace existing audio in ${existingTrack.trackName}?`);
          if (!confirmed) return;
        }
        
        await updateTrackMutation.mutateAsync({ 
          id: trackId, 
          updates: { 
            audioFile: audioPath,
            trackName: newTrackName
          } 
        });
        toast({
          title: "Audio Assigned",
          description: `Audio ${existingTrack?.audioFile ? 'replaced in' : 'assigned to'} track ${newTrackName}`,
        });
      } else {
        // Create new speaker track
        await createTrackMutation.mutateAsync({
          trackType: 'speaker',
          trackName: newTrackName,
          audioFile: audioPath
        });
        toast({
          title: "Track Created",
          description: `New track ${newTrackName} created.`,
        });
      }
    }
  };

  // Sync audio playback with video
  useEffect(() => {
    const audioElement = sourceAudioRef.current;
    const currentSourceTrack = tracks.find((t: AudioTrackType) => t.trackType === 'source');
    if (!audioElement || !currentSourceTrack?.audioFile) return;

    if (isGlobalPlaying) {
      audioElement.currentTime = globalPlaybackTime;
      audioElement.play().catch(console.error);
    } else {
      audioElement.pause();
    }
  }, [isGlobalPlaying, tracks]);

  // Update audio time when video time changes - throttled for performance
  useEffect(() => {
    const audioElement = sourceAudioRef.current;
    const currentSourceTrack = tracks.find((t: AudioTrackType) => t.trackType === 'source');
    if (!audioElement || !currentSourceTrack?.audioFile) return;
    
    // Only sync if there's a significant drift (more than 0.2 seconds)
    if (Math.abs(audioElement.currentTime - globalPlaybackTime) > 0.2) {
      audioElement.currentTime = globalPlaybackTime;
    }
  }, [Math.floor(globalPlaybackTime * 2) / 2, tracks]); // Update at most twice per second

  // Initialize waveforms for tracks with audio files - memoized to prevent reloading
  const waveformInitialized = useRef(new Set<string>());
  
  useEffect(() => {
    const initializeWaveforms = () => {
      console.log('initializeWaveforms called, sourceTrack:', sourceTrack, 'speakerTracks:', speakerTracks);
      
      // Source audio waveform
      if (sourceTrack?.audioFile) {
        console.log('Initializing source track waveform, audioFile:', sourceTrack.audioFile);
        const containerId = `waveform-source-${sourceTrack.id}`;
        const waveformKey = `${containerId}-${sourceTrack.audioFile}`;
        
        console.log('Source track container ID:', containerId);
        console.log('Source track waveform key:', waveformKey);
        console.log('Waveform already initialized?', waveformInitialized.current.has(waveformKey));
        
        if (!waveformInitialized.current.has(waveformKey)) {
          const container = document.getElementById(containerId);
          console.log('Source track container found:', !!container);
          if (container) { // Removed the children.length check to allow re-initialization
            // Handle both old format (just filename) and new format (project-1/filename)
            const audioUrl = sourceTrack.audioFile.startsWith('http') || sourceTrack.audioFile.startsWith('/') 
              ? sourceTrack.audioFile 
              : `/uploads/${sourceTrack.audioFile}`;
            
            console.log('Initializing source waveform with URL:', audioUrl);
            
            // Clear container first
            container.innerHTML = '';
            
            const wavesurfer = WaveSurfer.create({
              container: `#${containerId}`,
              waveColor: '#4fd1c5',
              progressColor: '#2c7a7b',
              height: 64,
              normalize: true,
              fillParent: true // Fill the parent container
            });
            
            // Add error handling
            wavesurfer.on('error', (error) => {
              console.error(`Error loading source waveform from ${audioUrl}:`, error);
            });
            
            // Detect audio duration when loaded
            wavesurfer.on('ready', () => {
              console.log(`Source waveform loaded successfully from ${audioUrl}`);
              const duration = wavesurfer.getDuration();
              handleAudioDurationDetected(sourceTrack.id, duration);
            });
            
            wavesurfer.load(audioUrl);
            waveformInitialized.current.add(waveformKey);
          }
        }
      }

      // Speaker track waveforms
      speakerTracks.forEach((track) => {
        if (track.audioFile) {
          const containerId = `waveform-speaker-${track.id}`;
          const waveformKey = `${containerId}-${track.audioFile}`;
          
          if (!waveformInitialized.current.has(waveformKey)) {
            const container = document.getElementById(containerId);
            console.log(`Speaker track ${track.trackName} container found:`, !!container);
            if (container) { // Removed children.length check for consistency
              // Clear container first
              container.innerHTML = '';
              
              // Handle both old format (just filename) and new format (project-1/filename)
              const audioUrl = track.audioFile.startsWith('http') || track.audioFile.startsWith('/') 
                ? track.audioFile 
                : `/uploads/${track.audioFile}`;
              
              console.log(`Initializing speaker waveform for ${track.trackName} with URL:`, audioUrl);
              
              const wavesurfer = WaveSurfer.create({
                container: `#${containerId}`,
                waveColor: '#4fd1c5',
                progressColor: '#2c7a7b',
                height: 64,
                normalize: true,
                fillParent: true // Fill the parent container
              });
              
              // Add error handling
              wavesurfer.on('error', (error) => {
                console.error(`Error loading speaker waveform for ${track.trackName} from ${audioUrl}:`, error);
              });
              
              // Detect audio duration when loaded
              wavesurfer.on('ready', () => {
                console.log(`Speaker waveform loaded successfully for ${track.trackName} from ${audioUrl}`);
                const duration = wavesurfer.getDuration();
                handleAudioDurationDetected(track.id, duration);
              });
              
              wavesurfer.load(audioUrl);
              waveformInitialized.current.add(waveformKey);
            }
          }
        }
      });
    };

    // Delay initialization to ensure DOM elements are ready
    const timeoutId = setTimeout(initializeWaveforms, 100);
    
    // Add event listener for forced initialization
    const forceInitHandler = () => {
      console.log('Force waveform initialization triggered');
      setTimeout(initializeWaveforms, 200);
    };
    document.addEventListener('force-waveform-init', forceInitHandler);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('force-waveform-init', forceInitHandler);
    };
  }, [tracks]); // React to changes in tracks

  // Define tracks for rendering (must be before conditional returns)
  const sourceTrack = tracks.find((t: AudioTrackType) => t.trackType === 'source');
  const speakerTracks = tracks.filter((t: AudioTrackType) => t.trackType === 'speaker');
  
  // Debug logging
  useEffect(() => {
    console.log('Tracks updated:', tracks);
    console.log('Source track:', sourceTrack);
    console.log('Speaker tracks:', speakerTracks);
  }, [tracks, sourceTrack, speakerTracks]);
  
  // Track audio durations state
  const [audioDurations, setAudioDurations] = useState<{ [trackId: number]: number }>({});

  // Track solo/mute states
  const [trackStates, setTrackStates] = useState<{ [trackId: number]: { isSolo: boolean; isMuted: boolean } }>({});
  
  // Check if any track is soloed
  const hasAnyTrackSoloed = useMemo(() => {
    return Object.values(trackStates).some(state => state.isSolo);
  }, [trackStates]);
  
  // Get effective mute state (considering solo logic)
  const getEffectiveMuteState = useCallback((trackId: number) => {
    const trackState = trackStates[trackId];
    if (!trackState) return false;
    
    // If any track is soloed, only soloed tracks play
    if (hasAnyTrackSoloed) {
      return !trackState.isSolo;
    }
    
    // Otherwise, just check if this track is muted
    return trackState.isMuted;
  }, [trackStates, hasAnyTrackSoloed]);

  // Sync uploaded files with track files
  useEffect(() => {
    const trackFiles = tracks
      .filter(track => track.audioFile)
      .map(track => ({
        id: `track-${track.id}`,
        name: track.trackName || 'Audio File',
        type: 'audio',
        url: `/uploads/${track.audioFile}`,
        size: 0, // We don't have size info from tracks
        trackId: track.id,
        isFromTrack: true
      }));

    // Merge with manually uploaded files (keep existing ones that aren't from tracks)
    setUploadedFiles(prev => {
      const manualFiles = prev.filter(file => !file.isFromTrack);
      return [...manualFiles, ...trackFiles];
    });
  }, [tracks]);

  // --- PROJECT MANAGEMENT ---
  const handleProjectChange = (newProject: Project) => {
    // Clear React Query cache for the old project first
    queryClient.removeQueries({ 
      queryKey: ["/api/projects", currentProject.id, "tracks"] 
    });
    
    // Navigate to the new project URL
    setLocation(`/sts-editor/${newProject.id}`);
    
    setCurrentProject(newProject);
    
    // Clear any cached data for waveforms when switching projects
    waveformInitialized.current.clear();
    
    // Reset playback state
    setIsGlobalPlaying(false);
    setGlobalPlaybackTime(0);
    
    // Clear uploaded files cache
    setUploadedFiles([]);
    
    // Clear all waveform containers to prevent showing old data
    setTimeout(() => {
      document.querySelectorAll('[id^="waveform-"]').forEach(container => {
        if (container instanceof HTMLElement) {
          container.innerHTML = '';
        }
      });
      // Force waveform re-initialization after clearing
      const event = new CustomEvent('force-waveform-clear');
      document.dispatchEvent(event);
    }, 100);
    
    // Scroll to top when switching projects
    if (timelineScrollRef.current) {
      timelineScrollRef.current.scrollTop = 0;
      timelineScrollRef.current.scrollLeft = 0;
    }
    if (tracksScrollRef.current) {
      tracksScrollRef.current.scrollTop = 0;
    }
    
    // Force re-render of queries for new project
    queryClient.invalidateQueries({ queryKey: ["/api/projects", newProject.id] });
    queryClient.invalidateQueries({ queryKey: ["/api/projects", newProject.id, "tracks"] });
    
    // Clear audio durations state for new project
    setAudioDurations({});
    
    toast({
      title: "Project Switched",
      description: `Switched to project: ${newProject.name}`
    });
  };

  // Compute max duration from all tracks (for ruler/grid) - must be before conditional returns
  const maxDuration = useMemo(() => {
    // Use actual audio durations if available
    const allDurations = Object.values(audioDurations).filter(d => d > 0);
    
    if (allDurations.length > 0) {
      const maxActualDuration = Math.max(...allDurations);
      // Add some padding for editing, but not too much
      return maxActualDuration + 10;
    }
    
    // Fallback: if no durations detected yet, use shorter default
    return 60;
  }, [audioDurations]);

  if (isLoading) {
    return (
      <div className="h-screen bg-[var(--rian-dark)] flex items-center justify-center">
        <div className="text-white">Loading STS Editor...</div>
      </div>
    );
  }

  // --- GLOBAL TIMELINE CONTROLS ---
  const handleZoomIn = () => {
    const newZoom = Math.min(zoomLevel * 1.5, 2000); // Allow much higher zoom
    setZoomLevel(newZoom);
    // Broadcast zoom to all waveform instances
    document.dispatchEvent(new CustomEvent('global-waveform-zoom', { detail: { zoom: newZoom } }));
  };
  const handleZoomOut = () => {
    const newZoom = Math.max(zoomLevel / 1.5, 10); // Minimum zoom to prevent disappearing
    setZoomLevel(newZoom);
    document.dispatchEvent(new CustomEvent('global-waveform-zoom', { detail: { zoom: newZoom } }));
  };
  const handleSplit = () => {
    document.dispatchEvent(new CustomEvent('global-waveform-split'));
  };

  return (
    <>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .playhead-indicator {
          transform: translate3d(0, 0, 0);
          backface-visibility: hidden;
          perspective: 1000px;
        }
        video {
          transform: translate3d(0, 0, 0);
        }
      `}</style>
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
        onVoicesManager={() => setVoicesManagerOpen(true)}
        currentProject={currentProject}
        onProjectChange={handleProjectChange}
        customLogo={<img src="/src/logo.png" alt="Brand Logo" className="w-7 h-7 object-contain" />}
      />
      <TimelineControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onSplit={handleSplit}
        zoomLevel={zoomLevel}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Row - Masters and Video Player Side by Side */}
        <div className="flex border-b border-gray-600" style={{height: '280px'}}>
          {/* Masters Panel - Left Side */}
          {true && (
            <div className="bg-gray-900 border-r border-gray-600 flex flex-col" style={{width: '400px'}}>
              <div className="p-3 border-b border-gray-600 bg-gray-800">
                <h3 className="text-sm font-semibold text-white">Masters</h3>
              </div>
              
              {/* File Upload Area */}
              <div className="p-3 border-b border-gray-600">
                <input
                  type="file"
                  id="masterFileInput"
                  className="hidden"
                  multiple
                  accept="audio/*,video/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    files.forEach(handleMasterFileUpload);
                  }}
                />
                <label
                  htmlFor="masterFileInput"
                  className="block w-full border-2 border-dashed border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 transition-colors"
                >
                  <div className="text-blue-400 text-2xl mb-2">📁</div>
                  <div className="text-sm text-gray-300">Click to upload files</div>
                  <div className="text-xs text-gray-500">or drag and drop here</div>
                </label>
              </div>
              
              {/* Files List */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-2">
                  <div className="text-xs text-gray-400 mb-2 font-semibold">CLIP NAME</div>
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.id}
                      className={`flex items-center p-2 rounded hover:bg-gray-800 cursor-pointer group ${
                        file.isFromTrack ? 'border-l-2 border-green-500' : ''
                      }`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify(file));
                      }}
                    >
                      <div className={`mr-3 text-lg ${
                        file.isFromTrack ? 'text-green-400' : 'text-blue-400'
                      }`}>
                        {file.isFromTrack ? '🎤' : 
                         file.type.startsWith('video/') ? '📹' : 
                         file.type.startsWith('audio/') ? '🎵' : '📄'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">
                          {file.name}
                          {file.isFromTrack && (
                            <span className="ml-2 text-xs text-green-400">(from track)</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          {file.size > 0 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : 'Track audio'}
                        </div>
                      </div>
                      {!file.isFromTrack && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="text-gray-400 hover:text-red-400 text-sm ml-2">×</button>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {uploadedFiles.length === 0 && (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No files uploaded yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Video Player - Right Side */}
          {viewSettings.showVideo && (
            <div 
              className="flex-1 bg-gray-800 flex items-center justify-center p-4"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <div className="w-full h-full max-w-3xl">
                <VideoPlayer 
                  key={`video-player-${currentProject.id}`}
                  videoFile={currentProject?.videoFile || undefined}
                  projectId={currentProject?.id}
                  onAudioExtracted={handleAudioExtracted}
                  globalPlaybackTime={globalPlaybackTime}
                  onPlaybackTimeUpdate={handlePlaybackTimeUpdate}
                  onPlayStateChange={setIsGlobalPlaying}
                />
              </div>
            </div>
          )}
        </div>

        {/* Timeline Layout - Full Width Below */}
        <div className="flex-1 overflow-hidden relative">
          <div className="flex h-full">
            {/* Left Panel - Fixed Controls */}
            <div className="w-64 bg-gray-800 border-r border-gray-600 flex flex-col relative z-20">
              {/* Ruler Space */}
              <div className="h-12 bg-gray-700 border-b border-gray-600 flex items-center px-3">
                <span className="text-xs text-gray-300">TRACKS</span>
              </div>
              
              {/* Track Controls List - Synchronized Scroll */}
              <div 
                className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar" 
                ref={tracksScrollRef}
                onScroll={handleTracksScroll}
              >
                {/* Source Audio Controls */}
                {sourceTrack && (
                  <div 
                    key={`source-controls-${currentProject.id}-${sourceTrack.id}`}
                    className="p-3 border-b border-gray-600 bg-gray-800" 
                    style={{height: '140px'}}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-white truncate">Source Audio</span>
                      <div className="w-3 h-3 bg-blue-500 rounded border border-gray-400"></div>
                    </div>
                    <div className="mb-2 space-y-1">
                      <select className="w-full text-xs bg-gray-700 text-white border border-gray-600 rounded px-1 py-0.5">
                        <option>Input 1-2</option>
                      </select>
                      <select className="w-full text-xs bg-gray-700 text-white border border-gray-600 rounded px-1 py-0.5">
                        <option>Out 1-2</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex space-x-1">
                        <button className="w-6 h-6 flex items-center justify-center bg-red-600 hover:bg-red-500 rounded text-xs text-white font-bold">R</button>
                        <button 
                          onClick={() => toggleTrackSolo(sourceTrack.id)}
                          className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold transition-colors ${
                            trackStates[sourceTrack.id]?.isSolo 
                              ? 'bg-yellow-500 hover:bg-yellow-400 text-black' 
                              : 'bg-gray-600 hover:bg-gray-500 text-white'
                          }`}
                        >S</button>
                        <button 
                          onClick={() => toggleTrackMute(sourceTrack.id)}
                          className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold transition-colors ${
                            trackStates[sourceTrack.id]?.isMuted 
                              ? 'bg-red-500 hover:bg-red-400 text-white' 
                              : 'bg-gray-600 hover:bg-gray-500 text-white'
                          }`}
                        >M</button>
                      </div>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded"
                      >
                        Import
                      </button>
                    </div>
                    <input type="range" min="0" max="100" defaultValue="75" className="w-full h-2 bg-gray-600 rounded-lg" />
                  </div>
                )}
                
                {/* Speaker Track Controls */}
                {speakerTracks.map((track, index) => (
                  <div key={track.id} className="p-3 border-b border-gray-600 bg-gray-800" style={{height: '170px'}}>
                    <div className="flex items-center justify-between mb-2">
                      <span 
                        className="text-xs font-medium text-white cursor-pointer hover:text-blue-400 truncate"
                        onClick={() => handleSpeakerNameEdit(track.id, track.trackName)}
                      >
                        A{index + 1} {track.trackName}
                      </span>
                      <div className={`w-3 h-3 rounded border border-gray-400 ${index % 3 === 0 ? 'bg-green-500' : index % 3 === 1 ? 'bg-yellow-500' : 'bg-purple-500'}`}></div>
                    </div>
                    <div className="mb-2 space-y-1">
                      <select className="w-full text-xs bg-gray-700 text-white border border-gray-600 rounded px-1 py-0.5">
                        <option>Input {index + 3}-{index + 4}</option>
                      </select>
                      <select className="w-full text-xs bg-gray-700 text-white border border-gray-600 rounded px-1 py-0.5">
                        <option>Out 1-2</option>
                      </select>
                    </div>
                    <div className="mb-2">
                      <select 
                        value={track.voiceClone || ''}
                        onChange={(e) => updateTrackMutation.mutate({
                          id: track.id,
                          updates: { voiceClone: e.target.value }
                        })}
                        className="w-full text-xs bg-gray-700 text-white border border-gray-600 rounded px-1 py-0.5"
                      >
                        <option value="">Select Voice...</option>
                        {selectedVoices.map((voice) => (
                          <option key={voice.voice_id} value={voice.voice_id}>{voice.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex space-x-1">
                        <button className="w-6 h-6 flex items-center justify-center bg-red-600 hover:bg-red-500 rounded text-xs text-white font-bold">R</button>
                        <button 
                          onClick={() => toggleTrackSolo(track.id)}
                          className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold transition-colors ${
                            trackStates[track.id]?.isSolo 
                              ? 'bg-yellow-500 hover:bg-yellow-400 text-black' 
                              : 'bg-gray-600 hover:bg-gray-500 text-white'
                          }`}
                        >S</button>
                        <button 
                          onClick={() => toggleTrackMute(track.id)}
                          className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold transition-colors ${
                            trackStates[track.id]?.isMuted 
                              ? 'bg-red-500 hover:bg-red-400 text-white' 
                              : 'bg-gray-600 hover:bg-gray-500 text-white'
                          }`}
                        >M</button>
                      </div>
                      <button 
                        onClick={() => handleSTSGeneration(track.id)}
                        className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded"
                      >
                        STS
                      </button>
                    </div>
                    <input type="range" min="0" max="100" defaultValue="80" className="w-full h-2 bg-gray-600 rounded-lg" />
                  </div>
                ))}
                
                {/* Add Track Button */}
                <div className="p-3">
                  <button
                    onClick={() => createTrackMutation.mutate({
                      trackType: 'speaker',
                      trackName: `Speaker ${speakerTracks.length + 1}`
                    })}
                    className="w-full border border-dashed border-gray-600 rounded-lg p-3 text-center text-gray-400 hover:text-white transition-colors"
                  >
                    <div className="text-lg mb-1">+</div>
                    <span className="text-xs">Add Track</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Right Panel - Timeline */}
            <div className="flex-1 flex flex-col overflow-hidden bg-gray-900">
              {/* Timeline Ruler */}
              <div className="h-12 bg-gray-700 border-b border-gray-600 relative overflow-hidden">
                <div 
                  className="absolute inset-0"
                  style={{ 
                    transform: `translateX(-${scrollLeft}px)`,
                    width: Math.max(maxDuration * zoomLevel, 1000),
                    minWidth: '1000px' // Ensure timeline never disappears
                  }}
                >
                  <TimelineRuler
                    zoom={zoomLevel}
                    duration={maxDuration}
                    scrollLeft={0}
                    width={Math.max(maxDuration * zoomLevel, 1000)}
                    currentTime={currentTime}
                    onSnap={handleSnap}
                  />
                </div>
              </div>
              
              {/* Waveform Area */}
              <div 
                className="flex-1 overflow-auto relative" 
                ref={timelineScrollRef} 
                onScroll={handleTimelineScroll} 
                onWheel={handleTimelineWheel}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                style={{ 
                  scrollbarWidth: 'thin',
                  scrollBehavior: 'smooth',
                  // Hardware acceleration for smoother scrolling
                  willChange: 'scroll-position',
                  transform: 'translateZ(0)',
                  // Better momentum scrolling on iOS/macOS
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                {/* Red Playhead Indicator - Always visible and positioned correctly */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none playhead-indicator"
                  style={{ 
                    left: `${globalPlaybackTime * zoomLevel}px`,
                    opacity: isGlobalPlaying ? 1 : 0.8
                  }}
                >
                  <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rounded-full"></div>
                </div>
                
                <div style={{ 
                  width: Math.max(maxDuration * zoomLevel, 1000), 
                  minWidth: '1000px' // Ensure content area never disappears
                }}>
                  {/* Source Audio Track */}
                  {sourceTrack && (
                    <div 
                      key={`source-track-${currentProject.id}-${sourceTrack.id}`}
                      className="border-b border-gray-600 bg-gray-800 flex items-center px-4" 
                      style={{height: '140px'}}
                    >
                      {sourceTrack.audioFile ? (
                        <div 
                          id={`waveform-source-${sourceTrack.id}`}
                          className="h-16 bg-gray-700 rounded overflow-hidden"
                          style={{ 
                            width: audioDurations[sourceTrack.id] 
                              ? `${audioDurations[sourceTrack.id] * zoomLevel}px`
                              : '100%', // Show full width until duration is detected
                            minWidth: '200px'
                          }}
                          onContextMenu={(e) => handleContextMenu(e, sourceTrack.id)}
                        ></div>
                      ) : (
                        <div className="w-full h-16 bg-gray-700 rounded flex items-center justify-center text-gray-400 text-sm">
                          Drop audio file here or click Import
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Speaker Tracks */}
                  {speakerTracks.map((track, index) => (
                    <div 
                      key={`speaker-track-${currentProject.id}-${track.id}`} 
                      className="border-b border-gray-600 bg-gray-800 flex items-center relative px-4"
                      style={{height: '170px'}}
                      data-track-id={track.id}
                    >
                      <div className={`absolute left-0 top-0 w-1 h-full ${index % 3 === 0 ? 'bg-green-500' : index % 3 === 1 ? 'bg-yellow-500' : 'bg-purple-500'}`}></div>
                      {track.audioFile ? (
                        <div 
                          id={`waveform-speaker-${track.id}`}
                          className="h-16 bg-gray-700 rounded ml-2 overflow-hidden"
                          style={{ 
                            width: audioDurations[track.id] 
                              ? `${audioDurations[track.id] * zoomLevel}px`
                              : '100%', // Show full width until duration is detected
                            minWidth: '200px'
                          }}
                          onContextMenu={(e) => handleContextMenu(e, track.id)}
                        ></div>
                      ) : (
                        <div className="w-full h-16 bg-gray-700 rounded flex items-center justify-center text-gray-400 text-sm ml-2">
                          Drop audio file here
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
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
        voices={selectedVoices}
        onClose={() => setStsModal({ visible: false })}
        onGenerate={(voiceId) => {
          if (stsModal.trackId) {
            generateSTSMutation.mutate({
              trackId: stsModal.trackId,
              voiceCloneId: voiceId,
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
      
      {/* Hidden audio element for source audio playback */}
      {sourceTrack?.audioFile && (
        <audio
          ref={sourceAudioRef}
          src={sourceTrack.audioFile.startsWith('http') || sourceTrack.audioFile.startsWith('/') 
            ? sourceTrack.audioFile 
            : `/uploads/${sourceTrack.audioFile}`
          }
          style={{ display: 'none' }}
        />
      )}

      <VoicesManager
        isOpen={voicesManagerOpen}
        onClose={() => setVoicesManagerOpen(false)}
        onVoicesSelected={(voices) => {
          setSelectedVoices(voices);
          toast({
            title: "Voices Updated",
            description: `${voices.length} voice${voices.length !== 1 ? 's' : ''} selected for this project`,
          });
        }}
        selectedVoiceIds={selectedVoices.map(v => v.voice_id)}
      />
    </>
  );
}