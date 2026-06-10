import { PerformedSession, Exercise, SetResult } from '@/types/workout';

export interface ExerciseHistoryEntry {
  sessionId: string;
  sessionName: string;
  performedDate: string;
  /** Ingested records are git-truth — corrections go through chat, not edits here. */
  editable: boolean;
  exercise: Exercise;
  sets: SetResult[];
}

/**
 * All performances of an exercise by name (case-insensitive) across the
 * performed records (program history + local device-truth), newest first.
 * `currentSessionId` excludes the session being viewed.
 */
export function findExerciseHistory(
  records: { session: PerformedSession; editable: boolean }[],
  exerciseName: string,
  currentSessionId?: string
): ExerciseHistoryEntry[] {
  if (!exerciseName) return [];
  const searchName = exerciseName.toLowerCase();

  const history: ExerciseHistoryEntry[] = [];
  for (const { session, editable } of records) {
    if (currentSessionId && session.id === currentSessionId) continue;
    for (const exercise of session.exercises) {
      if (exercise.name.toLowerCase() === searchName && (exercise.sets || []).length > 0) {
        history.push({
          sessionId: session.id,
          sessionName: session.name,
          performedDate: session.performedDate,
          editable,
          exercise,
          sets: exercise.sets,
        });
      }
    }
  }

  return history.sort((a, b) => b.performedDate.localeCompare(a.performedDate));
}

/** The most recent completed set of a load-compatible same-name exercise — the
 *  "last time" placeholder shown in the set logger. */
export function lastPerformance(
  history: ExerciseHistoryEntry[],
  targetLoad: string
): SetResult | null {
  const isBodyweight = (load: string) =>
    load.toLowerCase().includes('bodyweight') || load.toLowerCase() === 'bw';
  const currentIsBodyweight = isBodyweight(targetLoad);

  for (const entry of history) {
    if (isBodyweight(entry.exercise.targetLoad) !== currentIsBodyweight) continue;
    const completed = entry.sets.filter((s) => s.completed);
    if (completed.length > 0) return completed[completed.length - 1];
  }
  return null;
}
