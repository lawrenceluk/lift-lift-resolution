import React, { createContext, useContext, ReactNode } from 'react';
import { useWorkoutProgram } from '@/hooks/useWorkoutProgram';
import type { Week, SetResult, Exercise } from '@/types/workout';

interface WorkoutProgramContextType {
  weeks: Week[] | null;
  addSet: (weekId: string, sessionId: string, exerciseId: string, set: SetResult) => void;
  updateSet: (weekId: string, sessionId: string, exerciseId: string, setNumber: number, updates: Partial<SetResult>) => void;
  deleteSet: (weekId: string, sessionId: string, exerciseId: string, setNumber: number) => void;
  startSession: (weekId: string, sessionId: string) => void;
  completeSession: (weekId: string, sessionId: string) => void;
  deleteSession: (weekId: string, sessionId: string) => void;
  updateSession: (weekId: string, sessionId: string, updates: { name?: string }) => void;
  skipExercise: (weekId: string, sessionId: string, exerciseId: string) => void;
  unskipExercise: (weekId: string, sessionId: string, exerciseId: string) => void;
  updateExerciseNotes: (weekId: string, sessionId: string, exerciseId: string, notes: string) => void;
  updateExercise: (weekId: string, sessionId: string, exerciseId: string, updates: Partial<Exercise>) => void;
  updateExerciseInAllSessions: (originalName: string, updates: Partial<Exercise>) => void;
  importWeeks: (weeks: Week[]) => void;
  updateWeeks: (weeks: Week[]) => void;
}

const WorkoutProgramContext = createContext<WorkoutProgramContextType | undefined>(undefined);

export function WorkoutProgramProvider({ children }: { children: ReactNode }) {
  const workoutProgram = useWorkoutProgram();

  return (
    <WorkoutProgramContext.Provider value={workoutProgram}>
      {children}
    </WorkoutProgramContext.Provider>
  );
}

export function useWorkoutProgramContext() {
  const context = useContext(WorkoutProgramContext);
  if (context === undefined) {
    throw new Error('useWorkoutProgramContext must be used within a WorkoutProgramProvider');
  }
  return context;
}
