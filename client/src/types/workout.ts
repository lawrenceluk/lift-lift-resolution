export interface WorkoutSet {
  id: string;
  prescribed: {
    reps?: number;
    weight?: number;
    rir?: number;
    notes?: string;
  };
  actual: {
    reps?: number;
    weight?: number;
    rir?: number;
    notes?: string;
  };
  completed: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  sets: WorkoutSet[];
  notes?: string;
  completed: boolean;
}

export interface WorkoutSession {
  id: string;
  title: string;
  day: string;
  date: string;
  exercises: Exercise[];
  cardio?: {
    duration: number;
    type?: string;
    notes?: string;
  };
  completed: boolean;
  startedAt?: string;
  completedAt?: string;
}

export interface Week {
  id: string;
  number: number;
  phase: string;
  startDate: string;
  endDate: string;
  description?: string;
  sessions: WorkoutSession[];
}

export interface WorkoutProgram {
  id: string;
  name: string;
  weeks: Week[];
  createdAt: string;
  updatedAt: string;
}
