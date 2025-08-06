import axios from 'axios';
import { Readable } from 'stream';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

export interface WaveformData {
  peaks: number[];
  duration: number;
  sample_rate: number;
}

export interface ImportResult {
  file_path: string;
  duration_seconds: number;
  cache_key: string;
}

export class AudioService {
  private readonly baseUrl: string;
  
  constructor(baseUrl: string = process.env.AUDIO_SERVICE_URL || 'http://localhost:8081') {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }

  /**
   * Check if the audio service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`);
      return response.status === 200 && response.data?.success === true;
    } catch (error) {
      console.error('Audio service health check failed:', error);
      return false;
    }
  }

  /**
   * Import an audio file and get waveform data
   * @param filePath Path to the audio file
   */
  async importAudio(filePath: string): Promise<ImportResult> {
    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath), {
        filename: path.basename(filePath),
      });

      const response = await axios.post(`${this.baseUrl}/api/import`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        maxBodyLength: Infinity,
      });

      if (response.data?.success && response.data.data) {
        return response.data.data as ImportResult;
      } else {
        throw new Error(response.data?.error || 'Failed to import audio');
      }
    } catch (error) {
      console.error('Audio import failed:', error);
      throw new Error(`Audio import failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get waveform data for a specific audio file
   * @param cacheKey Cache key from the import result
   */
  async getWaveform(cacheKey: string): Promise<WaveformData> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/waveform/${cacheKey}`);
      
      if (response.data?.success && response.data.data) {
        return response.data.data as WaveformData;
      } else {
        throw new Error(response.data?.error || 'Failed to get waveform data');
      }
    } catch (error) {
      console.error('Failed to get waveform data:', error);
      throw new Error(`Failed to get waveform data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get peak data for a specific audio file
   * @param cacheKey Cache key from the import result
   */
  async getPeaks(cacheKey: string): Promise<{ peaks: number[]; sample_rate: number }> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/peaks/${cacheKey}`);
      
      if (response.data?.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data?.error || 'Failed to get peak data');
      }
    } catch (error) {
      console.error('Failed to get peak data:', error);
      throw new Error(`Failed to get peak data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Export a singleton instance
export const audioService = new AudioService();
