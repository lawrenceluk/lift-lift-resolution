# Lift Lift Resolution

A modern workout tracking application built with React, TypeScript, Express, and Tailwind CSS. Designed for structured training programs with AI-assisted program generation, this app helps you track your workouts, log sets, and monitor your progress with an intuitive mobile-first interface.

## Features

- 🤖 **AI-Assisted Program Creation** - Generate workout programs using ChatGPT or Claude with a built-in prompt builder
- 📅 **Workout Program Management** - Organize workouts by weeks, phases, and sessions
- 🏋️ **Set Logging** - Log sets, reps, weights, and RIR (reps in reserve) with real-time updates
- 📊 **Progress Tracking** - Visual progress indicators and workout status (planned, in-progress, completed)
- 💾 **Data Persistence** - Local storage with JSON import/export and paste functionality
- 🎨 **Modern UI** - Clean, responsive mobile-first design with Tailwind CSS and Radix UI
- 🔄 **Real-time Updates** - Live session tracking and state management
- 📱 **Mobile-First** - Optimized for phone use at the gym, with desktop support

## Tech Stack

### Frontend
- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **React Query** - Server state management
- **Wouter** - Lightweight routing
- **Framer Motion** - Smooth animations

### Backend
- **Express.js** - Web framework
- **TypeScript** - Type-safe server code
- **Drizzle ORM** - Type-safe database queries
- **PostgreSQL** - Database (via Neon)
- **Express Session** - Session management

### Development
- **Vite** - Fast build tool and dev server
- **ESBuild** - Fast bundling
- **Drizzle Kit** - Database migrations

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- PostgreSQL database (or use Neon for cloud hosting)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd workout-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=your_postgresql_connection_string
   SESSION_SECRET=your_session_secret_key
   NODE_ENV=development
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
workout-tracker/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── types/          # TypeScript type definitions
│   │   ├── utils/          # Utility functions
│   │   └── data/           # Sample data and fixtures
│   └── public/             # Static assets
├── server/                 # Express backend
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # API routes
│   └── storage.ts         # Database operations
├── shared/                 # Shared types and schemas
└── dist/                   # Build output
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

## API Endpoints

The backend provides RESTful API endpoints for:

- `GET /api/workouts` - Fetch workout programs
- `POST /api/workouts` - Create new workout
- `PUT /api/workouts/:id` - Update workout
- `DELETE /api/workouts/:id` - Delete workout

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run check` - Type check with TypeScript
- `npm run db:push` - Push database schema changes

### Code Style

This project follows strict TypeScript practices:

- **Type Safety** - Zero `any` types, strict type checking
- **Minimal Code** - Only necessary code, no over-engineering
- **Self-Documenting** - Clear naming and single responsibility
- **Performance** - Efficient state management and rendering

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
