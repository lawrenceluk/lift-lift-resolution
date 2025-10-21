import { Week, WorkoutSession, Exercise, WorkoutStatus } from '@/types/workout';

export const createWeekId = (weekNumber: number): string => `week-${weekNumber}`;

export const createSessionId = (weekNumber: number, sessionNumber: number): string =>
  `week-${weekNumber}-session-${sessionNumber}`;

export const createExerciseId = (
  weekNumber: number,
  sessionNumber: number,
  exerciseNumber: number
): string => `week-${weekNumber}-session-${sessionNumber}-exercise-${exerciseNumber}`;

export const parseId = (id: string) => {
  const parts = id.split('-');
  if (parts[0] !== 'week') return null;

  return {
    weekNumber: parseInt(parts[1]),
    weekId: `week-${parts[1]}`,
    sessionNumber: parts.length >= 4 ? parseInt(parts[3]) : null,
    sessionId: parts.length >= 4 ? parts.slice(0, 4).join('-') : null,
    exerciseNumber: parts.length >= 6 ? parseInt(parts[5]) : null,
    exerciseId: parts.length >= 6 ? parts.slice(0, 6).join('-') : null,
  };
};

export const getWeekId = (anyId: string): string => {
  const parts = anyId.split('-');
  return `week-${parts[1]}`;
};

export const getSessionId = (exerciseId: string): string => {
  const parts = exerciseId.split('-');
  return parts.slice(0, 4).join('-');
};

export const findWeek = (weeks: Week[], id: string): Week | undefined => {
  const weekId = getWeekId(id);
  return weeks.find((w) => w.id === weekId);
};

export const findSession = (weeks: Week[], id: string): WorkoutSession | undefined => {
  const week = findWeek(weeks, id);
  const sessionId = getSessionId(id);
  return week?.sessions.find((s) => s.id === sessionId);
};

export const findExercise = (weeks: Week[], exerciseId: string): Exercise | undefined => {
  const session = findSession(weeks, exerciseId);
  return session?.exercises.find((ex) => ex.id === exerciseId);
};

export const getBreadcrumb = (weeks: Week[], id: string) => {
  const parsed = parseId(id);
  if (!parsed) return null;

  const week = findWeek(weeks, id);
  const session = parsed.sessionId ? findSession(weeks, id) : null;
  const exercise = parsed.exerciseId ? findExercise(weeks, id) : null;

  return {
    week: week ? `Week ${week.weekNumber}` : null,
    session: session?.name || null,
    exercise: exercise?.name || null,
  };
};

export const sessionVolume = (session: WorkoutSession): number =>
  session.exercises.reduce(
    (sum, ex) =>
      sum + ex.sets.reduce((setSum, set) => setSum + (set.weight || 0) * set.reps, 0),
    0
  );

export const sessionCompletionRate = (session: WorkoutSession): number => {
  const completedSets = session.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
    0
  );
  const totalSets = session.exercises.reduce((sum, ex) => sum + ex.workingSets, 0);
  return totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
};

export const getWorkoutStatus = (session: WorkoutSession): WorkoutStatus => {
  if (session.completed) return 'completed';

  // Only consider it in-progress if at least one set has been completed
  const hasCompletedSets = session.exercises.some((ex) =>
    ex.sets.some((set) => set.completed)
  );

  if (session.startedAt && hasCompletedSets) return 'in-progress';
  return 'planned';
};
