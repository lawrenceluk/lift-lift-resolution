import { useState, useEffect, useCallback } from 'react';
import { WorkoutProgram, WorkoutSet, Exercise, WorkoutSession } from '@/types/workout';
import { loadWorkoutProgram, saveWorkoutProgram } from '@/utils/localStorage';
import { createSampleProgram } from '@/data/sampleWorkout';

export const useWorkoutProgram = () => {
  const [program, setProgram] = useState<WorkoutProgram | null>(null);

  useEffect(() => {
    const loadedProgram = loadWorkoutProgram();
    if (loadedProgram) {
      setProgram(loadedProgram);
    } else {
      const sampleProgram = createSampleProgram();
      setProgram(sampleProgram);
      saveWorkoutProgram(sampleProgram);
    }
  }, []);

  const updateProgram = useCallback((updatedProgram: WorkoutProgram) => {
    const programWithTimestamp = {
      ...updatedProgram,
      updatedAt: new Date().toISOString(),
    };
    setProgram(programWithTimestamp);
    saveWorkoutProgram(programWithTimestamp);
  }, []);

  const updateSet = useCallback(
    (weekId: string, sessionId: string, exerciseId: string, setId: string, updates: Partial<WorkoutSet>) => {
      if (!program) return;

      const updatedProgram = { ...program };
      const week = updatedProgram.weeks.find((w) => w.id === weekId);
      if (!week) return;

      const session = week.sessions.find((s) => s.id === sessionId);
      if (!session) return;

      const exercise = session.exercises.find((e) => e.id === exerciseId);
      if (!exercise) return;

      const set = exercise.sets.find((s) => s.id === setId);
      if (!set) return;

      Object.assign(set, updates);

      exercise.completed = exercise.sets.every((s) => s.completed);
      session.completed = session.exercises.every((e) => e.completed);

      updateProgram(updatedProgram);
    },
    [program, updateProgram]
  );

  const toggleExerciseComplete = useCallback(
    (weekId: string, sessionId: string, exerciseId: string) => {
      if (!program) return;

      const updatedProgram = { ...program };
      const week = updatedProgram.weeks.find((w) => w.id === weekId);
      if (!week) return;

      const session = week.sessions.find((s) => s.id === sessionId);
      if (!session) return;

      const exercise = session.exercises.find((e) => e.id === exerciseId);
      if (!exercise) return;

      exercise.completed = !exercise.completed;
      exercise.sets.forEach((set) => {
        set.completed = exercise.completed;
      });

      session.completed = session.exercises.every((e) => e.completed);

      updateProgram(updatedProgram);
    },
    [program, updateProgram]
  );

  const startSession = useCallback(
    (weekId: string, sessionId: string) => {
      if (!program) return;

      const updatedProgram = { ...program };
      const week = updatedProgram.weeks.find((w) => w.id === weekId);
      if (!week) return;

      const session = week.sessions.find((s) => s.id === sessionId);
      if (!session) return;

      session.startedAt = new Date().toISOString();

      updateProgram(updatedProgram);
    },
    [program, updateProgram]
  );

  const completeSession = useCallback(
    (weekId: string, sessionId: string) => {
      if (!program) return;

      const updatedProgram = { ...program };
      const week = updatedProgram.weeks.find((w) => w.id === weekId);
      if (!week) return;

      const session = week.sessions.find((s) => s.id === sessionId);
      if (!session) return;

      session.completed = true;
      session.completedAt = new Date().toISOString();

      updateProgram(updatedProgram);
    },
    [program, updateProgram]
  );

  const importProgram = useCallback(
    (newProgram: WorkoutProgram) => {
      updateProgram(newProgram);
    },
    [updateProgram]
  );

  return {
    program,
    updateSet,
    toggleExerciseComplete,
    startSession,
    completeSession,
    importProgram,
    updateProgram,
  };
};
