const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

// Configuration
const API_BASE_URL = 'http://localhost:5001';
const TEST_AUDIO_FILE = path.join(__dirname, 'test-audio.wav');

// Test data
let testProjectId;
let testTrackId;
let testCacheKey;

async function runTests() {
  try {
    console.log('Starting integration tests...');
    
    // 1. Test audio service health
    console.log('\n1. Testing audio service health...');
    await testHealthCheck();
    
    // 2. Create a test project
    console.log('\n2. Creating test project...');
    testProjectId = await createTestProject();
    
    // 3. Test audio file upload and processing
    console.log('\n3. Testing audio file upload and processing...');
    const uploadResult = await testAudioUpload(testProjectId);
    testTrackId = uploadResult.trackId;
    testCacheKey = uploadResult.cacheKey;
    
    // 4. Test waveform generation
    console.log('\n4. Testing waveform generation...');
    await testWaveformGeneration(testTrackId);
    
    // 5. Test audio playback
    console.log('\n5. Testing audio playback...');
    await testAudioPlayback(testTrackId);
    
    console.log('\n✅ All tests passed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

async function testHealthCheck() {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/audio-service/health`);
    console.log('Audio service health:', response.data);
    if (response.data.status !== 'healthy') {
      throw new Error('Audio service is not healthy');
    }
  } catch (error) {
    console.error('Health check failed:', error.message);
    throw error;
  }
}

async function createTestProject() {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/projects`, {
      name: 'Integration Test Project',
      clientName: 'Test Client',
      languagePair: 'en-US',
    });
    
    console.log('Created test project with ID:', response.data.id);
    return response.data.id;
  } catch (error) {
    console.error('Failed to create test project:', error.message);
    throw error;
  }
}

async function testAudioUpload(projectId) {
  try {
    if (!fs.existsSync(TEST_AUDIO_FILE)) {
      throw new Error(`Test audio file not found at ${TEST_AUDIO_FILE}`);
    }
    
    const formData = new FormData();
    formData.append('audio', fs.createReadStream(TEST_AUDIO_FILE));
    formData.append('projectId', projectId);
    formData.append('name', 'Test Audio Track');
    
    const response = await axios.post(
      `${API_BASE_URL}/api/audio-tracks`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
      }
    );
    
    console.log('Audio upload successful. Track ID:', response.data.id);
    console.log('Cache key:', response.data.cacheKey);
    
    return {
      trackId: response.data.id,
      cacheKey: response.data.cacheKey,
    };
  } catch (error) {
    console.error('Audio upload test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

async function testWaveformGeneration(trackId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/audio-tracks/${trackId}/waveform`);
    
    if (!response.data || !response.data.peaks || !response.data.duration) {
      throw new Error('Invalid waveform data received');
    }
    
    console.log('Waveform data received. Peaks:', response.data.peaks.length);
    console.log('Duration:', response.data.duration, 'seconds');
    
    return response.data;
  } catch (error) {
    console.error('Waveform generation test failed:', error.message);
    throw error;
  }
}

async function testAudioPlayback(trackId) {
  try {
    // Get track info to verify audio file exists
    const trackResponse = await axios.get(`${API_BASE_URL}/api/audio-tracks/${trackId}`);
    const audioUrl = `${API_BASE_URL}/uploads/${trackResponse.data.audioFile}`;
    
    console.log('Audio file URL:', audioUrl);
    
    // Verify audio file is accessible
    const headResponse = await axios.head(audioUrl);
    console.log('Audio file accessible. Status:', headResponse.status);
    
    return true;
  } catch (error) {
    console.error('Audio playback test failed:', error.message);
    throw error;
  }
}

// Run the tests
runTests();
