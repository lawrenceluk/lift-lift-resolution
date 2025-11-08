import { Week, Exercise, SetResult } from '@/types/workout';
import { parseId } from './idHelpers';

export interface ExerciseHistoryEntry {
  weekNumber: number;
  sessionNumber: number;
  sessionName: string;
  exercisePosition: number;
  date: string | undefined;
  exercise: Exercise;
  sets: SetResult[];
}

/**
 * Find all occurrences of an exercise by name (case-insensitive)
 * @param weeks All weeks in the program
 * @param exerciseName Name of the exercise to search for
 * @returns Array of exercise history entries, sorted by date (newest first)
 */
export function findExerciseHistory(
  weeks: Week[] | null,
  exerciseName: string
): ExerciseHistoryEntry[] {
  if (!weeks || !exerciseName) return [];

  const history: ExerciseHistoryEntry[] = [];
  const searchName = exerciseName.toLowerCase();

  weeks.forEach((week) => {
    week.sessions.forEach((session) => {
      session.exercises.forEach((exercise, exerciseIndex) => {
        // Match by name (case-insensitive) and include current exercise
        if (
          exercise.name.toLowerCase() === searchName &&
          exercise.sets.length > 0 // Only include if there are logged sets
        ) {
          const parsedSessionId = parseId(session.id);
          const sessionNumber = parsedSessionId?.sessionNumber || 0;

          history.push({
            weekNumber: week.weekNumber,
            sessionNumber,
            sessionName: session.name,
            exercisePosition: exerciseIndex + 1, // 1-based index for display
            date: session.completedDate || session.startedAt,
            exercise,
            sets: exercise.sets,
          });
        }
      });
    });
  });

  // Sort by date (newest first), then by week number, then by session number
  return history.sort((a, b) => {
    // First sort by date if available
    if (a.date && b.date) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    if (a.date) return -1;
    if (b.date) return 1;

    // Fall back to week/session number (reverse order for newer weeks)
    if (b.weekNumber !== a.weekNumber) {
      return b.weekNumber - a.weekNumber;
    }
    return b.sessionNumber - a.sessionNumber;
  });
}

/**
 * Check if an exercise has any occurrences with logged sets
 */
export function hasExerciseHistory(
  weeks: Week[] | null,
  exerciseName: string
): boolean {
  return findExerciseHistory(weeks, exerciseName).length > 0;
}
