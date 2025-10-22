# Lift Lift Resolution

A lightweight, frontend-only workout tracking PWA designed to be your gym companion. Built with React and TypeScript, this app runs entirely in your browser with local storage - no servers, no accounts, no complexity. Perfect for adding to your iOS home screen for quick access during workouts.

**🌐 Live Demo:** [lift.luk.xyz](https://lift.luk.xyz)

## Why This App Exists

Most workout apps are overcomplicated with unnecessary features, slow loading times, and complex data syncing. This app takes a different approach:

- **Ultra-lightweight** - Runs entirely in your browser, loads instantly
- **No accounts required** - Your data stays private on your device
- **PWA-ready** - Add to iOS home screen for native app feel
- **Gym-optimized** - Designed for one-handed use while lifting
- **AI-powered** - Generate workout programs with ChatGPT/Claude

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

**Frontend-Only Architecture** - No backend required for production use

### Core Technologies
- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **Wouter** - Lightweight routing
- **Framer Motion** - Smooth animations

### Data & Storage
- **Local Storage** - Browser-based data persistence
- **JSON Import/Export** - Data portability and backup
- **No Database** - Everything runs client-side

### Development Tools
- **Vite** - Fast build tool and dev server
- **ESBuild** - Fast bundling
- **PWA Manifest** - iOS home screen support

### Optional Backend (Development Only)
The repository includes an Express server for development and testing, but the production app runs entirely in the browser.

## Quick Start

### For Users

**Option 1: Use the Live App**
1. Visit [lift.luk.xyz](https://lift.luk.xyz) in your browser
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

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

The built files in `dist/` can be deployed to any static hosting service (Vercel, Netlify, GitHub Pages, etc.).

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

### Why Frontend-Only?

**Simplicity First**
- No server maintenance or hosting costs
- No database migrations or backups
- No user accounts or authentication complexity
- No API rate limits or downtime

**Privacy & Control**
- Your data stays on your device
- No tracking or analytics
- No data mining or selling
- Complete control over your information

**Performance**
- Instant loading (no network requests)
- Works offline
- No server latency
- Minimal resource usage

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

The app is designed to be deployed as a static site:

1. **Build the app**: `npm run build`
2. **Deploy the `dist/` folder** to any static hosting service
3. **Configure PWA** (optional): Ensure proper manifest.json and service worker
4. **No server required** - just serve the static files

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
