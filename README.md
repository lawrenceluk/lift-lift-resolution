# Lift Lift Resolution

A workout tracking PWA designed to be your gym companion. Built with React + TypeScript on the front end and an Express server backed by Supabase, it supports accounts, a saved program library, and an AI coach — while still working great added to your iOS home screen for quick access during workouts.

**🌐 Live Demo:** [lift-lift-resolution-production.up.railway.app](https://lift-lift-resolution-production.up.railway.app)

## Why This App Exists

Most workout apps are overcomplicated with unnecessary features, slow loading times, and clunky logging. This app takes a different approach:

- **Gym-optimized** - Clean, mobile-first UI designed for one-handed use while lifting
- **Accounts + sync** - Supabase auth and a saved program library across devices
- **AI coach** - Built-in chat (via OpenRouter) and AI-generated workout programs
- **PWA-ready** - Add to iOS home screen for a native app feel
- **Fast logging** - Set-by-set logging with weight, reps, and RIR

## Features

- 🤖 **AI-Assisted Program Creation** - Generate workout programs using ChatGPT or Claude with a built-in prompt builder
- 📅 **Workout Program Management** - Organize workouts by weeks, phases, and sessions
- 🏋️ **Set Logging** - Log sets, reps, weights, and RIR (reps in reserve) with real-time updates
- 📊 **Progress Tracking** - Visual progress indicators and workout status (planned, in-progress, completed)
- 💾 **Local Storage** - All data stored in your browser - no cloud, no accounts, no sync issues
- 🎨 **Modern UI** - Clean, responsive mobile-first design with Tailwind CSS and Radix UI
- 🔄 **Real-time Updates** - Live session tracking and state management
- 📱 **PWA Ready** - Add to iOS home screen for native app experience
- 📤 **Data Export/Import** - JSON backup and restore functionality

## Tech Stack

**Full-stack** - React client + Express server, with Supabase for auth/data and OpenRouter for AI features.

### Core Technologies
- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **Wouter** - Lightweight routing
- **Framer Motion** - Smooth animations

### Data & Storage
- **Supabase** - Postgres + auth; powers accounts and the saved program library
- **Local Storage** - Fast local persistence for the active program
- **JSON Import/Export** - Data portability and backup

### Backend & AI
- **Express** - Node server that serves the client and exposes the API (`/api/*`, WebSocket)
- **OpenRouter** - LLM provider for the AI coach chat and program-metadata generation

### Development Tools
- **Vite** - Fast build tool and dev server
- **ESBuild** - Fast bundling
- **PWA Manifest** - iOS home screen support

## Quick Start

### For Users

**Option 1: Use the Live App**
1. Visit [liftliftresolution.com](https://liftliftresolution.com) in your browser
2. Add to iOS home screen: Tap Share → Add to Home Screen
3. Start tracking your workouts!

**Option 2: Self-Host**
1. Download the built files from the `dist/` folder
2. Serve them with any static file server
3. Access via your domain

### For Developers

**Prerequisites**
- Node.js 18+ 
- npm or yarn

**Installation & Development**

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd workout-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**

   Copy `.env.example` to `.env` and fill in the values:
   ```
   VITE_SUPABASE_URL=...          # Supabase project URL (client + server)
   VITE_SUPABASE_ANON_KEY=...     # Supabase anon/publishable key (client)
   SUPABASE_SERVICE_ROLE_KEY=...  # Supabase service role key (server, secret)
   OPENROUTER_API_KEY=...         # OpenRouter key for AI features (server, secret)
   ```
   The app reads these from `process.env`, so for local dev source them before starting:
   ```bash
   set -a && . ./.env && set +a
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```
   Serves on port `5000` by default (override with `PORT=5050 npm run dev` — macOS reserves 5000 for AirPlay).

5. **Build for production**
   ```bash
   npm run build   # builds the client to dist/public and bundles the server to dist/index.js
   npm start       # runs the production server
   ```

## Deployment (Railway)

The app deploys to [Railway](https://railway.com) as a single Node service:

```bash
railway up
```

Set the four env vars above as Railway service variables **before** deploying — the `VITE_*` values are baked into the client bundle at build time. Railway injects its own `PORT`, which the server respects automatically; Nixpacks runs `npm install && npm run build`, then `npm start`.

## Project Structure

```
workout-tracker/
├── client/                 # React frontend (main app)
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── types/          # TypeScript type definitions
│   │   ├── utils/          # Utility functions
│   │   └── data/           # Sample data and fixtures
│   └── public/             # Static assets & PWA manifest
├── server/                 # Optional Express backend (dev only)
│   ├── src/
│   │   ├── index.ts       # Server entry point
│   │   ├── routes/        # API routes
│   │   └── storage.ts     # Database operations
├── shared/                 # Shared types and schemas
└── dist/                   # Production build output
```

## Usage

### Creating Your First Workout Program

Visit the "How it works" page (accessible from the menu) to create your program:

**Option 1: AI-Generated Program (Recommended)**
1. Fill out the workout preferences form (duration, goals, experience level, equipment)
2. Click "Copy prompt for AI"
3. Paste the prompt into ChatGPT, Claude, or any LLM
4. Copy the generated JSON from the AI
5. Paste it directly into the app or save as a file and import

**Option 2: Manual JSON Creation**
- Create your own JSON file following the hierarchical ID structure
- See the "How it works" page for detailed schema requirements

### Using the App

**Starting a Workout Session**
1. Navigate between weeks using Previous/Next buttons
2. Tap any workout session to begin
3. Log sets with weight, reps, and RIR as you complete them
4. Complete the session when all exercises are done

**Managing Workout Data**
- **Export**: Download your workout program as JSON (includes all logged data)
- **Import**: Upload a JSON file or paste JSON directly
- **Local Storage**: All data persists in your browser automatically
- **Backup**: Export regularly to avoid data loss
- **Privacy**: Your data never leaves your device unless you export it

## Design Philosophy

### Local-First, Cloud-Backed

**Local-First**
- The active program lives in browser Local Storage, so logging is instant and works offline
- No round-trip to the server for the core tracking loop

**Cloud Sync When You Want It**
- Sign in with Supabase to save programs to a library and access them across devices
- JSON export/import for portability and backup

**Performance**
- Fast loading and minimal resource usage
- The gym logging loop stays responsive even on flaky connections

**Mobile-First PWA**
- Add to iOS home screen for native feel
- One-handed operation while lifting
- Optimized for gym environment
- Works without internet connection

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run check` - Type check with TypeScript
- `npm run preview` - Preview production build locally

### Code Style

This project follows strict TypeScript practices:

- **Type Safety** - Zero `any` types, strict type checking
- **Minimal Code** - Only necessary code, no over-engineering
- **Self-Documenting** - Clear naming and single responsibility
- **Performance** - Efficient state management and rendering

### Deployment

The app deploys as a single Node service (client + API). See the [Deployment (Railway)](#deployment-railway) section above:

1. **Set env vars** on the host (`VITE_*` are baked in at build time, so set them first)
2. **Build**: `npm run build` (client → `dist/public`, server → `dist/index.js`)
3. **Start**: `npm start` (serves the built client and the API on `PORT`)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Key Concepts

### Hierarchical ID System

The app uses deterministic IDs for all workout components:
- Week ID: `week-{weekNumber}` (e.g., `week-1`)
- Session ID: `week-{weekNumber}-session-{sessionNumber}` (e.g., `week-1-session-2`)
- Exercise ID: `week-{weekNumber}-session-{sessionNumber}-exercise-{exerciseNumber}` (e.g., `week-1-session-2-exercise-3`)

All IDs use 1-based indexing for human readability.

### Data Model

Workouts are organized hierarchically:
- **Weeks** contain sessions and metadata (phase, dates, description)
- **Sessions** contain exercises, warmup, optional cardio, and completion tracking
- **Exercises** contain target parameters (sets, reps, load) and actual logged sets
- **Sets** capture actual performance (weight, reps, RIR, completion status)

### AI Prompt Generation

The built-in prompt builder helps users generate properly structured workout programs by:
- Collecting user preferences (goals, experience, equipment)
- Generating a detailed prompt with JSON schema
- Providing examples and validation rules
- Handling common LLM output formats (with or without code blocks)

## Acknowledgments

- Built with modern web technologies
- UI components from shadcn/ui and Radix UI
- Icons from Lucide React
- Styling with Tailwind CSS
- Designed for structured training programs and periodization
- Inspired by the need for simple, privacy-focused fitness tracking
