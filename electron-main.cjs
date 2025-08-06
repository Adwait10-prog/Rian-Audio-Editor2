const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;
let rustAudioProcessor;

function createWindow() {
  try {
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 900,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
      show: false, // Don't show until ready
    });
    
    // Show window when ready
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
      console.log('Window displayed successfully');
    });
    
    // Handle load errors
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Failed to load:', errorCode, errorDescription);
      // Retry after 3 seconds
      setTimeout(() => {
        mainWindow.reload();
      }, 3000);
    });
    
    mainWindow.loadURL('http://localhost:5001');
    
    mainWindow.on('closed', () => {
      mainWindow = null;
      if (serverProcess) {
        serverProcess.kill();
      }
      if (rustAudioProcessor) {
        rustAudioProcessor.kill();
      }
    });
  } catch (error) {
    console.error('Error creating window:', error);
  }
}

function startBackend() {
  // Start the Express backend as a child process
  serverProcess = spawn('npm', ['run', 'dev:server'], {
    cwd: path.join(__dirname),
    shell: true,
    env: { ...process.env, PORT: '5001' },
    stdio: 'inherit',
  });
}

function startRustAudioProcessor() {
  // Start the Rust audio processor if cargo is available
  const audioProcessorPath = path.join(__dirname, 'audio_processor');
  
  console.log('Starting Rust audio processor...');
  rustAudioProcessor = spawn('cargo', ['run'], {
    cwd: audioProcessorPath,
    shell: true,
    env: { ...process.env, RUST_LOG: 'info' },
    stdio: 'inherit',
  });

  rustAudioProcessor.on('error', (err) => {
    console.warn('Rust audio processor failed to start:', err.message);
    console.warn('Audio processing will fall back to JavaScript implementation');
  });
}

app.on('ready', () => {
  console.log('Starting Electron app...');
  
  // Start backend first
  startBackend();
  
  // Skip Rust for now to test stability
  // setTimeout(() => {
  //   startRustAudioProcessor();
  // }, 3000);
  
  // Wait for backend to be ready
  setTimeout(() => {
    console.log('Creating window...');
    createWindow();
  }, 5000);
});

app.on('window-all-closed', () => {
  // Clean up processes
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  if (rustAudioProcessor) {
    rustAudioProcessor.kill();
    rustAudioProcessor = null;
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
