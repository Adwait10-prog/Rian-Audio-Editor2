const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  mainWindow.loadURL('http://localhost:5001');
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (serverProcess) {
      serverProcess.kill();
    }
  });
}

function startBackend() {
  // Start the Express backend as a child process
  serverProcess = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname),
    shell: true,
    env: { ...process.env, PORT: '5001' },
    stdio: 'inherit',
  });
}

app.on('ready', () => {
  startBackend();
  // Wait a bit for the server to start
  setTimeout(createWindow, 4000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
