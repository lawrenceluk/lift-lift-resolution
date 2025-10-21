export interface SetResult {
  setNumber: number;
  reps: number;
  weight?: number;
  weightUnit: 'lbs' | 'kg';
  rir?: number;
  completed: boolean;
  notes?: string;
}

export interface Exercise {
  id: string;
  name: string;
  groupLabel?: string;
  warmupSets: number;
  workingSets: number;
  reps: string;
  targetLoad: string;
  restSeconds: number;
  notes?: string;
  sets: SetResult[];
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
  name: string;
  scheduledDate?: string;
  dayOfWeek?: string;
  warmup?: string[];
  exercises: Exercise[];
  cardio?: CardioBlock;
  notes?: string;
  completed: boolean;
  completedDate?: string;
  duration?: number;
  rating?: number;
}

export interface Week {
  id: string;
  weekNumber: number;
  phase: string;
  startDate: string;
  endDate: string;
  description?: string;
  sessions: WorkoutSession[];
}
