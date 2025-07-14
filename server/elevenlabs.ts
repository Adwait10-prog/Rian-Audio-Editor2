import FormData from 'form-data';
import fs from 'fs';
import { Readable } from 'stream';

export interface STSOptions {
  voiceId: string;
  audioFile: string; // path to the audio file
  modelId?: string;
  voiceSettings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
  seed?: number;
  removeBackgroundNoise?: boolean;
  outputFormat?: string;
}

export class ElevenLabsService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Convert speech from one voice to another using ElevenLabs Speech-to-Speech
   */
  async speechToSpeech(options: STSOptions): Promise<Buffer> {
    const {
      voiceId,
      audioFile,
      modelId = 'eleven_english_sts_v2',
      voiceSettings,
      seed,
      removeBackgroundNoise = false,
      outputFormat = 'mp3_44100_128'
    } = options;

    // Create form data
    const formData = new FormData();
    
    // Add audio file
    if (fs.existsSync(audioFile)) {
      formData.append('audio', fs.createReadStream(audioFile));
    } else {
      throw new Error(`Audio file not found: ${audioFile}`);
    }

    // Add required parameters
    formData.append('model_id', modelId);
    
    if (voiceSettings) {
      formData.append('voice_settings', JSON.stringify(voiceSettings));
    }
    
    if (seed !== undefined) {
      formData.append('seed', seed.toString());
    }
    
    formData.append('remove_background_noise', removeBackgroundNoise.toString());

    const url = `${this.baseUrl}/speech-to-speech/${voiceId}/stream`;
    
    const queryParams = new URLSearchParams({
      output_format: outputFormat,
      enable_logging: 'true'
    });

    try {
      const response = await fetch(`${url}?${queryParams}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          ...formData.getHeaders()
        },
        body: formData as any
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API Error: ${response.status} - ${errorText}`);
      }

      // Convert the response stream to a buffer
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('Speech-to-Speech conversion failed:', error);
      throw error;
    }
  }

  /**
   * Get available voices from ElevenLabs
   */
  async getVoices(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.status}`);
      }

      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      console.error('Failed to fetch voices:', error);
      throw error;
    }
  }

  /**
   * Check if the API key is valid
   */
  async validateApiKey(): Promise<boolean> {
    try {
      await this.getVoices();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export a singleton instance (will be initialized when API key is available)
let elevenLabsService: ElevenLabsService | null = null;

export function initializeElevenLabs(apiKey: string): ElevenLabsService {
  elevenLabsService = new ElevenLabsService(apiKey);
  return elevenLabsService;
}

export function getElevenLabsService(): ElevenLabsService | null {
  return elevenLabsService;
}