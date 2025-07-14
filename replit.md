# STS Guided Track Workflow Application

## Overview

This is a Speech-to-Speech (STS) guided track workflow application designed for professional dubbing projects. The platform provides a secure, self-contained environment where external vendors can upload audio tracks, apply voice clones, and create final compiled videos without requiring access to third-party services like ElevenLabs.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **API Style**: RESTful endpoints for CRUD operations
- **File Handling**: Multer for multipart file uploads (100MB limit)
- **Development**: Hot module replacement via Vite middleware

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM
- **Schema**: Three main entities - projects, audio tracks, and voice clones
- **Migrations**: Drizzle-kit for database schema management
- **Connection**: Neon Database serverless driver

## Key Components

### Project Management
- Create and manage dubbing projects with client information
- Upload source video files as reference material
- Track project status and progress

### Audio Track System
- Multi-track audio handling with different track types (source, speaker, ME)
- File upload capabilities for WAV/MP3 audio files
- Voice clone assignment and STS processing
- Waveform visualization and audio controls

### Voice Clone Management
- Predefined voice clone library with ElevenLabs voice IDs
- Voice clone assignment to audio tracks
- Integrated ElevenLabs Speech-to-Speech API for real-time voice conversion
- Fallback to mock processing when API key not configured

### User Interface
- Professional audio editor inspired design matching provided wireframe
- Dark theme with RIAN-specific color palette
- Collapsible track sections for better organization
- Video player with mock controls and progress visualization
- Multi-track editor with source, speaker, and M&E sections
- Context menus and modal dialogs for workflow operations
- Individual voice selection per speaker track

## Data Flow

1. **Project Creation**: Project managers create new STS Guided Track jobs
2. **Asset Upload**: Source videos are uploaded as reference material
3. **Vendor Workflow**: External vendors access dedicated workspace
4. **Audio Processing**: Raw audio uploads → voice clone application → STS processing
5. **Timeline Editing**: Multi-track timeline with sync and quality control
6. **Final Compilation**: Export combined video with processed audio tracks

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe database ORM
- **@tanstack/react-query**: Server state management
- **multer**: File upload handling
- **@radix-ui/***: Accessible UI component primitives

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Type safety and development experience
- **Tailwind CSS**: Utility-first styling framework
- **shadcn/ui**: Pre-built component library

### Implemented Integrations
- **ElevenLabs API**: Speech-to-speech conversion service with streaming support
- **File Upload**: Multer for handling audio file uploads (100MB limit)
- **Voice Processing**: Real-time voice conversion with emotion and timing preservation

### Planned Integrations
- **File Storage**: Cloud storage for uploaded media files
- **Video Processing**: FFmpeg or similar for video compilation
- **Audio Waveform**: Real-time waveform generation and visualization

## Deployment Strategy

### Development Environment
- Vite dev server with hot module replacement
- In-memory storage fallback for development
- Replit-specific plugins for development experience

### Production Build
- Vite static asset generation
- esbuild for server-side bundle optimization
- Express server serving static files and API routes

### Database Setup
- PostgreSQL database provisioned via environment variables
- Drizzle migrations for schema management
- Connection pooling via Neon serverless driver

### File Upload Handling
- Multer temporary file storage
- 100MB file size limit for audio/video uploads
- Planned migration to cloud storage for production

## Recent Changes

### December 14, 2025
- Integrated ElevenLabs Speech-to-Speech API with streaming support
- Added collapsible track sections for better organization
- Implemented voice clone selection per speaker track
- Created demo project with initial track structure
- Enhanced UI to match wireframe specifications
- Added proper error handling and fallback mechanisms

### Key Features Added
- Real-time speech-to-speech conversion using ElevenLabs API
- Professional track layout with collapsible sections
- Voice selection dropdown with detailed voice information
- File upload handling for audio tracks
- Context menus for track-specific operations

The application follows a monorepo structure with clear separation between client, server, and shared code, enabling efficient development and deployment of the STS guided track workflow system.