import { useState, useEffect, useCallback } from 'react';
import { Week, SetResult, Exercise } from '@/types/workout';
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
              startedAt: session.startedAt || new Date().toISOString(),
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
              startedAt: session.startedAt || new Date().toISOString(),
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

  const skipExercise = useCallback(
    (weekId: string, sessionId: string, exerciseId: string) => {
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
                  skipped: true,
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

  const unskipExercise = useCallback(
    (weekId: string, sessionId: string, exerciseId: string) => {
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
                  skipped: false,
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

  const updateExerciseNotes = useCallback(
    (weekId: string, sessionId: string, exerciseId: string, userNotes: string) => {
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
                  userNotes,
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

  const updateExercise = useCallback(
    (weekId: string, sessionId: string, exerciseId: string, updates: Partial<Exercise>) => {
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

                // Determine if we should clear sets
                let shouldClearSets = false;

                // Case 1: Exercise name changed
                if (updates.name && updates.name !== exercise.name) {
                  shouldClearSets = true;
                }

                // Case 2: Load type changed (bodyweight <-> weighted)
                if (updates.targetLoad && updates.targetLoad !== exercise.targetLoad) {
                  const currentIsBodyweight = exercise.targetLoad.toLowerCase().includes('bodyweight') ||
                                              exercise.targetLoad.toLowerCase() === 'bw';
                  const newIsBodyweight = updates.targetLoad.toLowerCase().includes('bodyweight') ||
                                         updates.targetLoad.toLowerCase() === 'bw';

                  if (currentIsBodyweight !== newIsBodyweight) {
                    shouldClearSets = true;
                  }
                }

                const clearedUpdates = shouldClearSets
                  ? { ...updates, sets: [] }
                  : updates;

                return {
                  ...exercise,
                  ...clearedUpdates,
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

  const updateExerciseInAllSessions = useCallback(
    (originalName: string, updates: Partial<Exercise>) => {
      if (!weeks) return;

      const updatedWeeks = weeks.map((week) => ({
        ...week,
        sessions: week.sessions.map((session) => ({
          ...session,
          exercises: session.exercises.map((exercise) => {
            if (exercise.name === originalName) {
              // Determine if we should clear sets
              let shouldClearSets = false;

              // Case 1: Exercise name changed
              if (updates.name && updates.name !== exercise.name) {
                shouldClearSets = true;
              }

              // Case 2: Load type changed (bodyweight <-> weighted)
              if (updates.targetLoad && updates.targetLoad !== exercise.targetLoad) {
                const currentIsBodyweight = exercise.targetLoad.toLowerCase().includes('bodyweight') ||
                                            exercise.targetLoad.toLowerCase() === 'bw';
                const newIsBodyweight = updates.targetLoad.toLowerCase().includes('bodyweight') ||
                                       updates.targetLoad.toLowerCase() === 'bw';

                if (currentIsBodyweight !== newIsBodyweight) {
                  shouldClearSets = true;
                }
              }

              const clearedUpdates = shouldClearSets
                ? { ...updates, sets: [] }
                : updates;

              return {
                ...exercise,
                ...clearedUpdates,
              };
            }
            return exercise;
          }),
        })),
      }));

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
    skipExercise,
    unskipExercise,
    updateExerciseNotes,
    updateExercise,
    updateExerciseInAllSessions,
    importWeeks,
    updateWeeks,
  };
};
