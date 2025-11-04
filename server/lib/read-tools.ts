/**
 * Read Tool Executors
 * These tools fetch data from the workout program without modifying it
 * They are executed server-side and results are fed back to the LLM
 *
 * COMPACT OUTPUT FORMAT:
 * - Weeks: W1 PhaseName [MM-DD→MM-DD] Nsess
 * - Sessions: S1:Name {Status Ndur sch:MM-DD cmp:MM-DD}
 * - Exercises: E1:Name 3×8@225lb [3/3]
 * - Sets: 1:10@225r2 (setNum:reps@weight+RIR)
 */

import type { WorkoutContext } from './ai-service';
import { formatExerciseDetails, compressDate, formatSessionStatus } from './formatters';

interface GetWorkoutDataParams {
  scope: 'full_program' | 'specific_week' | 'specific_session';
  weekNumber?: number;
  sessionNumber?: number;
  includeSetData?: boolean;
}

/**
 * Execute get_workout_data tool
 * Returns detailed workout data based on scope
 */
export function executeGetWorkoutData(
  params: GetWorkoutDataParams,
  context: WorkoutContext
): string {
  const includeSetData = params.includeSetData !== false; // default true
  let result = '';

  if (params.scope === 'full_program') {
    // Compact header: total weeks & sessions only
    const totalSessions = context.fullProgram.reduce(
      (sum: number, w: any) => sum + (w.sessions?.length || 0),
      0
    );
    result += `PROGRAM: ${context.fullProgram.length}w ${totalSessions}sess\n`;

    context.fullProgram.forEach((week: any) => {
      // Format: W1 PhaseName [01-01→01-07] "Description" 3sess
      result += `\nW${week.weekNumber}`;
      if (week.phase) result += ` ${week.phase}`;
      if (week.startDate && week.endDate) {
        result += ` [${compressDate(week.startDate)}→${compressDate(week.endDate)}]`;
      }
      if (week.description) result += ` "${week.description}"`;
      result += ` ${week.sessions?.length || 0}sess`;

      // Show each session in the week
      week.sessions?.forEach((session: any, idx: number) => {
        // Format: S1:Name {C 60m sch:01-01 cmp:01-01T14:30} "notes"
        result += `\nS${idx + 1}:${session.name || 'Unnamed'}`;
        result += ` {${formatSessionStatus(session)}`;
        if (session.duration) result += ` ${session.duration}m`;
        if (session.scheduledDate) result += ` sch:${compressDate(session.scheduledDate)}`;
        if (session.completedDate) result += ` cmp:${compressDate(session.completedDate)}`;
        result += `}`;
        if (session.notes) result += ` "${session.notes}"`;

        result += formatExerciseDetails(session.exercises, includeSetData);
      });
    });

  } else if (params.scope === 'specific_week') {
    if (!params.weekNumber) {
      return 'Error: weekNumber is required for specific_week scope';
    }

    const week = context.fullProgram.find((w: any) => w.weekNumber === params.weekNumber);
    if (!week) {
      return `Error: Week ${params.weekNumber} not found`;
    }

    // Format: W1 PhaseName [01-01→01-07] "Description" 3sess
    result += `W${week.weekNumber}`;
    if (week.phase) result += ` ${week.phase}`;
    if (week.startDate && week.endDate) {
      result += ` [${compressDate(week.startDate)}→${compressDate(week.endDate)}]`;
    }
    if (week.description) result += ` "${week.description}"`;
    result += ` ${week.sessions?.length || 0}sess`;

    week.sessions?.forEach((session: any, idx: number) => {
      result += `\nS${idx + 1}:${session.name || 'Unnamed'}`;
      result += ` {${formatSessionStatus(session)}`;
      if (session.duration) result += ` ${session.duration}m`;
      if (session.scheduledDate) result += ` sch:${compressDate(session.scheduledDate)}`;
      if (session.completedDate) result += ` cmp:${compressDate(session.completedDate)}`;
      result += `}`;
      if (session.notes) result += ` "${session.notes}"`;

      result += formatExerciseDetails(session.exercises, includeSetData);
    });

  } else if (params.scope === 'specific_session') {
    if (!params.weekNumber || !params.sessionNumber) {
      return 'Error: weekNumber and sessionNumber are required for specific_session scope';
    }

    const week = context.fullProgram.find((w: any) => w.weekNumber === params.weekNumber);
    if (!week) {
      return `Error: Week ${params.weekNumber} not found`;
    }

    const session = week.sessions?.[params.sessionNumber - 1]; // 1-based to 0-based
    if (!session) {
      return `Error: Session ${params.sessionNumber} not found in week ${params.weekNumber}`;
    }

    // Format: W1.S1:Name {C 60m sch:01-01 cmp:01-01T14:30} "notes"
    result += `W${week.weekNumber}`;
    if (week.phase) result += ` ${week.phase}`;
    result += `\nS${params.sessionNumber}:${session.name || 'Unnamed'}`;
    result += ` {${formatSessionStatus(session)}`;
    if (session.duration) result += ` ${session.duration}m`;
    if (session.scheduledDate) result += ` sch:${compressDate(session.scheduledDate)}`;
    if (session.completedDate) result += ` cmp:${compressDate(session.completedDate)}`;
    result += `}`;
    if (session.notes) result += ` "${session.notes}"`;

    result += formatExerciseDetails(session.exercises, includeSetData);
  }

  return result;
}

/**
 * Execute get_current_week_detail tool
 * Returns detailed data for ALL sessions in the current week only
 * Much more efficient than fetching full_program when user questions are week-specific
 * Always includes full set-by-set data (that's the purpose of this tool)
 */
export function executeGetCurrentWeekDetail(
  params: Record<string, never>, // No parameters needed
  context: WorkoutContext
): string {
  // Find current week from context
  if (!context.currentWeek) {
    return 'Error: No current week in context. User is not viewing a week.';
  }

  const week = context.currentWeek;
  let result = '';

  // Format: W1 PhaseName [01-01→01-07] "Description" 3sess
  result += `W${week.weekNumber}`;
  if (week.phase) result += ` ${week.phase}`;
  if (week.startDate && week.endDate) {
    result += ` [${compressDate(week.startDate)}→${compressDate(week.endDate)}]`;
  }
  if (week.description) result += ` "${week.description}"`;
  result += ` ${week.sessions?.length || 0}sess`;

  // Show ALL sessions in the week with full detail (always include set data)
  week.sessions?.forEach((session: any, idx: number) => {
    result += `\nS${idx + 1}:${session.name || 'Unnamed'}`;
    result += ` {${formatSessionStatus(session)}`;
    if (session.duration) result += ` ${session.duration}m`;
    if (session.scheduledDate) result += ` sch:${compressDate(session.scheduledDate)}`;
    if (session.completedDate) result += ` cmp:${compressDate(session.completedDate)}`;
    result += `}`;
    if (session.notes) result += ` "${session.notes}"`;

    result += formatExerciseDetails(session.exercises, true); // Always include set details
  });

  return result;
}

/**
 * Execute any read tool by name
 */
export function executeReadTool(
  toolName: string,
  params: any,
  context: WorkoutContext
): string {
  switch (toolName) {
    case 'get_workout_data':
      return executeGetWorkoutData(params, context);
    case 'get_current_week_detail':
      return executeGetCurrentWeekDetail(params, context);
    default:
      return `Error: Unknown read tool: ${toolName}`;
  }
}
