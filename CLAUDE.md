# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a workout tracking web application built to manage structured training programs. Users can plan multi-week workout programs, track individual workout sessions, and log exercise performance with detailed set-by-set data. The app uses a hierarchical ID system for deterministic navigation and supports data import/export for program persistence.

## Development Commands

### Start Development Server
```bash
npm run dev
```
Runs the development server with hot module reloading on port 5000 (or PORT environment variable).

### Type Checking
```bash
npm run check
```
Runs TypeScript type checking without emitting files.

### Build for Production
```bash
npm run build
```
Builds both the Vite frontend (to `dist/public`) and bundles the Express server (to `dist/index.js`).

### Start Production Server
```bash
npm start
```
Runs the production build from `dist/index.js`.

fi
## Architecture

### Monorepo Structure

- **`client/`** - React frontend application
  - `src/components/` - React components including SetLogger, SessionView, ExerciseView
  - `src/pages/` - Page components (WorkoutTrackerApp is the main app)
  - `src/hooks/` - Custom React hooks (`useWorkoutProgram` manages all workout data)
  - `src/utils/` - Utility functions (`idHelpers.ts` for ID parsing, `localStorage.ts` for persistence)
  - `src/types/` - TypeScript type definitions (`workout.ts` contains core data types)
  - `src/data/` - Sample data generators
  - `src/lib/` - Utility libraries

- **`server/`** - Express backend (static file serving only)
  - `index.ts` - Main server entry point
  - `vite.ts` - Vite middleware setup for development

### Path Aliases

TypeScript is configured with the following path aliases:
- `@/*` → `./client/src/*`
- `@assets/*` → `./attached_assets/*`

### Data Storage

**LocalStorage-Only Implementation**
- All data persistence is in browser LocalStorage under the key `workout_weeks`
- `useWorkoutProgram` hook manages all CRUD operations
- Data flows: LocalStorage → React state → UI components
- Export/import functionality allows downloading/uploading JSON files for backup/sharing
- No backend API or database - this is a client-side only application

### Hierarchical ID System

The application uses a deterministic hierarchical ID structure:

- Week ID: `week-{weekNumber}` (e.g., `week-1`)
- Session ID: `week-{weekNumber}-session-{sessionNumber}` (e.g., `week-1-session-2`)
- Exercise ID: `week-{weekNumber}-session-{sessionNumber}-exercise-{exerciseNumber}` (e.g., `week-1-session-2-exercise-3`)

All IDs use 1-based indexing for human readability. Helper functions in `client/src/utils/idHelpers.ts` provide:
- ID creation: `createWeekId()`, `createSessionId()`, `createExerciseId()`
- ID parsing: `parseId()` extracts week/session/exercise numbers
- Navigation: `getWeekId()`, `getSessionId()` extract parent IDs
- Lookups: `findWeek()`, `findSession()`, `findExercise()`

### Data Model

The core data hierarchy (defined in `client/src/types/workout.ts`):

```
Week
├── weekNumber: number
├── phase: string (metadata tag, e.g., "Accumulation", "Intensification")
├── startDate/endDate: string
└── sessions: WorkoutSession[]
    ├── name: string
    ├── scheduledDate/dayOfWeek: optional scheduling info
    ├── completed: boolean
    ├── startedAt/completedDate: timestamps
    └── exercises: Exercise[]
        ├── name: string
        ├── warmupSets/workingSets: number
        ├── reps/targetLoad: target parameters (strings for flexibility)
        ├── notes: optional string
        └── sets: SetResult[] (actual logged performance)
            ├── setNumber: number
            ├── reps: number
            ├── weight/weightUnit: actual load
            ├── rir: reps in reserve
            └── completed: boolean
```

Key design decisions:
- **Flat week list**: Weeks are top-level; phases are metadata tags, not containers
- **Combined plan & actuals**: Target parameters and actual results live in the same object
- **Flexible targets**: `reps` and `targetLoad` are strings to support ranges (e.g., "8-10" or "60-65%")

### State Management

**useWorkoutProgram Hook** (`client/src/hooks/useWorkoutProgram.ts`)

Central hook managing all workout data operations:
- `weeks` - Current program data (Week[] | null)
- `addSet()` - Add a logged set to an exercise
- `updateSet()` - Modify an existing set
- `deleteSet()` - Remove a set (renumbers remaining sets)
- `startSession()` - Mark session as started with timestamp
- `completeSession()` - Mark session as completed
- `importWeeks()` - Replace entire program with imported data
- `updateWeeks()` - Direct state update (saves to localStorage)

All mutation functions:
1. Take hierarchical IDs (weekId, sessionId, exerciseId)
2. Immutably update the state tree
3. Automatically persist to localStorage

### Frontend Stack

- **React 18** with TypeScript
- **Vite** for build tooling and dev server
- **Wouter** for client-side routing (lightweight alternative to React Router)
- **TanStack Query** configured (available but not currently used)
- **shadcn/ui** component library (Radix UI + Tailwind CSS)
  - Uses "new-york" style variant
  - Components in `client/src/components/ui/`
- **Tailwind CSS** for styling
- **date-fns** for date manipulation
- **React Hook Form** + **Zod** for form validation

### Server (Static File Serving Only)

- **Express.js** server with TypeScript - serves static files only, no API endpoints
- **Development mode**: Vite middleware provides HMR
- **Production mode**: Serves pre-built static files from `dist/public`
- **Replit plugins**: Only active in development when `REPL_ID` is set
  - Cartographer, dev banner, runtime error overlay
- **No database or backend API** - all data lives in browser localStorage

### Build Process

**Development**: `npm run dev`
- Uses `tsx` to run `server/index.ts` directly
- Vite middleware handles frontend with HMR
- Server listens on port from `PORT` env var (default 5000)

**Production**: `npm run build`
1. Vite builds React app → `dist/public/`
2. esbuild bundles server → `dist/index.js`
   - Platform: node
   - Format: ESM
   - External packages (not bundled)

**Important**: The server MUST listen on the port specified in `PORT` environment variable (default 5000). Other ports are firewalled.

## Working with Workout Data

### Adding New Fields to Data Model

1. Update TypeScript types in `client/src/types/workout.ts`
2. Update sample data generator in `client/src/data/sampleWorkout.ts`
3. Update relevant components that display/edit the data
4. Ensure backward compatibility in localStorage - the `normalizeWeeks()` function in `localStorage.ts` handles data migration

### Modifying the ID System

The hierarchical ID structure is fundamental to navigation and data lookups. When modifying:
- Update helpers in `client/src/utils/idHelpers.ts`
- Ensure `parseId()` handles new ID formats
- Update ID creation functions to maintain determinism
- Keep 1-based indexing for user-facing displays

### Data Import/Export

Users can backup and share their workout programs via JSON export/import:
- Export: Downloads all weeks as a timestamped JSON file
- Import: Uploads JSON file and replaces current program
- The `normalizeWeeks()` function in `localStorage.ts` ensures imported data has proper structure
- Historical set data: When logging sets, the app looks backwards through all sessions to find the last time that exercise was performed and shows those values as placeholders
