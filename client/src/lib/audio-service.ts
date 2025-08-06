import axios from 'axios';

export interface WaveformData {
  peaks: number[];
  duration: number;
  sample_rate: number;
}

export interface AudioImportResult {
  file_path: string;
  duration_seconds: number;
  cache_key: string;
}

class AudioService {
  private baseUrl: string;
  
  constructor() {
    // In Vite, use import.meta.env for environment variables
    // For local development, default to empty string which will use relative URLs
    this.baseUrl = (import.meta.env.VITE_API_URL as string) || '';
  }

  /**
   * Upload and process an audio file
   */
  async uploadAudio(file: File, projectId: string, trackName: string): Promise<{track: any, waveform: WaveformData}> {
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('projectId', projectId);
    formData.append('name', trackName);

    const response = await axios.post(`${this.baseUrl}/api/audio-tracks`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  /**
   * Get waveform data for a track
   */
  async getWaveform(trackId: string): Promise<WaveformData> {
    const response = await axios.get(`${this.baseUrl}/api/audio-tracks/${trackId}/waveform`);
    return response.data;
  }

  /**
   * Generate a waveform URL for a track
   */
  getWaveformUrl(trackId: string): string {
    return `${this.baseUrl}/api/audio-tracks/${trackId}/waveform`;
  }

  /**
   * Get the audio URL for a track
   */
  getAudioUrl(filePath: string): string {
    if (!filePath) return '';
    if (filePath.startsWith('http') || filePath.startsWith('/')) {
      return filePath;
    }
    return `${this.baseUrl}/uploads/${filePath}`;
  }

  /**
   * Check if the audio service is healthy
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/audio-service/health`);
      return response.data.status === 'healthy';
    } catch (error) {
      console.error('Audio service health check failed:', error);
      return false;
    }
  }
}

export const audioService = new AudioService();
