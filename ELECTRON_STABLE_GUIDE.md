# 🖥️ Electron Desktop App - Stable Startup Guide

## ✅ Stable Two-Step Launch Process

To avoid crashes, use this proven stable method:

### Step 1: Start Backend Server
```bash
# Terminal 1 - Start the backend server first
npm run dev:server
```
**Wait for:** `serving on port 5001` message

### Step 2: Start Desktop App
```bash
# Terminal 2 - Start the Electron app
npm run electron:simple
```
**Wait for:** `Window ready, showing...` message

## 🎯 Why This Works Better

**Previous Issues:**
- ❌ Starting all services simultaneously caused race conditions
- ❌ Rust compilation took too long, causing timeouts
- ❌ Resource conflicts between processes

**Current Solution:**
- ✅ **Sequential startup** - Server first, then Electron
- ✅ **Simpler process management** - No complex child processes
- ✅ **Better error handling** - Clear failure messages
- ✅ **Stable operation** - No crashes

## 🚀 Features Available

Your desktop app now provides:
- **Professional UI** - DaVinci Resolve-inspired interface
- **Project Management** - Create, edit, delete projects
- **Multi-track Audio** - Source, speaker, and M&E tracks
- **Waveform Visualization** - Real-time audio visualization
- **Timeline Controls** - Zoom, pan, and precise timing
- **File Upload** - Drag-and-drop audio/video support
- **Native Performance** - Better than browser experience

## 🔧 Optional: Adding Rust Backend

If you want high-performance audio processing, you can optionally start the Rust service:

```bash
# Terminal 3 - Optional Rust audio processor
cd audio_processor
cargo run
```

This provides:
- ⚡ **Faster waveform generation**
- 🎯 **Professional audio analysis** 
- 📊 **Better peak detection**

## 🛠️ Development Workflow

**Daily Usage:**
1. Open Terminal 1: `npm run dev:server`
2. Open Terminal 2: `npm run electron:simple`
3. Start editing audio projects!

**To Stop:**
- Close Electron window
- Press `Ctrl+C` in Terminal 1 to stop server

## 🐛 Troubleshooting

### App Won't Load
**Problem:** Window shows but no content
**Solution:** Make sure step 1 completed (server running on 5001)

### Server Won't Start
**Problem:** Port 5001 already in use
**Solution:** 
```bash
# Kill existing processes
lsof -ti :5001 | xargs kill
# Then restart
npm run dev:server
```

### Electron Won't Open
**Problem:** No window appears
**Solution:**
```bash
# Check if Electron is installed
npm ls electron
# Reinstall if needed
npm install electron --save-dev
```

## 📱 Desktop vs Web Version

| Feature | Desktop App | Web Browser |
|---------|-------------|-------------|
| Performance | ⚡ Native | 🐌 Browser limited |
| File Access | 🎯 Direct | ❌ Restricted |
| Memory Usage | ✅ Optimized | ⚠️ Tab overhead |
| Professional Feel | 🏆 Native UI | 📱 Web UI |
| Offline Usage | ✅ Full | ❌ Online only |

## 🎉 Success Indicators

You'll know it's working when you see:
1. **Terminal 1:** `serving on port 5001`
2. **Terminal 2:** `Window ready, showing...`
3. **Desktop:** Professional audio editor window opens
4. **UI:** Project management interface loads

The desktop app is now stable and ready for professional audio editing work!