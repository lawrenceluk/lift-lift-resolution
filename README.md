# Workout Tracker App

A modern, full-stack workout tracking application built with React, TypeScript, Express, and Tailwind CSS. Track your workouts, log sets, and monitor your progress with an intuitive interface.

## Features

- 📅 **Workout Program Management** - Organize workouts by weeks and sessions
- 🏋️ **Set Logging** - Log sets, reps, and weights with real-time updates
- 📊 **Progress Tracking** - Visual progress indicators and workout status
- 💾 **Data Persistence** - Local storage with import/export functionality
- 🎨 **Modern UI** - Clean, responsive design with Tailwind CSS and Radix UI
- 🔄 **Real-time Updates** - Live session tracking and state management

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

### Starting a Workout Session

1. Navigate to the workout tracker
2. Select a week from the program
3. Click "Start Session" on any workout
4. Log your sets as you complete them
5. Mark the session as complete when finished

### Managing Workout Data

- **Export**: Download your workout program as JSON
- **Import**: Upload a previously exported program
- **Reset**: Clear all data and start fresh

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

## Acknowledgments

- Built with modern web technologies
- UI components from Radix UI
- Icons from Lucide React
- Styling with Tailwind CSS
