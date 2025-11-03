/**
 * Read Tool Executors
 * These tools fetch data from the workout program without modifying it
 * They are executed server-side and results are fed back to the LLM
 */

import type { WorkoutContext } from './ai-service';
import { formatExerciseDetails } from './formatters';

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
    // Return all weeks with detailed session and exercise data
    result += '=== FULL WORKOUT PROGRAM DATA ===\n';
    result += `Total weeks: ${context.fullProgram.length}\n`;

    const totalSessions = context.fullProgram.reduce(
      (sum: number, w: any) => sum + (w.sessions?.length || 0),
      0
    );
    result += `Total sessions: ${totalSessions}\n`;

    context.fullProgram.forEach((week: any) => {
      result += `\n\n📅 WEEK ${week.weekNumber}`;
      if (week.phase) result += ` - ${week.phase}`;
      if (week.startDate && week.endDate) {
        result += `\n${week.startDate} to ${week.endDate}`;
      }
      if (week.description) {
        result += `\nDescription: ${week.description}`;
      }
      result += `\nSessions: ${week.sessions?.length || 0}`;

      // Show each session in the week
      week.sessions?.forEach((session: any, idx: number) => {
        result += `\n\n--- Session ${idx + 1}: ${session.name || 'Unnamed'} (${session.id})`;
        result += `\nStatus: ${session.completed ? 'Completed ✓' : session.startedAt ? 'In Progress' : 'Not Started'}`;
        if (session.scheduledDate) result += `\nScheduled: ${session.scheduledDate}`;
        if (session.completedDate) result += `\nCompleted: ${session.completedDate}`;
        if (session.duration) result += `\nDuration: ${session.duration} minutes`;
        if (session.notes) result += `\nNotes: ${session.notes}`;

        result += `\n\nExercises:`;
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

    result += `=== WEEK ${week.weekNumber} DATA ===\n`;
    if (week.phase) result += `Phase: ${week.phase}\n`;
    if (week.startDate && week.endDate) {
      result += `Period: ${week.startDate} to ${week.endDate}\n`;
    }
    if (week.description) {
      result += `Description: ${week.description}\n`;
    }
    result += `Sessions: ${week.sessions?.length || 0}`;

    week.sessions?.forEach((session: any, idx: number) => {
      result += `\n\n--- Session ${idx + 1}: ${session.name || 'Unnamed'} (${session.id})`;
      result += `\nStatus: ${session.completed ? 'Completed ✓' : session.startedAt ? 'In Progress' : 'Not Started'}`;
      if (session.scheduledDate) result += `\nScheduled: ${session.scheduledDate}`;
      if (session.completedDate) result += `\nCompleted: ${session.completedDate}`;
      if (session.duration) result += `\nDuration: ${session.duration} minutes`;
      if (session.notes) result += `\nNotes: ${session.notes}`;

      result += `\n\nExercises:`;
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

    result += `=== SESSION DATA ===\n`;
    result += `Session: ${session.name || 'Unnamed'} (${session.id})\n`;
    result += `Week ${week.weekNumber}`;
    if (week.phase) result += ` - ${week.phase}`;
    result += `\nStatus: ${session.completed ? 'Completed ✓' : session.startedAt ? 'In Progress' : 'Not Started'}`;
    if (session.scheduledDate) result += `\nScheduled: ${session.scheduledDate}`;
    if (session.completedDate) result += `\nCompleted: ${session.completedDate}`;
    if (session.duration) result += `\nDuration: ${session.duration} minutes`;
    if (session.notes) result += `\nNotes: ${session.notes}`;

    result += `\n\nExercises:`;
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

  result += `=== CURRENT WEEK DETAILED DATA ===\n`;
  result += `Week ${week.weekNumber}`;
  if (week.phase) result += ` - ${week.phase}`;
  result += `\n`;
  if (week.startDate && week.endDate) {
    result += `Period: ${week.startDate} to ${week.endDate}\n`;
  }
  if (week.description) {
    result += `Description: ${week.description}\n`;
  }
  result += `Sessions: ${week.sessions?.length || 0}`;

  // Show ALL sessions in the week with full detail (always include set data)
  week.sessions?.forEach((session: any, idx: number) => {
    result += `\n\n--- Session ${idx + 1}: ${session.name || 'Unnamed'} (${session.id})`;
    result += `\nStatus: ${session.completed ? 'Completed ✓' : session.startedAt ? 'In Progress' : 'Not Started'}`;
    if (session.scheduledDate) result += `\nScheduled: ${session.scheduledDate}`;
    if (session.completedDate) result += `\nCompleted: ${session.completedDate}`;
    if (session.duration) result += `\nDuration: ${session.duration} minutes`;
    if (session.notes) result += `\nNotes: ${session.notes}`;

    result += `\n\nExercises:`;
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
