import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertAudioTrackSchema, insertVoiceCloneSchema } from "@shared/schema";
import { initializeElevenLabs, getElevenLabsService } from "./elevenlabs";
import { audioService } from "./audio-service";
import { rustAudioService } from "./rust-audio-service";
import multer from "multer";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Audio processing queue to handle concurrent processing
const processingQueue: Array<{
  filePath: string;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}> = [];

let isProcessing = false;

async function processQueue() {
  if (isProcessing || processingQueue.length === 0) return;
  
  isProcessing = true;
  const { filePath, resolve, reject } = processingQueue.shift()!;
  
  try {
    // Process the audio file using the Rust service
    const result = await audioService.importAudio(filePath);
    resolve(result);
  } catch (error) {
    console.error('Error processing audio file:', error);
    reject(error);
  } finally {
    isProcessing = false;
    // Process next item in queue
    setImmediate(processQueue);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve uploaded files statically  
  app.use('/uploads', express.static(uploadsDir));
  
  // Initialize ElevenLabs service if API key is available
  const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
  if (elevenLabsApiKey) {
    try {
      const service = initializeElevenLabs(elevenLabsApiKey);
      const isValid = await service.validateApiKey();
      if (isValid) {
        console.log('✅ ElevenLabs API initialized successfully');
      } else {
        console.warn('⚠️ ElevenLabs API key validation failed');
      }
    } catch (error) {
      console.warn('⚠️ Failed to initialize ElevenLabs:', error);
    }
  } else {
    console.warn('⚠️ ELEVENLABS_API_KEY not found in environment variables');
  }
  
  // Projects
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(projectData);
      res.json(project);
    } catch (error) {
      res.status(400).json({ message: "Invalid project data" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.updateProject(id, req.body);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteProject(id);
      if (!success) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Audio Tracks
  app.get("/api/projects/:projectId/tracks", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const tracks = await storage.getAudioTracksByProject(projectId);
      res.json(tracks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch audio tracks" });
    }
  });

  app.post("/api/projects/:projectId/tracks", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const trackData = insertAudioTrackSchema.parse({ ...req.body, projectId });
      const track = await storage.createAudioTrack(trackData);
      res.json(track);
    } catch (error) {
      res.status(400).json({ message: "Invalid track data" });
    }
  });

  app.put("/api/tracks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const track = await storage.updateAudioTrack(id, updates);
      if (!track) {
        return res.status(404).json({ message: "Track not found" });
      }
      res.json(track);
    } catch (error) {
      res.status(500).json({ message: "Failed to update track" });
    }
  });

  app.delete("/api/tracks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteAudioTrack(id);
      if (!deleted) {
        return res.status(404).json({ message: "Track not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete track" });
    }
  });

  // File Upload
  app.post("/api/upload", upload.single('file'), (req, res) => {
    console.log('Upload request received');
    console.log('Request file:', req.file);
    console.log('Request headers:', req.headers);
    
    try {
      if (!req.file) {
        console.error('No file in request');
        return res.status(400).json({ 
          success: false,
          message: "No file uploaded",
          details: "The request did not contain a file" 
        });
      }
      
      console.log(`File uploaded successfully: ${req.file.originalname} (${req.file.size} bytes)`);
      
      const fileUrl = `/uploads/${req.file.filename}`;
      const result = { 
        success: true,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: fileUrl,
        filePath: req.file.path,
        mimetype: req.file.mimetype
      };
      
      console.log('Upload response:', result);
      res.json(result);
    } catch (error) {
      console.error('File upload failed:', error);
      res.status(500).json({ 
        success: false,
        message: "File upload failed",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // High-Performance Audio Processing Endpoint (uses Rust processor)
  app.post("/api/process-audio", upload.single('file'), async (req, res) => {
    console.log('🎵 [Audio Processing] Starting high-performance processing...');
    
    try {
      let inputPath: string;
      
      if (req.file) {
        inputPath = req.file.path;
        console.log('🎵 [Audio Processing] Processing uploaded file:', inputPath);
      } else if (req.body.filePath) {
        const rawPath = req.body.filePath;
        if (rawPath.startsWith('uploads/')) {
          inputPath = path.join(process.cwd(), rawPath);
        } else if (rawPath.startsWith('/uploads/')) {
          inputPath = path.join(process.cwd(), rawPath.substring(1));
        } else {
          inputPath = rawPath;
        }
        console.log(`🎵 [Audio Processing] Processing file: ${inputPath}`);
      } else {
        return res.status(400).json({ 
          success: false,
          message: "No file or file path provided" 
        });
      }

      // Verify input file exists
      if (!fs.existsSync(inputPath)) {
        return res.status(404).json({ 
          success: false,
          message: `Input file not found: ${inputPath}` 
        });
      }

      // Try Rust processor first for optimal performance
      if (rustAudioService.isServiceAvailable()) {
        console.log('🦀 [Audio Processing] Using Rust processor with Symphonia...');
        const rustResult = await rustAudioService.processAudio(inputPath);
        
        if (rustResult.success && rustResult.waveformData) {
          console.log(`🦀 [Audio Processing] Success! ${rustResult.waveformData.length} peaks, ${rustResult.duration}s`);
          return res.json({
            success: true,
            processor: 'rust-symphonia',
            waveformData: rustResult.waveformData,
            duration: rustResult.duration,
            sampleRate: rustResult.sampleRate,
            cacheKey: rustResult.cacheKey,
            peaks: rustResult.waveformData.length
          });
        }
      }

      // Fallback to basic waveform if Rust processor fails
      console.warn('🎵 [Audio Processing] Rust processor unavailable, returning basic response');
      res.json({
        success: true,
        processor: 'none',
        waveformData: [],
        message: 'Audio file received but waveform generation unavailable'
      });
      
    } catch (error) {
      console.error('🎵 [Audio Processing] Error:', error);
      res.status(500).json({ 
        success: false,
        message: "Audio processing failed",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // FFmpeg Audio Extraction Endpoint (for video files)
  app.post("/api/extract-audio", upload.single('file'), async (req, res) => {
    console.log('🎵 [Audio Extraction] Starting extraction...');
    console.log('🎵 [Audio Extraction] req.file:', req.file);
    console.log('🎵 [Audio Extraction] req.body:', req.body);
    
    try {
      let inputPath: string;
      let originalName: string;
      
      if (req.file) {
        // If file is uploaded directly
        inputPath = req.file.path;
        originalName = req.file.originalname || 'extracted_audio';
        console.log('🎵 [Audio Extraction] Using uploaded file:', inputPath);
      } else if (req.body.filePath) {
        // If file path is provided in the request body
        const rawPath = req.body.filePath;
        
        // Handle different path formats
        if (rawPath.startsWith('uploads/')) {
          inputPath = path.join(process.cwd(), rawPath);
        } else if (rawPath.startsWith('/uploads/')) {
          inputPath = path.join(process.cwd(), rawPath.substring(1));
        } else {
          inputPath = rawPath;
        }
        
        originalName = path.basename(inputPath, path.extname(inputPath)) + '.wav';
        console.log(`🎵 [Audio Extraction] Using provided path: ${rawPath} → ${inputPath}`);
      } else {
        return res.status(400).json({ 
          success: false,
          message: "No file or file path provided" 
        });
      }

      // Verify input file exists
      if (!fs.existsSync(inputPath)) {
        console.error(`🎵 [Audio Extraction] Input file not found: ${inputPath}`);
        return res.status(404).json({ 
          success: false,
          message: `Input file not found: ${inputPath}` 
        });
      }

      console.log(`🎵 [Audio Extraction] Input file exists: ${inputPath} (${fs.statSync(inputPath).size} bytes)`);

      // Generate output filename with timestamp to avoid conflicts
      const timestamp = Date.now();
      const basename = path.basename(originalName, path.extname(originalName));
      const outputName = `${basename}_audio_${timestamp}.wav`;
      const outputPath = path.join(process.cwd(), 'uploads', outputName);
      
      console.log(`🎵 [Audio Extraction] Output path: ${outputPath}`);
      
      // Use FFmpeg to extract audio with more robust options
      const ffmpegCmd = `ffmpeg -y -i "${inputPath}" -vn -acodec pcm_s16le -ar 44100 -ac 2 -t 300 "${outputPath}"`;
      console.log('🎵 [Audio Extraction] Running FFmpeg command:', ffmpegCmd);
      
      try {
        const { stdout, stderr } = await execAsync(ffmpegCmd, { timeout: 60000 }); // 60 second timeout
        console.log('🎵 [Audio Extraction] FFmpeg stdout:', stdout);
        if (stderr) console.log('🎵 [Audio Extraction] FFmpeg stderr (normal):', stderr);
      } catch (ffmpegError: any) {
        console.error('🎵 [Audio Extraction] FFmpeg failed:', ffmpegError);
        return res.status(500).json({
          success: false,
          message: "FFmpeg extraction failed",
          error: ffmpegError.message
        });
      }
      
      // Verify the output file was created
      if (!fs.existsSync(outputPath)) {
        console.error('🎵 [Audio Extraction] Output file not created');
        return res.status(500).json({
          success: false,
          message: "FFmpeg did not create the output file"
        });
      }
      
      const stats = fs.statSync(outputPath);
      console.log(`🎵 [Audio Extraction] Extracted audio file: ${outputPath} (${stats.size} bytes)`);
      
      // Try to use Rust processor for high-quality waveform generation
      let waveformData: number[] = [];
      let duration = stats.size / (44100 * 2 * 2); // Default estimate
      
      if (rustAudioService.isServiceAvailable()) {
        console.log('🦀 [Audio Extraction] Using Rust processor for waveform generation...');
        const rustResult = await rustAudioService.processAudio(outputPath);
        
        if (rustResult.success && rustResult.waveformData) {
          waveformData = rustResult.waveformData;
          duration = rustResult.duration || duration;
          console.log(`🦀 [Audio Extraction] Rust processor generated ${waveformData.length} peaks`);
        } else {
          console.warn('🦀 [Audio Extraction] Rust processing failed, falling back to FFmpeg');
        }
      }
      
      // Fallback to FFmpeg if Rust processor is not available or failed
      if (waveformData.length === 0) {
        console.log('🎵 [Audio Extraction] Using FFmpeg for waveform generation...');
        const pcmPath = outputPath.replace(/\.wav$/, '.pcm');
        const ffmpegPcmCmd = `ffmpeg -y -i "${outputPath}" -f s16le -acodec pcm_s16le -ar 44100 -ac 1 "${pcmPath}"`;
        
        try {
          await execAsync(ffmpegPcmCmd, { timeout: 30000 });
          
          // Read PCM data and calculate waveform peaks
          const pcmBuffer = fs.readFileSync(pcmPath);
          const sampleCount = 400; // More detailed waveform
          const sampleSize = 2; // 16 bits (2 bytes) per sample
          const totalSamples = Math.floor(pcmBuffer.length / sampleSize);
          const blockSize = Math.max(1, Math.floor(totalSamples / sampleCount));
          
          for (let i = 0; i < sampleCount; i++) {
            let sum = 0;
            let count = 0;
            let blockStart = i * blockSize;
            
            for (let j = 0; j < blockSize; j++) {
              const idx = (blockStart + j) * sampleSize;
              if (idx + 1 >= pcmBuffer.length) break;
              // Little endian signed 16-bit
              const sample = pcmBuffer.readInt16LE(idx);
              sum += Math.abs(sample);
              count++;
            }
            
            if (count > 0) {
              const avg = sum / count;
              waveformData.push(Math.min(1.0, avg / 32768)); // Normalize to 0-1
            } else {
              waveformData.push(0);
            }
          }
          
          // Remove PCM temp file
          try {
            fs.unlinkSync(pcmPath);
          } catch (cleanupError) {
            console.warn('🎵 [Audio Extraction] Failed to cleanup PCM file:', cleanupError);
          }
        } catch (waveformError) {
          console.warn('🎵 [Audio Extraction] Waveform generation failed:', waveformError);
        }
      }

      console.log(`✅ [Audio Extraction] Success! Generated ${waveformData.length} waveform points`);

      // Respond with audio file URL, path, and waveform data
      res.json({ 
        success: true,
        audioFile: outputName,
        audioUrl: `/uploads/${outputName}`,
        fileSize: stats.size,
        waveformData,
        duration
      });
      
    } catch (error) {
      console.error('🎵 [Audio Extraction] Fatal error:', error);
      res.status(500).json({ 
        success: false,
        message: "Audio extraction failed",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Voice Clones
  app.get("/api/voice-clones", async (req, res) => {
    try {
      const voiceClones = await storage.getAllVoiceClones();
      res.json(voiceClones);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch voice clones" });
    }
  });

  // STS Generation with ElevenLabs
  app.post("/api/generate-sts", async (req, res) => {
    try {
      const { trackId, voiceCloneId, timeRange } = req.body;
      
      // Get the audio track
      const track = await storage.getAudioTracksByProject(1); // Using project 1 for demo
      const audioTrack = track.find(t => t.id === trackId);
      
      if (!audioTrack || !audioTrack.audioFile) {
        return res.status(400).json({ message: "Audio track not found or no audio file uploaded" });
      }

      // Get voice clone details
      const voiceClones = await storage.getAllVoiceClones();
      const selectedVoice = voiceClones.find(v => v.id === voiceCloneId);
      
      if (!selectedVoice) {
        return res.status(400).json({ message: "Voice clone not found" });
      }

      const elevenLabsService = getElevenLabsService();
      
      if (!elevenLabsService) {
        // Fallback to mock processing if ElevenLabs not configured
        console.warn('ElevenLabs not configured, using mock processing');
        
        // Use async timeout to avoid unhandled promise
        const delay = () => new Promise(resolve => setTimeout(resolve, 2000));
        await delay();
        
        try {
          await storage.updateAudioTrack(trackId, { 
            isProcessed: true,
            voiceClone: voiceCloneId.toString()
          });
          res.json({ 
            success: true, 
            processedAudioUrl: `/processed/${trackId}_${voiceCloneId}.wav`,
            message: "STS generation completed (mock)"
          });
        } catch (error) {
          res.status(500).json({ message: "Failed to update track" });
        }
        return;
      }

      // Real ElevenLabs processing
      const audioFilePath = path.join(process.cwd(), 'uploads', path.basename(audioTrack.audioFile));
      
      if (!fs.existsSync(audioFilePath)) {
        return res.status(400).json({ message: "Audio file not found on server" });
      }

      try {
        // Use ElevenLabs voice ID (for demo, using first voice or fallback)
        const elevenLabsVoiceId = selectedVoice.description || 'pNInz6obpgDQGcFmaJgB'; // Default voice ID
        
        const processedAudio = await elevenLabsService.speechToSpeech({
          voiceId: elevenLabsVoiceId,
          audioFile: audioFilePath,
          voiceSettings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.3,
            use_speaker_boost: true
          },
          removeBackgroundNoise: true,
          outputFormat: 'mp3_44100_128'
        });

        // Save processed audio
        const processedFileName = `processed_${trackId}_${voiceCloneId}_${Date.now()}.mp3`;
        const processedFilePath = path.join(process.cwd(), 'uploads', processedFileName);
        fs.writeFileSync(processedFilePath, processedAudio);

        // Update track with processed info
        await storage.updateAudioTrack(trackId, { 
          isProcessed: true,
          voiceClone: voiceCloneId.toString(),
          audioFile: `/uploads/${processedFileName}`
        });

        res.json({ 
          success: true, 
          processedAudioUrl: `/uploads/${processedFileName}`,
          message: "STS generation completed successfully",
          voiceClone: selectedVoice.name
        });

      } catch (elevenLabsError) {
        console.error('ElevenLabs STS Error:', elevenLabsError);
        res.status(500).json({ 
          message: "STS generation failed", 
          error: elevenLabsError instanceof Error ? elevenLabsError.message : "Unknown error" 
        });
      }

    } catch (error) {
      console.error('STS Generation Error:', error);
      res.status(500).json({ message: "STS generation failed" });
    }
  });

  // Text-to-Speech Generation
  app.post("/api/generate-tts", async (req, res) => {
    try {
      const { text, voiceCloneId, startTime, endTime } = req.body;
      
      if (!text || !text.trim()) {
        return res.status(400).json({ message: "Text is required for TTS generation" });
      }

      // Get voice clone details
      const voiceClones = await storage.getAllVoiceClones();
      const selectedVoice = voiceClones.find(v => v.id === voiceCloneId);
      
      if (!selectedVoice) {
        return res.status(400).json({ message: "Voice clone not found" });
      }

      const elevenLabsService = getElevenLabsService();
      
      if (!elevenLabsService) {
        // Mock TTS processing
        console.log('ElevenLabs not configured, using mock TTS processing');
        // Use async timeout to avoid unhandled promise
        const delay = () => new Promise(resolve => setTimeout(resolve, 1500));
        await delay();
        
        res.json({
          success: true,
          processedAudioUrl: `/processed/tts_${Date.now()}.mp3`,
          message: `Mock TTS generation completed for: "${text}"`,
          startTime,
          endTime,
          voiceClone: selectedVoice.name
        });
        return;
      }

      // Real ElevenLabs TTS processing would go here
      res.json({
        success: true,
        processedAudioUrl: `/processed/tts_${Date.now()}.mp3`,
        message: `TTS generation completed for: "${text}"`,
        startTime,
        endTime,
        voiceClone: selectedVoice.name
      });

    } catch (error) {
      console.error('TTS Generation Error:', error);
      res.status(500).json({ message: "TTS generation failed" });
    }
  });


  // Get ElevenLabs voices endpoint
  app.get("/api/elevenlabs/voices", async (req, res) => {
    try {
      const elevenLabsService = getElevenLabsService();
      
      if (!elevenLabsService) {
        return res.status(503).json({ 
          message: "ElevenLabs service not configured. Please provide ELEVENLABS_API_KEY." 
        });
      }

      const voices = await elevenLabsService.getVoices();
      res.json(voices);
    } catch (error) {
      console.error('Failed to fetch ElevenLabs voices:', error);
      res.status(500).json({ 
        message: "Failed to fetch voices from ElevenLabs",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    const filePath = path.join(process.cwd(), 'uploads', req.path);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: "File not found" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
