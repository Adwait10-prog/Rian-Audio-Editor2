import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

/**
 * Service for communicating with the Rust audio processor
 * This provides high-performance audio processing using Symphonia
 */
class RustAudioService {
  private baseUrl: string;
  private isAvailable: boolean = false;

  constructor() {
    this.baseUrl = process.env.RUST_AUDIO_URL || 'http://localhost:8081';
    this.checkHealth();
  }

  /**
   * Check if the Rust audio processor is running
   */
  private async checkHealth(): Promise<void> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`);
      this.isAvailable = response.data.success === true;
      console.log('🦀 [Rust Audio] Service available:', this.isAvailable);
    } catch (error) {
      this.isAvailable = false;
      console.warn('🦀 [Rust Audio] Service not available, falling back to FFmpeg');
    }
  }

  /**
   * Process audio file using Rust processor
   * Returns waveform data and audio metadata
   */
  async processAudio(filePath: string): Promise<{
    success: boolean;
    waveformData?: number[];
    duration?: number;
    sampleRate?: number;
    cacheKey?: string;
    error?: string;
  }> {
    if (!this.isAvailable) {
      return { success: false, error: 'Rust audio processor not available' };
    }

    try {
      console.log('🦀 [Rust Audio] Processing audio:', filePath);
      
      // Create form data with the audio file
      const formData = new FormData();
      const fileStream = fs.createReadStream(filePath);
      formData.append('file', fileStream, path.basename(filePath));

      // Send to Rust processor
      const response = await axios.post(`${this.baseUrl}/api/import`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      if (response.data.success && response.data.data) {
        const { cache_key, duration_seconds } = response.data.data;
        
        // Get the waveform data using the cache key
        const waveformResponse = await axios.get(
          `${this.baseUrl}/api/waveform/${cache_key}`
        );

        if (waveformResponse.data.success && waveformResponse.data.data) {
          const { peaks, sample_rate } = waveformResponse.data.data;
          
          console.log(`🦀 [Rust Audio] Processed successfully: ${peaks.length} peaks, ${duration_seconds}s duration`);
          
          return {
            success: true,
            waveformData: peaks,
            duration: duration_seconds,
            sampleRate: sample_rate,
            cacheKey: cache_key,
          };
        }
      }

      return { success: false, error: 'Failed to process audio' };
    } catch (error: any) {
      console.error('🦀 [Rust Audio] Processing error:', error.message);
      return { 
        success: false, 
        error: error.message || 'Audio processing failed' 
      };
    }
  }

  /**
   * Get cached waveform data
   */
  async getWaveform(cacheKey: string): Promise<{
    success: boolean;
    waveformData?: number[];
    duration?: number;
    sampleRate?: number;
    error?: string;
  }> {
    if (!this.isAvailable) {
      return { success: false, error: 'Rust audio processor not available' };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/api/waveform/${cacheKey}`);
      
      if (response.data.success && response.data.data) {
        const { peaks, duration, sample_rate } = response.data.data;
        return {
          success: true,
          waveformData: peaks,
          duration,
          sampleRate: sample_rate,
        };
      }

      return { success: false, error: 'Waveform not found' };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Failed to get waveform' 
      };
    }
  }

  /**
   * Extract audio from video using Rust processor
   * This is more efficient than FFmpeg for supported formats
   */
  async extractAudioFromVideo(videoPath: string): Promise<{
    success: boolean;
    audioFile?: string;
    waveformData?: number[];
    duration?: number;
    error?: string;
  }> {
    // For now, we'll use FFmpeg for video extraction
    // Rust processor handles pure audio files better
    // In future, we can add video demuxing to Rust
    return { 
      success: false, 
      error: 'Video extraction not yet implemented in Rust processor' 
    };
  }

  /**
   * Check if service is available
   */
  isServiceAvailable(): boolean {
    return this.isAvailable;
  }
}

// Export singleton instance
export const rustAudioService = new RustAudioService();