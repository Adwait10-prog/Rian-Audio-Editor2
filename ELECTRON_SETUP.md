# Electron Desktop App Setup

## Architecture Overview

The Rian Audio Editor 2 desktop application now includes **all three components**:

1. **React Frontend** - UI served by Express
2. **Express Backend** (Node.js) - Port 5001
3. **Rust Audio Processor** - Port 8081 (optional but recommended)

## Prerequisites

### Required:
- **Node.js** (v18+)
- **npm** or **yarn**
- **FFmpeg** (for audio extraction)

### Optional (for Rust audio processor):
- **Rust** & **Cargo** (for high-performance audio processing)

## Installation

```bash
# Install Node.js dependencies
npm install

# Build the frontend for production
npm run build

# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Verify Rust installation
rustc --version
cargo --version
```

## Running the Desktop App

### Method 1: Full Desktop App with Rust Backend (Recommended)

```bash
# This will start:
# - Express backend (Port 5001)
# - Rust audio processor (Port 8081) 
# - Electron desktop window
npm run electron
```

**What happens:**
1. Electron starts the Express backend
2. Electron starts the Rust audio processor
3. Desktop window opens after 6 seconds
4. All services stop when you close the app

### Method 2: Without Rust (Fallback)

If Rust is not installed, the app will still work but with JavaScript-based audio processing:

```bash
npm run electron
```

The app will show a warning but continue to function.

## Manual Development Setup

If you prefer to run services manually:

```bash
# Terminal 1: Start Express backend
npm run dev:server

# Terminal 2: Start Rust audio processor (optional)
cd audio_processor
cargo run

# Terminal 3: Start Electron (skip backend startup)
# Modify electron-main.cjs to not start backends
npm run electron
```

## Features Available in Desktop App

### With Rust Backend (Full Experience):
✅ **High-performance waveform generation**  
✅ **Real-time audio analysis**  
✅ **Professional-grade peak detection**  
✅ **Efficient audio file processing**  
✅ **All web features**  

### Without Rust Backend (Fallback):
✅ **All web features**  
✅ **FFmpeg-based audio extraction**  
✅ **JavaScript waveform generation**  
⚠️ **Slower audio processing**  
⚠️ **Limited peak detection**  

## Desktop App Advantages

1. **Native Performance** - Better than browser
2. **File System Access** - Direct file operations
3. **No Browser Limitations** - Full audio/video support
4. **Professional Feel** - Native window management
5. **Offline Capable** - No internet required

## Packaging for Distribution

### Build Production Binary

```bash
# Build Rust binary for your platform
./scripts/build-rust-binary.sh

# Package Electron app
npm install electron-builder --save-dev
npx electron-builder
```

### Cross-Platform Builds

```bash
# Build for all platforms (requires additional setup)
./scripts/build-rust-binary.sh
npx electron-builder --mac --linux --win
```

## Troubleshooting

### Common Issues

1. **Rust Not Found**
   ```
   Warning: Rust audio processor failed to start
   ```
   - Install Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
   - App will continue with JavaScript fallback

2. **Port Already in Use**
   ```
   Error: listen EADDRINUSE :::5001
   ```
   - Kill existing processes: `killall node` or `lsof -ti :5001 | xargs kill`

3. **FFmpeg Not Found**
   ```
   Error: FFmpeg command failed
   ```
   - Install FFmpeg: 
     - macOS: `brew install ffmpeg`
     - Linux: `sudo apt install ffmpeg`
     - Windows: Download from https://ffmpeg.org/

4. **Window Doesn't Load**
   - Wait 6 seconds for servers to start
   - Check terminal for error messages
   - Try refreshing the window (Cmd/Ctrl + R)

## Performance Optimization

For best performance in the desktop app:

1. **Use Rust Backend** - Significantly faster audio processing
2. **Build for Production** - Run `npm run build` first
3. **Close Browser Tabs** - Free up system resources
4. **Use SSD Storage** - Faster file operations

## Development vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| Build | `npm run dev` | `npm run build` |
| Backend | Express dev server | Express production |
| Frontend | Vite hot reload | Built static files |
| Rust | `cargo run` | Compiled binary |
| Window | DevTools open | Clean interface |

## Next Steps

1. **Try the desktop app**: `npm run electron`
2. **Create a project** and test all features
3. **Upload audio/video files** and verify processing
4. **Test timeline** zoom and waveform generation
5. **Package for distribution** when ready

The desktop app provides the full professional audio editing experience with native performance!