import { useState, useEffect, useCallback } from 'react';
import { Week, SetResult } from '@/types/workout';
import { loadWeeks, saveWeeks } from '@/utils/localStorage';
import { createSampleWeeks } from '@/data/sampleWorkout';

export const useWorkoutProgram = () => {
  const [weeks, setWeeks] = useState<Week[] | null>(null);

  useEffect(() => {
    const loadedWeeks = loadWeeks();
    if (loadedWeeks && loadedWeeks.length > 0) {
      setWeeks(loadedWeeks);
    } else {
      const sampleWeeks = createSampleWeeks();
      setWeeks(sampleWeeks);
      saveWeeks(sampleWeeks);
    }
  }, []);

  const updateWeeks = useCallback((updatedWeeks: Week[]) => {
    setWeeks(updatedWeeks);
    saveWeeks(updatedWeeks);
  }, []);

  const addSet = useCallback(
    (weekId: string, sessionId: string, exerciseId: string, set: SetResult) => {
      if (!weeks) return;

      const updatedWeeks = weeks.map((week) => {
        if (week.id !== weekId) return week;

        return {
          ...week,
          sessions: week.sessions.map((session) => {
            if (session.id !== sessionId) return session;

            return {
              ...session,
              exercises: session.exercises.map((exercise) => {
                if (exercise.id !== exerciseId) return exercise;

                return {
                  ...exercise,
                  sets: [...exercise.sets, set],
                };
              }),
            };
          }),
        };
      });

      updateWeeks(updatedWeeks);
    },
    [weeks, updateWeeks]
  );

  const updateSet = useCallback(
    (weekId: string, sessionId: string, exerciseId: string, setNumber: number, updates: Partial<SetResult>) => {
      if (!weeks) return;

      const updatedWeeks = weeks.map((week) => {
        if (week.id !== weekId) return week;

        return {
          ...week,
          sessions: week.sessions.map((session) => {
            if (session.id !== sessionId) return session;

            return {
              ...session,
              exercises: session.exercises.map((exercise) => {
                if (exercise.id !== exerciseId) return exercise;

                return {
                  ...exercise,
                  sets: exercise.sets.map((set) =>
                    set.setNumber === setNumber ? { ...set, ...updates } : set
                  ),
                };
              }),
            };
          }),
        };
      });

      updateWeeks(updatedWeeks);
    },
    [weeks, updateWeeks]
  );

  const deleteSet = useCallback(
    (weekId: string, sessionId: string, exerciseId: string, setNumber: number) => {
      if (!weeks) return;

      const updatedWeeks = weeks.map((week) => {
        if (week.id !== weekId) return week;

        return {
          ...week,
          sessions: week.sessions.map((session) => {
            if (session.id !== sessionId) return session;

            return {
              ...session,
              exercises: session.exercises.map((exercise) => {
                if (exercise.id !== exerciseId) return exercise;

                return {
                  ...exercise,
                  sets: exercise.sets
                    .filter((set) => set.setNumber !== setNumber)
                    .map((set, index) => ({ ...set, setNumber: index + 1 })),
                };
              }),
            };
          }),
        };
      });

      updateWeeks(updatedWeeks);
    },
    [weeks, updateWeeks]
  );

  const startSession = useCallback(
    (weekId: string, sessionId: string) => {
      if (!weeks) return;

      const updatedWeeks = weeks.map((week) => {
        if (week.id !== weekId) return week;

        return {
          ...week,
          sessions: week.sessions.map((session) => {
            if (session.id !== sessionId) return session;

            return {
              ...session,
            };
          }),
        };
      });

      updateWeeks(updatedWeeks);
    },
    [weeks, updateWeeks]
  );

  const completeSession = useCallback(
    (weekId: string, sessionId: string) => {
      if (!weeks) return;

      const updatedWeeks = weeks.map((week) => {
        if (week.id !== weekId) return week;

        return {
          ...week,
          sessions: week.sessions.map((session) => {
            if (session.id !== sessionId) return session;

            return {
              ...session,
              completed: true,
              completedDate: new Date().toISOString(),
            };
          }),
        };
      });

      updateWeeks(updatedWeeks);
    },
    [weeks, updateWeeks]
  );

  const importWeeks = useCallback(
    (newWeeks: Week[]) => {
      updateWeeks(newWeeks);
    },
    [updateWeeks]
  );

  return {
    weeks,
    addSet,
    updateSet,
    deleteSet,
    startSession,
    completeSession,
    importWeeks,
    updateWeeks,
  };
};
