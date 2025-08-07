import { projects, audioTracks, voiceClones, type Project, type InsertProject, type AudioTrack, type InsertAudioTrack, type VoiceClone, type InsertVoiceClone } from "@shared/schema";

export interface IStorage {
  // Projects
  createProject(project: InsertProject): Promise<Project>;
  getProject(id: number): Promise<Project | undefined>;
  getAllProjects(): Promise<Project[]>;
  updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  
  // Audio Tracks
  createAudioTrack(track: InsertAudioTrack): Promise<AudioTrack>;
  getAudioTracksByProject(projectId: number): Promise<AudioTrack[]>;
  updateAudioTrack(id: number, updates: Partial<AudioTrack>): Promise<AudioTrack | undefined>;
  deleteAudioTrack(id: number): Promise<boolean>;
  
  // Voice Clones
  getAllVoiceClones(): Promise<VoiceClone[]>;
  createVoiceClone(voiceClone: InsertVoiceClone): Promise<VoiceClone>;
}

export class MemStorage implements IStorage {
  private projects: Map<number, Project>;
  private audioTracks: Map<number, AudioTrack>;
  private voiceClones: Map<number, VoiceClone>;
  private currentProjectId: number;
  private currentAudioTrackId: number;
  private currentVoiceCloneId: number;

  constructor() {
    this.projects = new Map();
    this.audioTracks = new Map();
    this.voiceClones = new Map();
    this.currentProjectId = 1;
    this.currentAudioTrackId = 1;
    this.currentVoiceCloneId = 1;
    
    // Initialize with some default voice clones and demo project
    this.initializeVoiceClones();
    this.initializeDemoProject();
  }

  private initializeVoiceClones() {
    const defaultVoices: InsertVoiceClone[] = [
      { 
        name: "Rachel - Professional Female", 
        description: "21m00Tcm4TlvDq8ikWAM", // ElevenLabs voice ID for Rachel
        voiceType: "female" 
      },
      { 
        name: "Drew - Confident Male", 
        description: "29vD33N1CtxCmqQRPOHJ", // ElevenLabs voice ID for Drew
        voiceType: "male" 
      },
      { 
        name: "Clyde - Professional Male", 
        description: "2EiwWnXFnvU5JabPnv8n", // ElevenLabs voice ID for Clyde
        voiceType: "male" 
      },
      { 
        name: "Domi - Authoritative Female", 
        description: "AZnzlk1XvdvUeBnXmlld", // ElevenLabs voice ID for Domi
        voiceType: "female" 
      },
      { 
        name: "Dave - Warm Male", 
        description: "CYw3kZ02Hs0563khs1Fj", // ElevenLabs voice ID for Dave
        voiceType: "male" 
      },
      { 
        name: "Fin - Mature Professional", 
        description: "D38z5RcWu1voky8WS1ja", // ElevenLabs voice ID for Fin
        voiceType: "male" 
      },
    ];

    defaultVoices.forEach(voice => {
      this.createVoiceClone(voice);
    });
  }

  private async initializeDemoProject() {
    // Create a demo project
    const demoProject = await this.createProject({
      name: "Sample STS Project",
      clientName: "Demo Client",
      languagePair: "English to English",
      videoFile: null
    });

    // Create source audio track
    await this.createAudioTrack({
      projectId: demoProject.id,
      trackType: "source",
      trackName: "Source Audio",
      audioFile: null,
      originalFileName: null,
      fileSize: null,
      duration: null,
      voiceClone: null,
      isProcessed: false,
      waveformData: null
    });

    // Create a couple of speaker tracks
    await this.createAudioTrack({
      projectId: demoProject.id,
      trackType: "speaker",
      trackName: "Speaker 1",
      audioFile: null,
      originalFileName: null,
      fileSize: null,
      duration: null,
      voiceClone: null,
      isProcessed: false,
      waveformData: null
    });

    await this.createAudioTrack({
      projectId: demoProject.id,
      trackType: "speaker",
      trackName: "Speaker 2",
      audioFile: null,
      originalFileName: null,
      fileSize: null,
      duration: null,
      voiceClone: null,
      isProcessed: false,
      waveformData: null
    });
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.currentProjectId++;
    const now = new Date().toISOString();
    const project: Project = {
      ...insertProject,
      id,
      createdAt: now,
      updatedAt: now,
      videoFile: insertProject.videoFile || null,
      sourceAudioFile: insertProject.sourceAudioFile || null,
      videoDuration: insertProject.videoDuration || null,
    };
    this.projects.set(id, project);
    return project;
  }

  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined> {
    const existingProject = this.projects.get(id);
    if (!existingProject) return undefined;

    const updatedProject = { 
      ...existingProject, 
      ...updates, 
      updatedAt: new Date().toISOString() 
    };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    const deleted = this.projects.delete(id);
    if (deleted) {
      // Also delete all tracks for this project
      const tracksToDelete = Array.from(this.audioTracks.entries())
        .filter(([_, track]) => track.projectId === id)
        .map(([id, _]) => id);
      
      tracksToDelete.forEach(trackId => this.audioTracks.delete(trackId));
    }
    return deleted;
  }

  async createAudioTrack(insertTrack: InsertAudioTrack): Promise<AudioTrack> {
    const id = this.currentAudioTrackId++;
    const now = new Date().toISOString();
    const track: AudioTrack = {
      ...insertTrack,
      id,
      createdAt: now,
      updatedAt: now,
      audioFile: insertTrack.audioFile || null,
      originalFileName: insertTrack.originalFileName || null,
      fileSize: insertTrack.fileSize || null,
      duration: insertTrack.duration || null,
      voiceClone: insertTrack.voiceClone || null,
      isProcessed: insertTrack.isProcessed || false,
      waveformData: insertTrack.waveformData || null,
    };
    this.audioTracks.set(id, track);
    return track;
  }

  async getAudioTracksByProject(projectId: number): Promise<AudioTrack[]> {
    return Array.from(this.audioTracks.values()).filter(track => track.projectId === projectId);
  }

  async updateAudioTrack(id: number, updates: Partial<AudioTrack>): Promise<AudioTrack | undefined> {
    const existingTrack = this.audioTracks.get(id);
    if (!existingTrack) return undefined;

    const updatedTrack = { 
      ...existingTrack, 
      ...updates, 
      updatedAt: new Date().toISOString() 
    };
    this.audioTracks.set(id, updatedTrack);
    return updatedTrack;
  }

  async deleteAudioTrack(id: number): Promise<boolean> {
    return this.audioTracks.delete(id);
  }

  async getAllVoiceClones(): Promise<VoiceClone[]> {
    return Array.from(this.voiceClones.values());
  }

  async createVoiceClone(insertVoiceClone: InsertVoiceClone): Promise<VoiceClone> {
    const id = this.currentVoiceCloneId++;
    const voiceClone: VoiceClone = {
      ...insertVoiceClone,
      id,
      description: insertVoiceClone.description || null,
    };
    this.voiceClones.set(id, voiceClone);
    return voiceClone;
  }
}

export const storage = new MemStorage();
