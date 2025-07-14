import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertAudioTrackSchema, insertVoiceCloneSchema } from "@shared/schema";
import multer from "multer";
import path from "path";

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  
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
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ 
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: fileUrl
      });
    } catch (error) {
      res.status(500).json({ message: "File upload failed" });
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

  // STS Generation (mock endpoint)
  app.post("/api/generate-sts", async (req, res) => {
    try {
      const { trackId, voiceCloneId, timeRange } = req.body;
      
      // Simulate STS processing
      setTimeout(() => {
        // In a real implementation, this would call the actual STS service
        res.json({ 
          success: true, 
          processedAudioUrl: `/processed/${trackId}_${voiceCloneId}.wav`,
          message: "STS generation completed"
        });
      }, 2000);
    } catch (error) {
      res.status(500).json({ message: "STS generation failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
