import { useState, useEffect, useCallback } from 'react';
import { Week, SetResult, Exercise } from '@/types/workout';
import { loadWeeks, saveWeeks } from '@/utils/localStorage';
import { createSampleWeeks } from '@/data/sampleWorkout';
import { createSessionId, createExerciseId } from '@/utils/idHelpers';

export const useWorkoutProgram = () => {
  const [weeks, setWeeks] = useState<Week[] | null>(null);

  // Load initial data from localStorage (or seed with sample data).
  // GIT SEAM (future phase): replace/augment this with a fetch of the program
  // JSON from the git backend, falling back to localStorage/sample when offline.
  useEffect(() => {
    const initializeWeeks = () => {
      try {
        // Load from localStorage for instant UI response
        const localWeeks = loadWeeks();

        if (localWeeks && localWeeks.length > 0) {
          setWeeks(localWeeks);
        } else {
          // No local data, seed with sample program
          const sampleWeeks = createSampleWeeks();
          setWeeks(sampleWeeks);
          saveWeeks(sampleWeeks);
        }
      } catch (err) {
        console.warn('Error initializing weeks:', err);
        // Fallback to sample if everything fails
        const sampleWeeks = createSampleWeeks();
        setWeeks(sampleWeeks);
        saveWeeks(sampleWeeks);
      }
    };

    initializeWeeks();
  }, []);

  /**
   * Single funnel for all program mutations: apply optimistically + persist.
   * Every mutator below routes through here.
   * GIT SEAM (future phase): after the local write, commit the logged actuals
   * back to the git backend (debounced) here.
   */
  const updateWeeks = useCallback((updatedWeeks: Week[]) => {
    // Optimistic update: apply immediately
    setWeeks(updatedWeeks);

    // Persist to localStorage
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

  const deleteSession = useCallback(
    (weekId: string, sessionId: string) => {
      if (!weeks) return;

      const updatedWeeks = weeks.map((week) => {
        if (week.id !== weekId) return week;

        // Remove the session and renumber remaining sessions
        const filteredSessions = week.sessions.filter((s) => s.id !== sessionId);
        const renumberedSessions = filteredSessions.map((session, index) => {
          const sessionNumber = index + 1;

          return {
            ...session,
            id: createSessionId(week.weekNumber, sessionNumber),
            exercises: session.exercises.map((exercise, exIndex) => ({
              ...exercise,
              id: createExerciseId(week.weekNumber, sessionNumber, exIndex + 1),
            })),
          };
        });

        return {
          ...week,
          sessions: renumberedSessions,
        };
      });

      updateWeeks(updatedWeeks);
    },
    [weeks, updateWeeks]
  );

  const updateSession = useCallback(
    (weekId: string, sessionId: string, updates: { name?: string }) => {
      if (!weeks) return;

      const updatedWeeks = weeks.map((week) => {
        if (week.id !== weekId) return week;

        return {
          ...week,
          sessions: week.sessions.map((session) => {
            if (session.id !== sessionId) return session;

            return {
              ...session,
              ...updates,
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
    deleteSession,
    updateSession,
    skipExercise,
    unskipExercise,
    updateExerciseNotes,
    updateExercise,
    updateExerciseInAllSessions,
    importWeeks,
    updateWeeks,
  };
};
