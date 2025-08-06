-- Add cache_key column to audio_tracks table
ALTER TABLE audio_tracks 
ADD COLUMN cache_key TEXT;
