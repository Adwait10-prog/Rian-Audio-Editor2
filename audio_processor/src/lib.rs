//! Audio processing library for Rian Audio Editor
//! 
//! This library provides high-performance audio processing capabilities
//! including waveform generation, peak detection, and audio analysis.

pub mod audio_processor;

// Re-export commonly used types
pub use audio_processor::{
    AudioError, AudioProcessor, ImportResult, PeakCache, WaveformData, CACHE_DIR, UPLOAD_DIR,
};

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn test_audio_processor_initialization() {
        let processor = AudioProcessor::new();
        assert!(processor.waveform_cache.lock().unwrap().is_empty());
        assert!(processor.cache.lock().unwrap().is_empty());
    }
}
