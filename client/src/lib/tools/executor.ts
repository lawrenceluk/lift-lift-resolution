/**
 * Tool Execution Functions
 *
 * Validates and executes tool calls to modify workout programs.
 * Uses ephemeral GUIDs for deterministic, order-independent execution.
 * Follows atomic, all-or-nothing execution with proper error handling.
 */

import type { Week, Exercise, WorkoutSession } from '@/types/workout';
import type { ToolCall } from '@/types/chat';
import { findByGuid } from '@/utils/guidHelpers';
import type {
  ModifyExerciseParams,
  AddExerciseParams,
  RemoveExerciseParams,
  ReorderExercisesParams,
  ModifySessionParams,
  AddSessionParams,
  RemoveSessionParams,
  CopySessionParams,
  ModifyWeekParams,
  AddWeekParams,
  RemoveWeekParams,
  CreateWorkoutProgramParams,
} from './types';

// ============================================================================
// Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ExecutionResult {
  toolCallId: string;
  success: boolean;
  errors?: string[];
}

export interface ToolExecutionResult {
  success: boolean;
  data: Week[];
  results: ExecutionResult[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Deep clone workout data for immutability
 */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Create hierarchical ID for exercise
 */
function createExerciseId(weekNumber: number, sessionNumber: number, exerciseNumber: number): string {
  return `week-${weekNumber}-session-${sessionNumber}-exercise-${exerciseNumber}`;
}

/**
 * Create hierarchical ID for session
 */
function createSessionId(weekNumber: number, sessionNumber: number): string {
  return `week-${weekNumber}-session-${sessionNumber}`;
}

/**
 * Create hierarchical ID for week
 */
function createWeekId(weekNumber: number): string {
  return `week-${weekNumber}`;
}

/**
 * Renumber exercises in a session
 */
function renumberExercises(session: WorkoutSession, weekNumber: number, sessionNumber: number, startIndex: number = 0): void {
  for (let i = startIndex; i < session.exercises.length; i++) {
    session.exercises[i].id = createExerciseId(weekNumber, sessionNumber, i + 1);
  }
}

/**
 * Renumber sessions in a week (and their exercises)
 */
function renumberSessions(week: Week, startIndex: number = 0): void {
  for (let i = startIndex; i < week.sessions.length; i++) {
    const sessionNumber = i + 1;
    const session = week.sessions[i];
    session.id = createSessionId(week.weekNumber, sessionNumber);
    renumberExercises(session, week.weekNumber, sessionNumber);
  }
}

/**
 * Renumber weeks (and their sessions/exercises)
 */
function renumberWeeks(weeks: Week[], startIndex: number = 0): void {
  for (let i = startIndex; i < weeks.length; i++) {
    const weekNumber = i + 1;
    const week = weeks[i];
    week.weekNumber = weekNumber;
    week.id = createWeekId(weekNumber);
    renumberSessions(week);
  }
}

// ============================================================================
// Validation Functions
// ============================================================================

function validateModifyExercise(params: ModifyExerciseParams, workoutData: Week[]): ValidationResult {
  const errors: string[] = [];
  const { exercise } = findByGuid(workoutData, params.exerciseGuid);

  if (!exercise) {
    errors.push(`Exercise with GUID ${params.exerciseGuid} not found`);
    return { valid: false, errors };
  }

  if (Object.keys(params.updates).length === 0) {
    errors.push('No updates provided');
  }

  if (params.updates.workingSets !== undefined && params.updates.workingSets < 0) {
    errors.push('workingSets cannot be negative');
  }

  if (params.updates.warmupSets !== undefined && params.updates.warmupSets < 0) {
    errors.push('warmupSets cannot be negative');
  }

  if (params.updates.restSeconds !== undefined && params.updates.restSeconds < 0) {
    errors.push('restSeconds cannot be negative');
  }

  return { valid: errors.length === 0, errors };
}

function validateAddExercise(params: AddExerciseParams, workoutData: Week[]): ValidationResult {
  const errors: string[] = [];
  const { session } = findByGuid(workoutData, params.sessionGuid);

  if (!session) {
    errors.push(`Session with GUID ${params.sessionGuid} not found`);
    return { valid: false, errors };
  }

  if (!params.exercise.name) errors.push('Exercise name is required');
  if (!params.exercise.reps) errors.push('Exercise reps is required');
  if (!params.exercise.targetLoad) errors.push('Exercise targetLoad is required');
  if (params.exercise.workingSets === undefined) errors.push('Exercise workingSets is required');

  const maxPosition = session.exercises.length + 1;
  if (params.position !== 'end' && (params.position < 1 || params.position > maxPosition)) {
    errors.push(`Invalid position ${params.position}. Must be 1-${maxPosition} or "end"`);
  }

  return { valid: errors.length === 0, errors };
}

function validateRemoveExercise(params: RemoveExerciseParams, workoutData: Week[]): ValidationResult {
  const errors: string[] = [];
  const { exercise } = findByGuid(workoutData, params.exerciseGuid);

  if (!exercise) {
    errors.push(`Exercise with GUID ${params.exerciseGuid} not found`);
  }

  return { valid: errors.length === 0, errors };
}

function validateReorderExercises(params: ReorderExercisesParams, workoutData: Week[]): ValidationResult {
  const errors: string[] = [];
  const { exercise, parentSession } = findByGuid(workoutData, params.exerciseGuid);

  if (!exercise || !parentSession) {
    errors.push(`Exercise with GUID ${params.exerciseGuid} not found`);
    return { valid: false, errors };
  }

  const maxPosition = parentSession.exercises.length;
  if (params.newPosition < 1 || params.newPosition > maxPosition) {
    errors.push(`Invalid position ${params.newPosition}. Must be 1-${maxPosition}`);
  }

  return { valid: errors.length === 0, errors };
}

function validateModifySession(params: ModifySessionParams, workoutData: Week[]): ValidationResult {
  const errors: string[] = [];
  const { session } = findByGuid(workoutData, params.sessionGuid);

  if (!session) {
    errors.push(`Session with GUID ${params.sessionGuid} not found`);
    return { valid: false, errors };
  }

  if (Object.keys(params.updates).length === 0) {
    errors.push('No updates provided');
  }

  return { valid: errors.length === 0, errors };
}

function validateAddSession(params: AddSessionParams, workoutData: Week[]): ValidationResult {
  const errors: string[] = [];
  const { week } = findByGuid(workoutData, params.weekGuid);

  if (!week) {
    errors.push(`Week with GUID ${params.weekGuid} not found`);
    return { valid: false, errors };
  }

  if (!params.session.name) errors.push('Session name is required');

  const maxPosition = week.sessions.length + 1;
  if (params.position !== 'end' && (params.position < 1 || params.position > maxPosition)) {
    errors.push(`Invalid position ${params.position}. Must be 1-${maxPosition} or "end"`);
  }

  return { valid: errors.length === 0, errors };
}

function validateRemoveSession(params: RemoveSessionParams, workoutData: Week[]): ValidationResult {
  const errors: string[] = [];
  const { session } = findByGuid(workoutData, params.sessionGuid);

  if (!session) {
    errors.push(`Session with GUID ${params.sessionGuid} not found`);
  }

  return { valid: errors.length === 0, errors };
}

function validateCopySession(params: CopySessionParams, workoutData: Week[]): ValidationResult {
  const errors: string[] = [];
  const { session: sourceSession } = findByGuid(workoutData, params.sourceSessionGuid);
  const { week: targetWeek } = findByGuid(workoutData, params.targetWeekGuid);

  if (!sourceSession) {
    errors.push(`Source session with GUID ${params.sourceSessionGuid} not found`);
  }

  if (!targetWeek) {
    errors.push(`Target week with GUID ${params.targetWeekGuid} not found`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const maxPosition = targetWeek!.sessions.length + 1;
  if (params.position !== 'end' && (params.position < 1 || params.position > maxPosition)) {
    errors.push(`Invalid position ${params.position}. Must be 1-${maxPosition} or "end"`);
  }

  return { valid: errors.length === 0, errors };
}

function validateModifyWeek(params: ModifyWeekParams, workoutData: Week[]): ValidationResult {
  const errors: string[] = [];
  const { week } = findByGuid(workoutData, params.weekGuid);

  if (!week) {
    errors.push(`Week with GUID ${params.weekGuid} not found`);
    return { valid: false, errors };
  }

  if (Object.keys(params.updates).length === 0) {
    errors.push('No updates provided');
  }

  return { valid: errors.length === 0, errors };
}

function validateAddWeek(params: AddWeekParams, workoutData: Week[]): ValidationResult {
  const errors: string[] = [];

  if (!params.weeks || params.weeks.length === 0) {
    errors.push('At least one week is required');
  }

  const maxPosition = workoutData.length + 1;
  if (params.position !== 'end' && (params.position < 1 || params.position > maxPosition)) {
    errors.push(`Invalid position ${params.position}. Must be 1-${maxPosition} or "end"`);
  }

  return { valid: errors.length === 0, errors };
}

function validateRemoveWeek(params: RemoveWeekParams, workoutData: Week[]): ValidationResult {
  const errors: string[] = [];
  const { week } = findByGuid(workoutData, params.weekGuid);

  if (!week) {
    errors.push(`Week with GUID ${params.weekGuid} not found`);
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// Execution Functions
// ============================================================================

function executeModifyExercise(workoutData: Week[], params: ModifyExerciseParams): Week[] {
  const updatedData = deepClone(workoutData);
  const { exercise } = findByGuid(updatedData, params.exerciseGuid);

  // Clear existing sets if the exercise is being substantially changed
  let shouldClearSets = false;

  // Case 1: Exercise name changed (different exercise entirely)
  if (params.updates.name && params.updates.name !== exercise!.name) {
    shouldClearSets = true;
  }

  // Case 2: Load type changed (bodyweight <-> weighted)
  if (params.updates.targetLoad && params.updates.targetLoad !== exercise!.targetLoad) {
    const currentIsBodyweight = exercise!.targetLoad.toLowerCase().includes('bodyweight') ||
                                exercise!.targetLoad.toLowerCase() === 'bw';
    const newIsBodyweight = params.updates.targetLoad.toLowerCase().includes('bodyweight') ||
                           params.updates.targetLoad.toLowerCase() === 'bw';

    // Only clear if load type actually changed (not just "225 lbs" -> "235 lbs")
    if (currentIsBodyweight !== newIsBodyweight) {
      shouldClearSets = true;
    }
  }

  if (shouldClearSets) {
    exercise!.sets = [];
  }

  Object.assign(exercise!, params.updates);
  return updatedData;
}

function executeAddExercise(workoutData: Week[], params: AddExerciseParams): Week[] {
  const updatedData = deepClone(workoutData);
  const { session, parentWeek } = findByGuid(updatedData, params.sessionGuid);

  const insertPosition = params.position === 'end' ? session!.exercises.length : params.position - 1;

  const newExercise: Exercise = {
    id: '', // Will be set during renumbering
    name: params.exercise.name,
    reps: params.exercise.reps,
    targetLoad: params.exercise.targetLoad,
    workingSets: params.exercise.workingSets,
    warmupSets: params.exercise.warmupSets || 0,
    restSeconds: params.exercise.restSeconds || 180,
    notes: params.exercise.notes,
    groupLabel: params.exercise.groupLabel,
    sets: [],
    skipped: false,
  };

  session!.exercises.splice(insertPosition, 0, newExercise);

  // Renumber using week and session numbers
  const sessionIndex = parentWeek!.sessions.indexOf(session!);
  renumberExercises(session!, parentWeek!.weekNumber, sessionIndex + 1, insertPosition);

  return updatedData;
}

function executeRemoveExercise(workoutData: Week[], params: RemoveExerciseParams): Week[] {
  const updatedData = deepClone(workoutData);
  const { exercise, parentSession, parentWeek } = findByGuid(updatedData, params.exerciseGuid);

  const removeIndex = parentSession!.exercises.indexOf(exercise!);
  parentSession!.exercises.splice(removeIndex, 1);

  const sessionIndex = parentWeek!.sessions.indexOf(parentSession!);
  renumberExercises(parentSession!, parentWeek!.weekNumber, sessionIndex + 1, removeIndex);

  return updatedData;
}

function executeReorderExercises(workoutData: Week[], params: ReorderExercisesParams): Week[] {
  const updatedData = deepClone(workoutData);
  const { exercise, parentSession, parentWeek } = findByGuid(updatedData, params.exerciseGuid);

  const oldIndex = parentSession!.exercises.indexOf(exercise!);
  let newIndex = params.newPosition - 1;

  // If moving to an earlier position, the newIndex is correct
  // If moving to a later position, we need to adjust because splice removes first
  if (oldIndex < newIndex) {
    newIndex -= 1;
  }

  const [exerciseToMove] = parentSession!.exercises.splice(oldIndex, 1);
  parentSession!.exercises.splice(newIndex, 0, exerciseToMove);

  const sessionIndex = parentWeek!.sessions.indexOf(parentSession!);
  renumberExercises(parentSession!, parentWeek!.weekNumber, sessionIndex + 1);

  return updatedData;
}

function executeModifySession(workoutData: Week[], params: ModifySessionParams): Week[] {
  const updatedData = deepClone(workoutData);
  const { session } = findByGuid(updatedData, params.sessionGuid);
  Object.assign(session!, params.updates);
  return updatedData;
}

function executeAddSession(workoutData: Week[], params: AddSessionParams): Week[] {
  const updatedData = deepClone(workoutData);
  const { week } = findByGuid(updatedData, params.weekGuid);

  const insertPosition = params.position === 'end' ? week!.sessions.length : params.position - 1;

  const newSession: WorkoutSession = {
    id: '', // Will be set during renumbering
    name: params.session.name!,
    scheduledDate: params.session.scheduledDate,
    dayOfWeek: params.session.dayOfWeek,
    warmup: params.session.warmup || [],
    exercises: (params.session.exercises || []).map(ex => ({
      id: '', // Will be set during renumbering
      name: ex.name,
      groupLabel: ex.groupLabel,
      warmupSets: ex.warmupSets || 0,
      workingSets: ex.workingSets,
      reps: ex.reps,
      targetLoad: ex.targetLoad,
      restSeconds: ex.restSeconds || 180,
      notes: ex.notes,
      sets: [],
      skipped: false,
    })),
    notes: params.session.notes,
    completed: false,
  };

  week!.sessions.splice(insertPosition, 0, newSession);
  renumberSessions(week!, insertPosition);

  return updatedData;
}

function executeRemoveSession(workoutData: Week[], params: RemoveSessionParams): Week[] {
  const updatedData = deepClone(workoutData);
  const { session, parentWeek } = findByGuid(updatedData, params.sessionGuid);

  const removeIndex = parentWeek!.sessions.indexOf(session!);
  parentWeek!.sessions.splice(removeIndex, 1);
  renumberSessions(parentWeek!, removeIndex);

  return updatedData;
}

function executeCopySession(workoutData: Week[], params: CopySessionParams): Week[] {
  const updatedData = deepClone(workoutData);
  const { session: sourceSession } = findByGuid(updatedData, params.sourceSessionGuid);
  const { week: targetWeek } = findByGuid(updatedData, params.targetWeekGuid);

  const insertPosition = params.position === 'end' ? targetWeek!.sessions.length : params.position - 1;

  const newSession: WorkoutSession = deepClone(sourceSession!);
  newSession.completed = false;
  newSession.startedAt = undefined;
  newSession.completedDate = undefined;
  newSession.exercises.forEach(ex => {
    ex.sets = [];
    ex.skipped = false;
    ex.userNotes = undefined;
  });

  targetWeek!.sessions.splice(insertPosition, 0, newSession);
  renumberSessions(targetWeek!, insertPosition);

  return updatedData;
}

function executeModifyWeek(workoutData: Week[], params: ModifyWeekParams): Week[] {
  const updatedData = deepClone(workoutData);
  const { week } = findByGuid(updatedData, params.weekGuid);
  Object.assign(week!, params.updates);
  return updatedData;
}

function executeAddWeek(workoutData: Week[], params: AddWeekParams): Week[] {
  const updatedData = deepClone(workoutData);
  const insertPosition = params.position === 'end' ? updatedData.length : params.position - 1;

  const newWeeks: Week[] = params.weeks.map(weekData => ({
    id: '', // Will be set during renumbering
    weekNumber: 0, // Will be set during renumbering
    phase: weekData.phase,
    startDate: weekData.startDate,
    endDate: weekData.endDate,
    description: weekData.description,
    sessions: (weekData.sessions || []).map(sessData => ({
      id: '', // Will be set during renumbering
      name: sessData.name!,
      scheduledDate: sessData.scheduledDate,
      dayOfWeek: sessData.dayOfWeek,
      warmup: sessData.warmup || [],
      exercises: (sessData.exercises || []).map(exData => ({
        id: '', // Will be set during renumbering
        name: exData.name,
        groupLabel: exData.groupLabel,
        warmupSets: exData.warmupSets || 0,
        workingSets: exData.workingSets,
        reps: exData.reps,
        targetLoad: exData.targetLoad,
        restSeconds: exData.restSeconds || 180,
        notes: exData.notes,
        sets: [],
        skipped: false,
      })),
      notes: sessData.notes,
      completed: false,
    })),
  }));

  updatedData.splice(insertPosition, 0, ...newWeeks);
  renumberWeeks(updatedData, insertPosition);

  return updatedData;
}

function executeRemoveWeek(workoutData: Week[], params: RemoveWeekParams): Week[] {
  const updatedData = deepClone(workoutData);
  const { week } = findByGuid(updatedData, params.weekGuid);

  if (!week) return updatedData;

  const weekIndex = updatedData.indexOf(week);
  updatedData.splice(weekIndex, 1);
  renumberWeeks(updatedData, weekIndex);

  return updatedData;
}

/**
 * Validate create_workout_program params
 */
function validateCreateWorkoutProgram(params: CreateWorkoutProgramParams, _workoutData: Week[]): ValidationResult {
  const errors: string[] = [];

  if (!params.weeks || !Array.isArray(params.weeks)) {
    errors.push('weeks must be provided as an array');
    return { valid: false, errors };
  }

  if (params.weeks.length === 0) {
    errors.push('At least one week must be provided');
  }

  if (params.weeks.length > 4) {
    errors.push('Maximum 4 weeks allowed per program');
  }

  // Validate each week has required structure
  params.weeks.forEach((week, index) => {
    if (!week.sessions || !Array.isArray(week.sessions)) {
      errors.push(`Week ${index + 1} must have a sessions array`);
    } else if (week.sessions.length === 0) {
      errors.push(`Week ${index + 1} must have at least one session`);
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Execute create_workout_program
 * Replaces the entire workout program with new data
 */
function executeCreateWorkoutProgram(_workoutData: Week[], params: CreateWorkoutProgramParams): Week[] {
  const newData = deepClone(params.weeks);

  // Assign proper IDs to all weeks, sessions, and exercises
  renumberWeeks(newData, 0);

  return newData;
}

// ============================================================================
// Tool Registry (reduces switch statement boilerplate)
// ============================================================================

type ToolHandler = {
  validate: (params: any, workoutData: Week[]) => ValidationResult;
  execute: (workoutData: Week[], params: any) => Week[];
};

const toolRegistry: Record<string, ToolHandler> = {
  modify_exercise: { validate: validateModifyExercise, execute: executeModifyExercise },
  add_exercise: { validate: validateAddExercise, execute: executeAddExercise },
  remove_exercise: { validate: validateRemoveExercise, execute: executeRemoveExercise },
  reorder_exercises: { validate: validateReorderExercises, execute: executeReorderExercises },
  modify_session: { validate: validateModifySession, execute: executeModifySession },
  add_session: { validate: validateAddSession, execute: executeAddSession },
  remove_session: { validate: validateRemoveSession, execute: executeRemoveSession },
  copy_session: { validate: validateCopySession, execute: executeCopySession },
  modify_week: { validate: validateModifyWeek, execute: executeModifyWeek },
  add_week: { validate: validateAddWeek, execute: executeAddWeek },
  remove_week: { validate: validateRemoveWeek, execute: executeRemoveWeek },
  create_workout_program: { validate: validateCreateWorkoutProgram, execute: executeCreateWorkoutProgram },
};

// ============================================================================
// Main Execution Function
// ============================================================================

/**
 * Execute all tool calls in sequence
 * Returns updated data only if ALL succeed (atomic operation)
 */
export async function executeToolCalls(
  toolCalls: ToolCall[],
  workoutData: Week[]
): Promise<ToolExecutionResult> {
  // Tool calls now use ephemeral GUIDs for targeting, so order doesn't matter
  // No need for sorting - operations are deterministic and order-independent

  let updatedData = workoutData;
  const executionResults: ExecutionResult[] = [];

  for (const toolCall of toolCalls) {
    try {
      const params = JSON.parse(toolCall.function.arguments);
      const toolName = toolCall.function.name;

      const handler = toolRegistry[toolName];
      if (!handler) {
        console.error('[Executor] Unknown tool:', toolName);
        executionResults.push({
          toolCallId: toolCall.id,
          success: false,
          errors: [`Unknown tool: ${toolName}`],
        });
        break;
      }

      const validation = handler.validate(params, updatedData);

      if (!validation.valid) {
        console.error('[Executor] Validation failed:', validation.errors);
        executionResults.push({
          toolCallId: toolCall.id,
          success: false,
          errors: validation.errors,
        });
        break;
      }

      updatedData = handler.execute(updatedData, params);

      executionResults.push({
        toolCallId: toolCall.id,
        success: true,
      });
    } catch (error) {
      console.error('[Executor] Exception during execution:', error);
      executionResults.push({
        toolCallId: toolCall.id,
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      });
      break;
    }
  }

  const allSucceeded = executionResults.every(r => r.success);

  return {
    success: allSucceeded,
    data: allSucceeded ? updatedData : workoutData,
    results: executionResults,
  };
}
