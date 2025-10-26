/**
 * GUID Helper Utilities
 *
 * Ephemeral GUIDs for deterministic tool execution.
 * GUIDs exist only during operation execution, not in persistent data.
 */

import type { Week, WorkoutSession, Exercise, SetResult } from '@/types/workout';

/**
 * Generate a random 4-character alphanumeric GUID
 * Format: lowercase letters + numbers (e.g., "a3f2", "k9m1")
 *
 * Total combinations: 36^4 = 1,679,616
 * Collision probability negligible for typical workout programs (<500 items)
 */
export function generateGuid(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let guid = '';
  for (let i = 0; i < 4; i++) {
    guid += chars[Math.floor(Math.random() * chars.length)];
  }
  return guid;
}

/**
 * Generate a GUID that's unique within the given set
 * Handles collisions by regenerating until unique
 */
export function ensureUniqueGuid(existingGuids: Set<string>): string {
  let guid: string;
  do {
    guid = generateGuid();
  } while (existingGuids.has(guid));
  return guid;
}

/**
 * Add ephemeral GUIDs to all items in workout program
 * Mutates the input for performance (caller should pass a clone)
 *
 * @param weeks - Workout program to add GUIDs to (will be mutated)
 * @returns The same weeks array (for chaining)
 */
export function addEphemeralGUIDs(weeks: Week[]): Week[] {
  const existingGuids = new Set<string>();

  weeks.forEach(week => {
    // Add GUID to week
    week.guid = ensureUniqueGuid(existingGuids);
    existingGuids.add(week.guid);

    week.sessions.forEach(session => {
      // Add GUID to session
      session.guid = ensureUniqueGuid(existingGuids);
      existingGuids.add(session.guid);

      session.exercises.forEach(exercise => {
        // Add GUID to exercise
        exercise.guid = ensureUniqueGuid(existingGuids);
        existingGuids.add(exercise.guid);

        // Add GUID to each set
        exercise.sets?.forEach(set => {
          set.guid = ensureUniqueGuid(existingGuids);
          existingGuids.add(set.guid);
        });
      });
    });
  });

  return weeks;
}

/**
 * Remove all GUIDs from workout program
 * Mutates the input for performance (caller should pass a clone)
 *
 * @param weeks - Workout program to strip GUIDs from (will be mutated)
 * @returns The same weeks array (for chaining)
 */
export function stripGUIDs(weeks: Week[]): Week[] {
  weeks.forEach(week => {
    delete week.guid;

    week.sessions.forEach(session => {
      delete session.guid;

      session.exercises.forEach(exercise => {
        delete exercise.guid;

        exercise.sets?.forEach(set => {
          delete set.guid;
        });
      });
    });
  });

  return weeks;
}

/**
 * Find item by GUID in workout program
 * Returns the item and its parent references
 */
export function findByGuid(weeks: Week[], guid: string): {
  week?: Week;
  session?: WorkoutSession;
  exercise?: Exercise;
  set?: SetResult;
  parentWeek?: Week;
  parentSession?: WorkoutSession;
  parentExercise?: Exercise;
} {
  for (const week of weeks) {
    // Check if this week matches
    if (week.guid === guid) {
      return { week };
    }

    for (const session of week.sessions) {
      // Check if this session matches
      if (session.guid === guid) {
        return { session, parentWeek: week };
      }

      for (const exercise of session.exercises) {
        // Check if this exercise matches
        if (exercise.guid === guid) {
          return { exercise, parentSession: session, parentWeek: week };
        }

        // Check sets
        if (exercise.sets) {
          for (const set of exercise.sets) {
            if (set.guid === guid) {
              return { set, parentExercise: exercise, parentSession: session, parentWeek: week };
            }
          }
        }
      }
    }
  }

  // Not found
  return {};
}

/**
 * Collect all GUIDs currently in use in a workout program
 * Useful for debugging or validation
 */
export function collectAllGuids(weeks: Week[]): Set<string> {
  const guids = new Set<string>();

  weeks.forEach(week => {
    if (week.guid) guids.add(week.guid);

    week.sessions.forEach(session => {
      if (session.guid) guids.add(session.guid);

      session.exercises.forEach(exercise => {
        if (exercise.guid) guids.add(exercise.guid);

        exercise.sets?.forEach(set => {
          if (set.guid) guids.add(set.guid);
        });
      });
    });
  });

  return guids;
}
