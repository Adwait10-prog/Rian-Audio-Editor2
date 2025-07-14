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
- Predefined voice clone library with different voice types
- Voice clone assignment to audio tracks
- Integration ready for ElevenLabs API (speech-to-speech conversion)

### User Interface
- Professional audio editor inspired design
- Dark theme with RIAN-specific color palette
- Responsive layout with video player, timeline, and multi-track editor
- Context menus and modal dialogs for workflow operations

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

### Planned Integrations
- **ElevenLabs API**: Speech-to-speech conversion service
- **File Storage**: Cloud storage for uploaded media files
- **Video Processing**: FFmpeg or similar for video compilation

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

The application follows a monorepo structure with clear separation between client, server, and shared code, enabling efficient development and deployment of the STS guided track workflow system.