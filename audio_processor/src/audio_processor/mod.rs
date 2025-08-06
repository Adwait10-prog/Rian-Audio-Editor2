use anyhow::{anyhow, Result};
use actix_web::web;
use bincode;
use futures::StreamExt;
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use symphonia::core::audio::SampleBuffer;
use symphonia::core::codecs::DecoderOptions;
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use tokio::io::AsyncReadExt;

// Constants for directories
lazy_static! {
    pub static ref UPLOAD_DIR: &'static str = "uploads";
    pub static ref CACHE_DIR: &'static str = "cache";
}

// Audio processing results
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImportResult {
    pub file_path: String,
    pub duration_seconds: f64,
    pub cache_key: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WaveformData {
    pub peaks: Vec<f32>,
    pub duration: f64,
    pub sample_rate: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PeakCache {
    pub peaks: Vec<f32>,
    pub sample_rate: u32,
}

// Error type for audio processing
#[derive(Debug, thiserror::Error)]
pub enum AudioError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("Symphonia error: {0}")]
    Symphonia(String),
    
    #[error("Invalid audio file: {0}")]
    InvalidAudioFile(String),
    
    #[error("Cache error: {0}")]
    Cache(String),
    
    #[error("Processing error: {0}")]
    Processing(String),
}

// Main audio processor struct
pub struct AudioProcessor {
    cache: Mutex<HashMap<String, PeakCache>>,
    waveform_cache: Mutex<HashMap<String, WaveformData>>,
}

impl AudioProcessor {
    pub fn new() -> Self {
        Self {
            cache: Mutex::new(HashMap::new()),
            waveform_cache: Mutex::new(HashMap::new()),
        }
    }

    // Process an uploaded audio file
    pub async fn process_upload(
        &mut self,
        mut payload: actix_web::web::Payload,
    ) -> Result<ImportResult, AudioError> {
        // Create uploads directory if it doesn't exist
        fs::create_dir_all(*UPLOAD_DIR)?;
        
        // Generate a unique filename
        let file_name = format!("{}.wav", uuid::Uuid::new_v4());
        let file_path = Path::new(*UPLOAD_DIR).join(&file_name);
        
        // Save the uploaded file
        let mut file = File::create(&file_path)?;
        let mut bytes = Vec::new();
        
        while let Some(chunk) = payload.next().await {
            let chunk = chunk.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
            bytes.extend_from_slice(&chunk);
        }
        
        file.write_all(&bytes)?;
        
        // Process the audio file
        self.analyze_audio(&file_path).await
    }
    
    // Analyze audio file and generate waveform data
    pub async fn analyze_audio<P: AsRef<Path>>(
        &self,
        file_path: P,
    ) -> Result<ImportResult, AudioError> {
        let file_path = file_path.as_ref();
        
        // Generate cache key from file content
        let cache_key = self.generate_cache_key(file_path).await?;
        
        // Check if we already have this file in cache
        if self.waveform_cache.lock().unwrap().contains_key(&cache_key) {
            let waveform = self.waveform_cache.lock().unwrap().get(&cache_key).unwrap().clone();
            return Ok(ImportResult {
                file_path: file_path.to_string_lossy().to_string(),
                duration_seconds: waveform.duration,
                cache_key,
            });
        }
        
        // Open the audio file
        let file = File::open(file_path)?;
        let mss = MediaSourceStream::new(Box::new(file), Default::default());
        
        // Create a probe to detect the format
        let mut hint = Hint::new();
        if let Some(ext) = file_path.extension().and_then(|e| e.to_str()) {
            hint.with_extension(ext);
        }
        
        let format_opts = FormatOptions::default();
        let metadata_opts = MetadataOptions::default();
        let decoder_opts = DecoderOptions::default();
        
        // Probe the audio file
        let probed = symphonia::default::get_probe()
            .format(&hint, mss, &format_opts, &metadata_opts)
            .map_err(|e| AudioError::Symphonia(e.to_string()))?;
        
        // Get the default track
        let track = probed.format.default_track().ok_or_else(|| {
            AudioError::InvalidAudioFile("No default track found".to_string())
        })?;
        
        // Create a decoder
        let mut decoder = symphonia::default::get_codecs()
            .make(&track.codec_params, &decoder_opts)
            .map_err(|e| AudioError::Symphonia(e.to_string()))?;
        
        // Get the sample rate and duration
        let sample_rate = track
            .codec_params
            .sample_rate
            .ok_or_else(|| AudioError::InvalidAudioFile("Could not determine sample rate".to_string()))?;
            
        let duration = track
            .codec_params
            .n_frames
            .map(|frames| frames as f64 / sample_rate as f64)
            .ok_or_else(|| AudioError::InvalidAudioFile("Could not determine duration".to_string()))?;
        
        // Process the audio to generate waveform data
        let mut waveform_data = self.process_audio_frames(probed.format, &mut decoder, sample_rate)?;
        waveform_data.duration = duration;
        
        // Cache the results
        self.waveform_cache
            .lock()
            .unwrap()
            .insert(cache_key.clone(), waveform_data);
        
        Ok(ImportResult {
            file_path: file_path.to_string_lossy().to_string(),
            duration_seconds: duration,
            cache_key,
        })
    }
    
    // Process audio frames to generate waveform data
    fn process_audio_frames(
        &self,
        mut format: Box<dyn symphonia::core::formats::FormatReader>,
        decoder: &mut Box<dyn symphonia::core::codecs::Decoder>,
        sample_rate: u32,
    ) -> Result<WaveformData, AudioError> {
        let mut peaks = Vec::new();
        let mut sample_buffer = None;
        
        // Process each packet in the audio file
        while let Ok(packet) = format.next_packet() {
            // Decode the packet
            let decoded = decoder.decode(&packet).map_err(|e| {
                AudioError::Symphonia(format!("Decode error: {}", e))
            })?;
            
            // Get the decoded audio buffer
            let spec = decoded.spec();
            
            // Create or reuse a sample buffer
            let buffer = match &mut sample_buffer {
                Some(buffer) => buffer,
                None => {
                    let new_buffer = SampleBuffer::<f32>::new(decoded.capacity() as u64, *spec);
                    sample_buffer = Some(new_buffer);
                    sample_buffer.as_mut().unwrap()
                }
            };
            
            // Copy the decoded samples to the sample buffer
            buffer.copy_interleaved_ref(decoded);
            
            // Process the samples to generate peaks
            let samples = buffer.samples();
            let chunk_size = sample_rate as usize / 50; // 50 FPS for waveform
            
            for chunk in samples.chunks(chunk_size) {
                let peak = chunk
                    .iter()
                    .map(|&s| s.abs())
                    .fold(0.0f32, |a, b| a.max(b));
                peaks.push(peak);
            }
        }
        
        Ok(WaveformData {
            peaks,
            duration: 0.0, // Will be set by the caller
            sample_rate,
        })
    }
    
    // Generate a cache key for a file
    async fn generate_cache_key<P: AsRef<Path>>(&self, path: P) -> Result<String, AudioError> {
        let path = path.as_ref();
        let metadata = fs::metadata(path)?;
        let modified = metadata.modified()?.duration_since(std::time::UNIX_EPOCH).unwrap().as_secs();
        
        let mut hasher = Sha256::new();
        hasher.update(path.to_string_lossy().as_bytes());
        hasher.update(modified.to_be_bytes());
        hasher.update(metadata.len().to_be_bytes());
        
        let result = hasher.finalize();
        Ok(hex::encode(result))
    }
    
    // Get waveform data for a cache key
    pub async fn get_waveform(&self, cache_key: &str) -> Result<WaveformData, AudioError> {
        self.waveform_cache
            .lock()
            .unwrap()
            .get(cache_key)
            .cloned()
            .ok_or_else(|| AudioError::Cache("Waveform data not found in cache".to_string()))
    }
    
    // Get peaks for a cache key
    pub async fn get_peaks(&self, cache_key: &str) -> Result<PeakCache, AudioError> {
        self.cache
            .lock()
            .unwrap()
            .get(cache_key)
            .cloned()
            .ok_or_else(|| AudioError::Cache("Peak data not found in cache".to_string()))
    }
}
