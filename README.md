# STS Editor - Speech-to-Speech Guided Track Workflow

A professional web application for voice-over and dubbing workflow management with ElevenLabs integration. Features a dark RIAN-inspired UI with multi-track audio editing capabilities.

## Overview

The STS Editor provides a complete workflow for external vendors to upload audio tracks, apply voice clones, and create final compiled videos without requiring direct access to third-party services. Built with a focus on professional audio production workflows.

## Features

### Core Functionality
- **Multi-Track Audio Editor**: Source audio, speaker tracks, and M&E (Music & Effects) sections
- **Video Player Integration**: Timeline-synced video playback with professional controls
- **Voice Clone Management**: Individual voice selection per speaker track
- **File Upload System**: Support for WAV/MP3 audio files up to 100MB
- **Real-time Processing**: ElevenLabs Speech-to-Speech API integration

### User Interface
- **Dark RIAN Theme**: Professional audio editor inspired design
- **Collapsible Sections**: Organized track management with expandable sections
- **Waveform Visualization**: Visual audio representation for precise editing
- **Context Menus**: Right-click operations for track-specific actions
- **Modal Workflows**: Streamlined STS generation and voice selection

## Technology Stack

### Frontend
- **React 18** with TypeScript for type-safe development
- **Tailwind CSS** with shadcn/ui components for consistent styling
- **Wouter** for lightweight client-side routing
- **TanStack Query** for efficient server state management
- **Vite** for fast development and optimized builds

### Backend
- **Node.js** with Express.js server
- **TypeScript** with ES modules
- **Multer** for file upload handling (100MB limit)
- **RESTful API** design for clean data operations

### Database & Storage
- **PostgreSQL** with Drizzle ORM for type-safe database operations
- **Neon Database** serverless driver for cloud connectivity
- **In-memory storage** fallback for development

## Quick Start

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database (optional - uses in-memory storage by default)
- ElevenLabs API key (optional - falls back to mock processing)

### Installation

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables** (optional):
   ```bash
   # .env
   ELEVENLABS_API_KEY=your_api_key_here
   DATABASE_URL=your_postgres_connection_string
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Access the application**:
   Open `http://localhost:5000` in your browser

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── sts/       # STS-specific components
│   │   │   └── ui/        # shadcn/ui components
│   │   ├── pages/         # Application pages
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and configuration
├── server/                # Backend Express application
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # API route definitions
│   ├── storage.ts         # Data storage interface
│   └── elevenlabs.ts      # ElevenLabs API integration
├── shared/                # Shared types and schemas
│   └── schema.ts          # Database schema and types
└── uploads/               # File upload directory
```

## API Integration

### ElevenLabs Speech-to-Speech

The application integrates with ElevenLabs for voice conversion:

```typescript
// Configure with your API key
const elevenLabs = new ElevenLabsService(apiKey);

// Convert speech using voice clones
const audioBuffer = await elevenLabs.speechToSpeech({
  voiceId: 'voice_clone_id',
  audioFile: 'path/to/source.wav',
  voiceSettings: {
    stability: 0.5,
    similarity_boost: 0.8
  }
});
```

### Voice Clones

Pre-configured voice clones available:
- Rachel - Professional Female
- Daniel - Professional Male
- Freya - Young Female
- Brian - Casual Male
- Lily - Friendly Female

## Usage Workflow

1. **Project Setup**: Create a new STS guided track project
2. **Asset Upload**: Upload source video for reference
3. **Audio Import**: Upload raw audio tracks for processing
4. **Voice Assignment**: Select voice clones for each speaker track
5. **STS Processing**: Generate speech-to-speech converted audio
6. **Timeline Editing**: Sync and adjust tracks in the multi-track editor
7. **Final Export**: Compile the final video with processed audio

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

### Database Setup

The application uses Drizzle ORM with PostgreSQL:

```bash
# Generate database migrations
npx drizzle-kit generate

# Apply migrations
npx drizzle-kit migrate
```

### Adding New Components

Follow the established patterns:

1. Create components in `client/src/components/`
2. Use TypeScript for type safety
3. Leverage shadcn/ui components for consistency
4. Follow the dark theme color scheme

## Configuration

### Environment Variables

- `ELEVENLABS_API_KEY` - ElevenLabs API key for voice processing
- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV` - Environment mode (development/production)

### Customization

The UI theme can be customized in `client/src/index.css`:

```css
:root {
  --background: 224 71% 4%;
  --foreground: 213 31% 91%;
  /* ... other color variables */
}
```

## Deployment

### Replit Deployment

The application is optimized for Replit deployment:

1. The server automatically serves both API and frontend
2. Uses port 5000 (the only non-firewalled port)
3. Includes Replit-specific Vite plugins

### Production Considerations

- Set up proper PostgreSQL database
- Configure ElevenLabs API key
- Enable file storage for uploaded media
- Set up monitoring and logging

## Contributing

1. Follow the TypeScript coding standards
2. Use the established component patterns
3. Maintain the dark theme consistency
4. Test with both mock and real ElevenLabs API
5. Update documentation for new features

## License

This project is proprietary software developed for professional dubbing workflows.

## Support

For technical support or feature requests, please refer to the project documentation or contact the development team.