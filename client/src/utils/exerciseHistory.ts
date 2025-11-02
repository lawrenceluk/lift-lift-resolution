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
 * Find all historical occurrences of an exercise by name (case-insensitive)
 * @param weeks All weeks in the program
 * @param exerciseName Name of the exercise to search for
 * @param currentExerciseId ID of the current exercise to exclude from results
 * @returns Array of historical exercise entries, sorted by date (newest first)
 */
export function findExerciseHistory(
  weeks: Week[] | null,
  exerciseName: string,
  currentExerciseId: string
): ExerciseHistoryEntry[] {
  if (!weeks || !exerciseName) return [];

  const history: ExerciseHistoryEntry[] = [];
  const searchName = exerciseName.toLowerCase();

  weeks.forEach((week) => {
    week.sessions.forEach((session) => {
      session.exercises.forEach((exercise, exerciseIndex) => {
        // Skip the current exercise and only match by name (case-insensitive)
        if (
          exercise.id !== currentExerciseId &&
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
 * Check if an exercise has any historical occurrences
 */
export function hasExerciseHistory(
  weeks: Week[] | null,
  exerciseName: string,
  currentExerciseId: string
): boolean {
  return findExerciseHistory(weeks, exerciseName, currentExerciseId).length > 0;
}
