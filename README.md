# Rian Audio Editor 2

A professional desktop audio/video editing application with synchronized waveform timeline, zoom/scroll, and multi-track speaker management. Built with React, Electron, Express, and PostgreSQL.

## Features
- Electron-based desktop app (cross-platform)
- Drag-and-drop media import (audio/video)
- FFmpeg-powered audio extraction from video
- WaveSurfer.js waveform rendering for all tracks
- Synchronized timeline zoom and horizontal scroll
- Sticky/fixed track labels and controls
- Speaker track management (add, rename, assign voice, etc.)
- Project management (create, edit, delete projects)
- M&E (Music & Effects) track support
- Modern DaVinci Resolve-inspired UI/UX

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn
- PostgreSQL (for production use)
- FFmpeg installed and in your PATH

### Installation
```bash
git clone https://github.com/Adwait10-prog/Rian-Audio-Editor2.git
cd Rian-Audio-Editor2
npm install
```

### Development
- Start the backend server:
  ```bash
  npm run server
  ```
- Start the frontend (React/Vite):
  ```bash
  npm run dev
  ```
- Start Electron (desktop app):
  ```bash
  npm run electron
  ```

### Production Build
```bash
npm run build
npm run electron
```

## Folder Structure
- `client/` - React frontend (Vite, TypeScript)
- `server/` - Express backend, FFmpeg endpoints
- `uploads/` - Media uploads (audio, video, extracted waveforms)

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License
MIT

---

**Rian Audio Editor 2** © 2025 Adwait10-prog & contributors.
