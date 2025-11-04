import { useState, useEffect, useCallback, useRef } from 'react';
import { Week, SetResult, Exercise } from '@/types/workout';
import { loadWeeks, saveWeeks } from '@/utils/localStorage';
import { createSampleWeeks } from '@/data/sampleWorkout';
import { createSessionId, createExerciseId } from '@/utils/idHelpers';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';

const WORKOUT_SYNC_DEBOUNCE = 1000; // 1 second
const PROGRAM_ID_KEY = 'current_program_id';
const LAST_SYNC_KEY = 'last_workout_sync_hash';

/**
 * Get or create a program ID for the current user
 * Guests: stored in localStorage
 * Users: used to identify their current program in the database
 */
const getProgramId = (): string => {
  let programId = localStorage.getItem(PROGRAM_ID_KEY);
  if (!programId) {
    programId = crypto.randomUUID();
    localStorage.setItem(PROGRAM_ID_KEY, programId);
  }
  return programId;
};

/**
 * Create a simple hash of weeks to detect changes
 * Used to avoid unnecessary syncs
 */
const hashWeeks = (weeks: Week[] | null): string => {
  if (!weeks) return '';
  return JSON.stringify(weeks);
};

export const useWorkoutProgram = () => {
  const { user } = useAuth();
  const [weeks, setWeeks] = useState<Week[] | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout>();
  const programIdRef = useRef<string>(getProgramId());
  const lastSyncedWeeksRef = useRef<string>(''); // Track last synced state

  // Load initial data from localStorage or database
  useEffect(() => {
    const initializeWeeks = async () => {
      try {
        // Always load from localStorage first for instant UI response
        const localWeeks = loadWeeks();

        if (localWeeks && localWeeks.length > 0) {
          setWeeks(localWeeks);
          lastSyncedWeeksRef.current = hashWeeks(localWeeks);
        } else {
          // No local data, create sample
          const sampleWeeks = createSampleWeeks();
          setWeeks(sampleWeeks);
          saveWeeks(sampleWeeks);
          lastSyncedWeeksRef.current = hashWeeks(sampleWeeks);
        }

        // If user is logged in, sync from DB in background
        // But don't automatically trigger an upload - only load if DB has newer data
        if (user) {
          await syncWeeksFromDB();
        }
      } catch (err) {
        console.warn('Error initializing weeks:', err);
        // Fallback to sample if everything fails
        const sampleWeeks = createSampleWeeks();
        setWeeks(sampleWeeks);
        saveWeeks(sampleWeeks);
        lastSyncedWeeksRef.current = hashWeeks(sampleWeeks);
      }
    };

    initializeWeeks();
  }, [user?.id]);

  /**
   * Sync workout data from database to localStorage
   * Runs in background, prioritizes local changes if conflict
   */
  const syncWeeksFromDB = useCallback(async () => {
    if (!user) return;

    try {
      const programId = programIdRef.current;
      const { data, error } = await supabase
        .from('workout_programs')
        .select('*')
        .eq('id', programId)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is fine for new programs
        throw error;
      }

      if (data) {
        const dbWeeks = data.weeks as Week[];
        console.log('Synced workout program from DB:', programId);

        // Merge: local changes take precedence
        setWeeks((current) => {
          if (!current) return dbWeeks;
          // Local changes (current) win over DB values
          return current;
        });
      }
    } catch (err) {
      console.warn('Failed to sync workout program from DB:', err);
    }
  }, [user]);

  /**
   * Sync workout data to database in background
   * Only syncs if data has actually changed
   */
  const syncWeeksToDB = useCallback(async () => {
    if (!user || !weeks) return;

    const currentHash = hashWeeks(weeks);
    // Only sync if data has changed since last sync
    if (currentHash === lastSyncedWeeksRef.current) {
      console.log('No changes detected, skipping sync');
      return;
    }

    setIsSyncing(true);
    try {
      const programId = programIdRef.current;
      console.log('Syncing workout program to DB:', programId, 'for user:', user.id);

      const { error } = await supabase
        .from('workout_programs')
        .upsert(
          {
            id: programId,
            user_id: user.id,
            weeks: weeks,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      if (error) throw error;

      // Mark as synced
      lastSyncedWeeksRef.current = currentHash;
      console.log('Workout program synced successfully');
    } catch (err) {
      console.error('Failed to sync workout program to DB:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [user, weeks]);

  /**
   * Queue workout data for syncing to database
   * Uses debounce to batch multiple changes
   * Only queues if there are actual changes
   */
  const queueSync = useCallback(() => {
    if (!user) return; // Only sync for logged-in users

    // Check if there are changes before queuing
    const currentHash = hashWeeks(weeks);
    if (currentHash === lastSyncedWeeksRef.current) {
      console.log('No changes to queue');
      return;
    }

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      syncWeeksToDB();
    }, WORKOUT_SYNC_DEBOUNCE);
  }, [user, weeks, syncWeeksToDB]);

  /**
   * Update weeks with optimistic updates and background sync
   * Only syncs if data has actually changed
   */
  const updateWeeks = useCallback((updatedWeeks: Week[]) => {
    // Optimistic update: apply immediately
    setWeeks(updatedWeeks);

    // Save to localStorage for guests or as backup for users
    saveWeeks(updatedWeeks);

    // Queue sync to database if user is logged in (and data changed)
    queueSync();
  }, [queueSync]);

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return {
    weeks,
    isSyncing,
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
