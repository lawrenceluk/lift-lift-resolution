import React, { createContext, useContext, ReactNode } from 'react';
import { useWorkoutProgram, WorkoutProgramApi } from '@/hooks/useWorkoutProgram';

const WorkoutProgramContext = createContext<WorkoutProgramApi | undefined>(undefined);

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
