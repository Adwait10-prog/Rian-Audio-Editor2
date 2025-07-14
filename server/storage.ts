import { projects, audioTracks, voiceClones, type Project, type InsertProject, type AudioTrack, type InsertAudioTrack, type VoiceClone, type InsertVoiceClone } from "@shared/schema";

export interface IStorage {
  // Projects
  createProject(project: InsertProject): Promise<Project>;
  getProject(id: number): Promise<Project | undefined>;
  getAllProjects(): Promise<Project[]>;
  
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
    
    // Initialize with some default voice clones
    this.initializeVoiceClones();
  }

  private initializeVoiceClones() {
    const defaultVoices: InsertVoiceClone[] = [
      { name: "Voice Clone A - Professional Male", description: "Deep, professional male voice", voiceType: "male" },
      { name: "Voice Clone B - Young Female", description: "Bright, youthful female voice", voiceType: "female" },
      { name: "Voice Clone C - Mature Male", description: "Authoritative, mature male voice", voiceType: "male" },
      { name: "Voice Clone D - Elderly Voice", description: "Wise, elderly voice", voiceType: "elderly" },
      { name: "Voice Clone E - Child Voice", description: "Playful, child voice", voiceType: "child" },
    ];

    defaultVoices.forEach(voice => {
      this.createVoiceClone(voice);
    });
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.currentProjectId++;
    const project: Project = {
      ...insertProject,
      id,
      createdAt: new Date().toISOString(),
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

  async createAudioTrack(insertTrack: InsertAudioTrack): Promise<AudioTrack> {
    const id = this.currentAudioTrackId++;
    const track: AudioTrack = {
      ...insertTrack,
      id,
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

    const updatedTrack = { ...existingTrack, ...updates };
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
    };
    this.voiceClones.set(id, voiceClone);
    return voiceClone;
  }
}

export const storage = new MemStorage();
