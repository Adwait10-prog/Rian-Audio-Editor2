import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  clientName: text("client_name").notNull(),
  languagePair: text("language_pair").notNull(),
  videoFile: text("video_file"),
  createdAt: text("created_at").notNull(),
});

export const audioTracks = pgTable("audio_tracks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  trackType: text("track_type").notNull(), // 'source', 'speaker', 'me'
  trackName: text("track_name").notNull(),
  audioFile: text("audio_file"),
  voiceClone: text("voice_clone"),
  isProcessed: boolean("is_processed").default(false),
  waveformData: jsonb("waveform_data"),
});

export const voiceClones = pgTable("voice_clones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  voiceType: text("voice_type").notNull(), // 'male', 'female', 'child', etc.
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
});

export const insertAudioTrackSchema = createInsertSchema(audioTracks).omit({
  id: true,
});

export const insertVoiceCloneSchema = createInsertSchema(voiceClones).omit({
  id: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertAudioTrack = z.infer<typeof insertAudioTrackSchema>;
export type AudioTrack = typeof audioTracks.$inferSelect;
export type InsertVoiceClone = z.infer<typeof insertVoiceCloneSchema>;
export type VoiceClone = typeof voiceClones.$inferSelect;
