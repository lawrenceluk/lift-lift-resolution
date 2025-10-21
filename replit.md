# Workout Tracking Application

## Overview

This is a workout tracking web application built to manage structured training programs. The app allows users to plan multi-week workout programs, track individual workout sessions, and log exercise performance with detailed set-by-set data. It uses a hierarchical ID system for deterministic navigation and supports data import/export for program persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Tooling**
- **React 18** with TypeScript for type-safe component development
- **Vite** as the build tool and development server
- **Wouter** for lightweight client-side routing
- **TanStack Query** for state management and data fetching (configured for client-side persistence)

**UI Components**
- **shadcn/ui** component library built on Radix UI primitives
- **Tailwind CSS** for styling with CSS variables for theming
- Components follow the "new-york" style variant from shadcn

**State Management Strategy**
- LocalStorage for primary data persistence (no backend database currently in use)
- Custom hook `useWorkoutProgram` manages all workout data operations
- Data flows: localStorage → React state → UI components
- Export/import functionality for data portability (JSON format)

**Data Model**
- Week-centric hierarchy: Weeks → Sessions → Exercises → Sets
- Deterministic hierarchical IDs (e.g., `week-1-session-2-exercise-3`)
- IDs are self-documenting and encode parent-child relationships
- Phases are metadata tags on weeks, not separate entities
- Plan and actual execution data live together in the same objects

### Backend Architecture

**Server Framework**
- **Express.js** server with TypeScript
- Configured for both development (with Vite middleware) and production modes
- Currently serves as a static file server; no active API routes implemented

**Development vs Production**
- Development: Vite middleware for HMR and dev tooling
- Production: Prebuilt static files served from `dist/public`
- Custom error overlay and dev banner plugins in development

**Storage Layer**
- In-memory storage interface defined but not actively used
- Schema defined with Drizzle ORM for potential PostgreSQL integration
- Current implementation: `MemStorage` class provides CRUD interface for Users
- Actual workout data stored in browser LocalStorage

### Data Storage Solutions

**Current Implementation**
- **Browser LocalStorage** is the primary data store
- Key: `workout_weeks` stores the entire program as JSON
- Helper functions in `utils/localStorage.ts` handle serialization

**Potential Database Integration**
- **Drizzle ORM** configured for PostgreSQL
- Connection string expected via `DATABASE_URL` environment variable
- Schema location: `shared/schema.ts`
- Migration output directory: `./migrations`
- Currently only defines a `users` table (not used by workout features)

**Data Portability**
- Export: Downloads workout program as JSON file
- Import: Reads JSON file and replaces current program
- File naming includes week range for organization

### External Dependencies

**Core Libraries**
- `@neondatabase/serverless`: PostgreSQL driver for serverless environments
- `drizzle-orm` & `drizzle-kit`: Type-safe ORM and schema migration tools
- `express`: Web server framework
- `react` & `react-dom`: UI framework
- `@tanstack/react-query`: Async state management

**UI Component Libraries**
- `@radix-ui/*`: Headless UI primitives (20+ component packages)
- `class-variance-authority`: Component variant styling
- `tailwind-merge` & `clsx`: Utility class management
- `lucide-react`: Icon library
- `date-fns`: Date manipulation utilities

**Form Handling**
- `react-hook-form`: Form state and validation
- `@hookform/resolvers`: Form validation resolvers
- `zod`: Schema validation library
- `drizzle-zod`: Zod schema generation from Drizzle schemas

**Development Tools**
- `@replit/*` plugins: Cartographer, dev banner, runtime error overlay
- `tsx`: TypeScript execution for development server
- `esbuild`: Production server bundling
- `vite`: Frontend bundling and dev server

**Routing & Navigation**
- `wouter`: Lightweight client-side routing (~1KB)
- Path aliases configured: `@/` for client src, `@shared/` for shared types

### Key Design Decisions

**Hierarchical ID System**
- IDs encode full navigation path (e.g., `week-3-session-2-exercise-5`)
- Eliminates need for explicit parent references in data model
- 1-indexed numbering for human readability
- Parsing utilities in `utils/idHelpers.ts` extract parent relationships

**Client-Side Data Persistence**
- Chose LocalStorage over backend database for simplicity
- Enables offline-first functionality
- Trade-off: No multi-device sync or collaborative features
- Future migration path: Database schema already defined with Drizzle

**Flat Week List Structure**
- No nested "program" or "phase" containers
- Weeks are top-level; phases are just metadata tags
- Simplifies rendering logic and data updates
- Aligns with "list of weeks" UI paradigm

**Combined Plan & Actuals**
- Target parameters (reps, sets, load) and actual results in same exercise object
- `sets` array contains actual logged performance
- Enables easy comparison between planned vs. actual
- `completed` flags track progress at exercise and session levels