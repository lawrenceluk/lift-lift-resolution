import { useState, useEffect, useCallback } from 'react';
import { Week, SetResult, Exercise, WorkoutSession } from '@/types/workout';
import { loadWeeks, saveWeeks } from '@/utils/localStorage';
import { createSampleWeeks } from '@/data/sampleWorkout';
import { createSessionId, createExerciseId } from '@/utils/idHelpers';
import { fetchProgram, postSession } from '@/lib/api';

/** True if any session in the program has logged sets (frontend-truth actuals). */
const hasLoggedActuals = (weeks: Week[]): boolean =>
  weeks.some((w) =>
    w.sessions.some((s) =>
      s.exercises.some((ex) => (ex.sets || []).length > 0)
    )
  );

export const useWorkoutProgram = () => {
  const [weeks, setWeeks] = useState<Week[] | null>(null);

  // Load initial data: localStorage wins (it may hold the user's in-progress
  // logged sets — frontend-truth that must not be clobbered). If empty, pull the
  // program from the git seam. If the seam is unreachable AND nothing is cached,
  // fall back to the sample program so the app still works offline.
  useEffect(() => {
    let cancelled = false;

    const initializeWeeks = async () => {
      try {
        const localWeeks = loadWeeks();
        if (localWeeks && localWeeks.length > 0) {
          setWeeks(localWeeks);
          return;
        }

        // No local data — try the seam.
        try {
          const remote = await fetchProgram();
          if (cancelled) return;
          if (Array.isArray(remote) && remote.length > 0) {
            setWeeks(remote);
            saveWeeks(remote);
            return;
          }
        } catch (fetchErr) {
          console.warn('Could not fetch program from seam, falling back:', fetchErr);
        }

        // Offline (or empty program) and no cache — seed with sample.
        if (cancelled) return;
        const sampleWeeks = createSampleWeeks();
        setWeeks(sampleWeeks);
        saveWeeks(sampleWeeks);
      } catch (err) {
        console.warn('Error initializing weeks:', err);
        if (cancelled) return;
        const sampleWeeks = createSampleWeeks();
        setWeeks(sampleWeeks);
        saveWeeks(sampleWeeks);
      }
    };

    initializeWeeks();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Pull the latest program from Point One (the git seam) and replace local
   * state. This is how a freshly-progressed block gets in. The caller (header
   * menu) is responsible for confirming first if there are unsynced actuals —
   * see WorkoutTrackerApp; we expose a detector and a forced replace.
   *
   * Returns { replaced, hadLocalActuals } so the UI can toast appropriately.
   */
  const pullProgram = useCallback(async (): Promise<{ replaced: boolean; error?: string }> => {
    try {
      const remote = await fetchProgram();
      if (!Array.isArray(remote) || remote.length === 0) {
        return { replaced: false, error: 'The program from Point One was empty.' };
      }
      setWeeks(remote);
      saveWeeks(remote);
      return { replaced: true };
    } catch (err) {
      return { replaced: false, error: (err as Error).message };
    }
  }, []);

  /** Does the current program hold logged sets not necessarily synced yet? */
  const hasUnsyncedActuals = useCallback((): boolean => {
    return !!weeks && hasLoggedActuals(weeks);
  }, [weeks]);

  /**
   * Single funnel for all program mutations: apply optimistically + persist.
   * Every mutator below routes through here.
   *
   * NOTE on the write path: we deliberately do NOT POST to the seam from here.
   * Most mutations are intermediate set logging; we only sync whole performed
   * sessions, on completion (see completeSession). localStorage is the offline
   * cache; the POST is the sync.
   */
  const updateWeeks = useCallback((updatedWeeks: Week[]) => {
    // Optimistic update: apply immediately
    setWeeks(updatedWeeks);

    // Persist to localStorage
    saveWeeks(updatedWeeks);
  }, []);

  /**
   * Fire-and-forget sync of one performed session to the git seam. NEVER blocks
   * or throws into the logging UX: local state is already saved before this is
   * called. On failure the data stays in localStorage and the caller surfaces a
   * non-blocking toast; the next completed session (or a manual pull) re-syncs.
   *
   * Returns a Promise<boolean> the caller may await ONLY to toast — the UI must
   * not gate navigation on it.
   */
  const syncSession = useCallback(async (session: WorkoutSession): Promise<boolean> => {
    try {
      const res = await postSession(session);
      return !!res.ok;
    } catch (err) {
      console.warn('Session sync failed (kept locally, will retry):', err);
      return false;
    }
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
    (weekId: string, sessionId: string): WorkoutSession | undefined => {
      if (!weeks) return undefined;

      let completedSession: WorkoutSession | undefined;

      const updatedWeeks = weeks.map((week) => {
        if (week.id !== weekId) return week;

        return {
          ...week,
          sessions: week.sessions.map((session) => {
            if (session.id !== sessionId) return session;

            const next = {
              ...session,
              completed: true,
              completedDate: new Date().toISOString(),
            };
            completedSession = next;
            return next;
          }),
        };
      });

      // Local-first: persist immediately, before any network work.
      updateWeeks(updatedWeeks);

      // Return the hydrated completed session so the caller can fire the seam
      // sync (non-blocking) and toast on failure. We do NOT POST here so the
      // hook stays free of UI concerns (toasts) — the shell owns that.
      return completedSession;
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
    // Git seam wiring
    pullProgram,
    hasUnsyncedActuals,
    syncSession,
  };
};
