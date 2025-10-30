export interface SetResult {
  guid?: string; // Ephemeral GUID for deterministic operations (not persisted)
  setNumber: number;
  reps: number;
  weight?: number;
  weightUnit: 'lbs' | 'kg';
  rir?: number;
  completed: boolean;
  skipped?: boolean;
  notes?: string;
}

export interface Exercise {
  id: string;
  guid?: string; // Ephemeral GUID for deterministic operations (not persisted)
  name: string;
  groupLabel?: string;
  warmupSets: number;
  workingSets: number;
  reps: string;
  targetLoad: string;
  restSeconds: number;
  notes?: string;
  userNotes?: string;
  sets: SetResult[];
  skipped?: boolean;
}

export interface CardioBlock {
  type: 'zone2' | 'intervals' | 'sweetspot' | 'threshold' | 'vo2max';
  duration: number;
  modality?: string;
  instructions?: string;
  completed: boolean;
  actualDuration?: number;
  avgHeartRate?: number;
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  guid?: string; // Ephemeral GUID for deterministic operations (not persisted)
  name: string;
  scheduledDate?: string;
  dayOfWeek?: string;
  warmup?: string[];
  exercises: Exercise[];
  cardio?: CardioBlock;
  notes?: string;
  startedAt?: string;
  completed: boolean;
  completedDate?: string;
  duration?: number;
  rating?: number;
}

export type WorkoutStatus = 'planned' | 'in-progress' | 'completed';

export interface Week {
  id: string;
  guid?: string; // Ephemeral GUID for deterministic operations (not persisted)
  weekNumber: number;
  phase: string;
  startDate: string;
  endDate: string;
  description?: string;
  sessions: WorkoutSession[];
}
