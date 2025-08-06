const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  console.log('Creating Electron window...');
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 1000,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    },
    show: false,
    titleBarStyle: 'default',
    icon: path.join(__dirname, 'assets/icon.png') // Optional
  });

  // Load the app
  mainWindow.loadURL('http://localhost:5001');

  // Show when ready
  mainWindow.once('ready-to-show', () => {
    console.log('Window ready, showing...');
    mainWindow.show();
    
    // Optional: Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle load failures
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`Failed to load ${validatedURL}: ${errorDescription} (${errorCode})`);
    console.log('Make sure the server is running on http://localhost:5001');
  });

  // Debug console messages
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[RENDERER] ${message}`);
  });

  // Handle crashes
  mainWindow.webContents.on('crashed', (event, killed) => {
    console.error('Renderer process crashed!', { killed });
  });

  // Handle unresponsive
  mainWindow.on('unresponsive', () => {
    console.error('Window became unresponsive');
  });

  // Handle GPU crashes
  app.on('gpu-process-crashed', (event, killed) => {
    console.error('GPU process crashed!', { killed });
  });
}

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle app quit
app.on('before-quit', () => {
  console.log('Electron app closing...');
});

console.log('Electron app starting...');
console.log('Make sure to run "npm run dev:server" in another terminal first!');