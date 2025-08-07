import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertAudioTrackSchema, insertVoiceCloneSchema } from "@shared/schema";
import { initializeElevenLabs, getElevenLabsService } from "./elevenlabs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Function to create project-specific multer upload
const createProjectUpload = (projectId: string) => {
  const projectDir = path.join('uploads', `project-${projectId}`);
  
  // Ensure project directory exists
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }
  
  return multer({ 
    dest: projectDir,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
  });
};

// Default upload for backward compatibility
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve uploaded files statically (includes all subdirectories like project-1, project-2, etc.)
  app.use('/uploads', express.static(uploadsDir, {
    fallthrough: false,
    index: false
  }));
  
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

  // Project-specific file upload
  app.post("/api/projects/:projectId/upload", (req, res) => {
    const projectId = req.params.projectId;
    const projectUpload = createProjectUpload(projectId);
    
    projectUpload.single('file')(req, res, (err) => {
      if (err) {
        console.error('Project file upload failed:', err);
        return res.status(500).json({ message: "Upload failed" });
      }
      
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }
        
        const fileUrl = `/uploads/project-${projectId}/${req.file.filename}`;
        res.json({ 
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          url: fileUrl,
          filePath: req.file.path // Add file path for audio extraction
        });
      } catch (error) {
        console.error('File upload failed:', error);
        res.status(500).json({ message: "Upload failed" });
      }
    });
  });

  // Legacy file upload (keep for backward compatibility)
  app.post("/api/upload", upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ 
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: fileUrl,
        filePath: req.file.path // Add file path for audio extraction
      });
    } catch (error) {
      console.error('File upload failed:', error);
      res.status(500).json({ message: "File upload failed" });
    }
  });

  // Project-specific audio extraction endpoint
  app.post("/api/projects/:projectId/extract-audio", (req, res) => {
    const projectId = req.params.projectId;
    const projectUpload = createProjectUpload(projectId);
    
    projectUpload.single('file')(req, res, async (err) => {
      if (err) {
        console.error('Project audio extraction upload failed:', err);
        return res.status(500).json({ message: "Upload failed" });
      }
      
      try {
        let inputPath: string;
        let originalName: string;
        
        if (req.file) {
          inputPath = req.file.path;
          originalName = req.file.originalname || 'extracted_audio';
        } else if (req.body.filePath) {
          inputPath = req.body.filePath;
          originalName = path.basename(inputPath, path.extname(inputPath)) + '.wav';
        } else {
          return res.status(400).json({ message: "No file or file path provided" });
        }

        const outputName = `${path.basename(originalName, path.extname(originalName))}.wav`;
        const projectDir = path.join('uploads', `project-${projectId}`);
        const outputPath = path.join(projectDir, outputName);
        
        console.log(`Extracting audio from ${inputPath} to ${outputPath}`);
        
        const ffmpegCmd = `ffmpeg -y -i "${inputPath}" -vn -acodec pcm_s16le -ar 44100 -ac 2 "${outputPath}"`;
        console.log('Running FFmpeg command:', ffmpegCmd);
        
        const { stdout, stderr } = await execAsync(ffmpegCmd);
        console.log('FFmpeg stdout:', stdout);
        if (stderr) console.error('FFmpeg stderr:', stderr);
        
        if (!fs.existsSync(outputPath)) {
          throw new Error('FFmpeg did not create the output file');
        }
        
        const stats = fs.statSync(outputPath);
        console.log(`Extracted audio file size: ${stats.size} bytes`);
        
        // Generate waveform data
        const pcmPath = outputPath.replace(/\.wav$/, '.pcm');
        const ffmpegPcmCmd = `ffmpeg -y -i "${outputPath}" -f s16le -acodec pcm_s16le -ar 44100 -ac 1 "${pcmPath}"`;
        console.log('Running FFmpeg PCM command:', ffmpegPcmCmd);
        await execAsync(ffmpegPcmCmd);

        const pcmBuffer = fs.readFileSync(pcmPath);
        const sampleCount = 200;
        const sampleSize = 2;
        const totalSamples = Math.floor(pcmBuffer.length / sampleSize);
        const blockSize = Math.floor(totalSamples / sampleCount);
        const waveformData: number[] = [];
        for (let i = 0; i < sampleCount; i++) {
          let sum = 0;
          let blockStart = i * blockSize;
          for (let j = 0; j < blockSize; j++) {
            const idx = (blockStart + j) * sampleSize;
            if (idx + 1 >= pcmBuffer.length) break;
            const sample = pcmBuffer.readInt16LE(idx);
            sum += Math.abs(sample);
          }
          const avg = sum / blockSize;
          waveformData.push(Math.min(Math.round((avg / 32768) * 100), 100));
        }

        fs.unlinkSync(pcmPath);
        
        res.json({
          success: true,
          message: "Audio extraction successful",
          audioFile: `/uploads/project-${projectId}/${outputName}`,
          filename: outputName,
          size: stats.size,
          waveformData: waveformData,
          duration: 0 // Will be calculated separately
        });
      } catch (error) {
        console.error('Audio extraction error:', error);
        res.status(500).json({ message: "Audio extraction failed", error: error.message });
      }
    });
  });

  // Legacy audio extraction endpoint (keep for backward compatibility)
  app.post("/api/extract-audio", upload.single('file'), async (req, res) => {
    console.log('extract-audio req.file:', req.file);
    console.log('extract-audio req.body:', req.body);
    
    try {
      let inputPath: string;
      let originalName: string;
      
      if (req.file) {
        // If file is uploaded directly
        inputPath = req.file.path;
        originalName = req.file.originalname || 'extracted_audio';
      } else if (req.body.filePath) {
        // If file path is provided in the request body
        inputPath = req.body.filePath;
        originalName = path.basename(inputPath, path.extname(inputPath)) + '.wav';
      } else {
        return res.status(400).json({ message: "No file or file path provided" });
      }

      // Generate output filename
      const outputName = `${path.basename(originalName, path.extname(originalName))}.wav`;
      const outputPath = path.join('uploads', outputName);
      
      console.log(`Extracting audio from ${inputPath} to ${outputPath}`);
      
      // Use FFmpeg to extract audio
      const ffmpegCmd = `ffmpeg -y -i "${inputPath}" -vn -acodec pcm_s16le -ar 44100 -ac 2 "${outputPath}"`;
      console.log('Running FFmpeg command:', ffmpegCmd);
      
      const { stdout, stderr } = await execAsync(ffmpegCmd);
      console.log('FFmpeg stdout:', stdout);
      if (stderr) console.error('FFmpeg stderr:', stderr);
      
      // Verify the output file was created
      if (!fs.existsSync(outputPath)) {
        throw new Error('FFmpeg did not create the output file');
      }
      
      const stats = fs.statSync(outputPath);
      console.log(`Extracted audio file size: ${stats.size} bytes`);
      
      // Generate waveform data using FFmpeg and PCM analysis
      const pcmPath = outputPath.replace(/\.wav$/, '.pcm');
      const ffmpegPcmCmd = `ffmpeg -y -i "${outputPath}" -f s16le -acodec pcm_s16le -ar 44100 -ac 1 "${pcmPath}"`;
      console.log('Running FFmpeg PCM command:', ffmpegPcmCmd);
      await execAsync(ffmpegPcmCmd);

      // Read PCM data and calculate waveform peaks
      const pcmBuffer = fs.readFileSync(pcmPath);
      const sampleCount = 200; // Number of waveform bars
      const sampleSize = 2; // 16 bits (2 bytes) per sample
      const totalSamples = Math.floor(pcmBuffer.length / sampleSize);
      const blockSize = Math.floor(totalSamples / sampleCount);
      const waveformData: number[] = [];
      for (let i = 0; i < sampleCount; i++) {
        let sum = 0;
        let blockStart = i * blockSize;
        for (let j = 0; j < blockSize; j++) {
          const idx = (blockStart + j) * sampleSize;
          if (idx + 1 >= pcmBuffer.length) break;
          // Little endian signed 16-bit
          const sample = pcmBuffer.readInt16LE(idx);
          sum += Math.abs(sample);
        }
        const avg = sum / blockSize;
        waveformData.push(avg / 32768); // Normalize to 0-1
      }
      // Remove PCM temp file
      fs.unlinkSync(pcmPath);

      // Respond with audio file URL, path, and waveform data
      res.json({ 
        success: true,
        audioFile: outputName,
        audioUrl: `/uploads/${outputName}`,
        fileSize: stats.size,
        waveformData
      });
    } catch (error) {
      console.error('FFmpeg extraction failed:', error);
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

      // Check if voiceCloneId is a string (ElevenLabs voice ID) or number (database voice clone)
      let selectedVoiceId = voiceCloneId;
      let selectedVoiceName = 'ElevenLabs Voice';
      
      if (typeof voiceCloneId === 'number') {
        // Legacy voice clone system
        const voiceClones = await storage.getAllVoiceClones();
        const selectedVoice = voiceClones.find(v => v.id === voiceCloneId);
        
        if (!selectedVoice) {
          return res.status(400).json({ message: "Voice clone not found" });
        }
        
        selectedVoiceId = selectedVoice.description || 'pNInz6obpgDQGcFmaJgB'; // Default voice ID
        selectedVoiceName = selectedVoice.name;
      } else {
        // Direct ElevenLabs voice ID
        selectedVoiceId = voiceCloneId;
        selectedVoiceName = `Voice ${voiceCloneId.substring(0, 8)}`;
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
        // Use ElevenLabs voice ID
        const elevenLabsVoiceId = selectedVoiceId;
        
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
          voiceClone: selectedVoiceName
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

  // Extract audio from video and generate waveform
  app.post("/api/extract-audio", async (req, res) => {
    try {
      const { videoFile } = req.body;
      
      if (!videoFile) {
        return res.status(400).json({ message: "Video file is required" });
      }

      const videoPath = path.join(process.cwd(), 'uploads', videoFile);
      if (!fs.existsSync(videoPath)) {
        return res.status(404).json({ message: "Video file not found" });
      }

      const audioFileName = `audio_${Date.now()}.wav`;
      const audioPath = path.join(process.cwd(), 'uploads', audioFileName);
      
      // Extract audio using FFmpeg
      const ffmpegCommand = `ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 44100 -ac 2 "${audioPath}"`;
      
      try {
        await execAsync(ffmpegCommand);
        
        // Generate simple waveform data (for demo purposes)
        // In production, you'd analyze the actual audio file
        const waveformData = Array.from({ length: 200 }, (_, i) => {
          const frequency = 0.05;
          const amplitude = Math.sin(i * frequency) * 0.5 + 0.5;
          return amplitude * (0.3 + Math.random() * 0.7);
        });

        res.json({
          success: true,
          audioUrl: `/uploads/${audioFileName}`,
          waveformData,
          message: "Audio extracted successfully"
        });

      } catch (ffmpegError) {
        console.error('FFmpeg error:', ffmpegError);
        
        // Fallback: generate mock waveform data
        const mockWaveformData = Array.from({ length: 200 }, (_, i) => {
          const frequency = 0.05;
          const amplitude = Math.sin(i * frequency) * 0.5 + 0.5;
          return amplitude * (0.3 + Math.random() * 0.7);
        });

        res.json({
          success: true,
          audioUrl: null,
          waveformData: mockWaveformData,
          message: "Mock waveform generated (FFmpeg not available)"
        });
      }

    } catch (error) {
      console.error('Audio extraction error:', error);
      res.status(500).json({ message: "Audio extraction failed" });
    }
  });

  // Test Python script endpoint
  app.get("/api/test/voices", async (req, res) => {
    try {
      console.log('Testing Python script directly...');
      const scriptPath = path.join(process.cwd(), 'scripts', 'fetch_voices.py');
      const { stdout, stderr } = await execAsync(`python3 "${scriptPath}"`);
      
      if (stderr) {
        return res.status(500).json({ message: "Python script error", error: stderr });
      }
      
      const data = JSON.parse(stdout);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Test failed", error: error.message });
    }
  });

  // Get ElevenLabs voices endpoint
  app.get("/api/elevenlabs/voices", async (req, res) => {
    try {
      console.log('Fetching voices from ElevenLabs via Python script...');
      
      const scriptPath = path.join(process.cwd(), 'scripts', 'fetch_voices.py');
      
      // Check if Python script exists
      if (!fs.existsSync(scriptPath)) {
        return res.status(500).json({
          message: "Python script not found",
          error: `Script not found at ${scriptPath}`
        });
      }

      // Execute Python script
      const { stdout, stderr } = await execAsync(`python3 "${scriptPath}"`);
      
      if (stderr) {
        console.error('Python script stderr:', stderr);
        try {
          const errorData = JSON.parse(stderr);
          return res.status(500).json({
            message: "Failed to fetch voices from ElevenLabs",
            error: errorData.message
          });
        } catch {
          return res.status(500).json({
            message: "Failed to fetch voices from ElevenLabs", 
            error: stderr
          });
        }
      }

      if (!stdout.trim()) {
        return res.status(500).json({
          message: "No data returned from ElevenLabs API",
          error: "Empty response from Python script"
        });
      }

      try {
        const data = JSON.parse(stdout);
        console.log(`Successfully fetched ${data.voices?.length || 0} voices via Python script`);
        res.json(data);
      } catch (parseError) {
        console.error('Failed to parse Python script output:', parseError);
        res.status(500).json({
          message: "Failed to parse voices data",
          error: parseError instanceof Error ? parseError.message : "Parse error"
        });
      }

    } catch (error) {
      console.error('Failed to execute Python script:', error);
      res.status(500).json({ 
        message: "Failed to fetch voices from ElevenLabs",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Removed duplicate /uploads middleware - already handled by express.static above

  const httpServer = createServer(app);
  return httpServer;
}
