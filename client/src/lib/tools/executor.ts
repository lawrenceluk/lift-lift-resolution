/**
 * Tool Execution Functions
 *
 * Validates and executes tool calls to modify workout programs.
 * Follows atomic, all-or-nothing execution with proper error handling.
 */

import type { Week, Exercise, WorkoutSession } from '@/types/workout';
import type { ToolCall } from '@/types/chat';
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
 * Find and validate week/session/exercise hierarchy
 * Returns found items or errors
 */
function findWorkoutHierarchy(
  workoutData: Week[],
  weekNumber: number,
  sessionNumber?: number,
  exerciseNumber?: number
): { week?: Week; session?: WorkoutSession; exercise?: Exercise; errors: string[] } {
  const errors: string[] = [];

  const week = workoutData.find(w => w.weekNumber === weekNumber);
  if (!week) {
    errors.push(`Week ${weekNumber} does not exist`);
    return { errors };
  }

  if (sessionNumber === undefined) {
    return { week, errors };
  }

  const session = week.sessions[sessionNumber - 1];
  if (!session) {
    errors.push(`Session ${sessionNumber} does not exist in Week ${weekNumber}`);
    return { week, errors };
  }

  if (exerciseNumber === undefined) {
    return { week, session, errors };
  }

  const exercise = session.exercises[exerciseNumber - 1];
  if (!exercise) {
    errors.push(`Exercise ${exerciseNumber} does not exist in Session ${sessionNumber}`);
    return { week, session, errors };
  }

  return { week, session, exercise, errors };
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
  const { errors } = findWorkoutHierarchy(workoutData, params.weekNumber, params.sessionNumber, params.exerciseNumber);
  if (errors.length > 0) return { valid: false, errors };

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
  const { session, errors } = findWorkoutHierarchy(workoutData, params.weekNumber, params.sessionNumber);
  if (errors.length > 0) return { valid: false, errors };

  if (!params.exercise.name) errors.push('Exercise name is required');
  if (!params.exercise.reps) errors.push('Exercise reps is required');
  if (!params.exercise.targetLoad) errors.push('Exercise targetLoad is required');
  if (params.exercise.workingSets === undefined) errors.push('Exercise workingSets is required');

  const maxPosition = session!.exercises.length + 1;
  if (params.position !== 'end' && (params.position < 1 || params.position > maxPosition)) {
    errors.push(`Invalid position ${params.position}. Must be 1-${maxPosition} or "end"`);
  }

  return { valid: errors.length === 0, errors };
}

function validateRemoveExercise(params: RemoveExerciseParams, workoutData: Week[]): ValidationResult {
  const { errors } = findWorkoutHierarchy(workoutData, params.weekNumber, params.sessionNumber, params.exerciseNumber);
  return { valid: errors.length === 0, errors };
}

function validateReorderExercises(params: ReorderExercisesParams, workoutData: Week[]): ValidationResult {
  const { session, errors } = findWorkoutHierarchy(workoutData, params.weekNumber, params.sessionNumber);
  if (errors.length > 0) return { valid: false, errors };

  if (!session!.exercises[params.exerciseNumber - 1]) {
    errors.push(`Exercise ${params.exerciseNumber} does not exist`);
  }

  const maxPosition = session!.exercises.length;
  if (params.newPosition < 1 || params.newPosition > maxPosition) {
    errors.push(`Invalid position ${params.newPosition}. Must be 1-${maxPosition}`);
  }

  return { valid: errors.length === 0, errors };
}

function validateModifySession(params: ModifySessionParams, workoutData: Week[]): ValidationResult {
  const { errors } = findWorkoutHierarchy(workoutData, params.weekNumber, params.sessionNumber);
  if (errors.length > 0) return { valid: false, errors };

  if (Object.keys(params.updates).length === 0) {
    errors.push('No updates provided');
  }

  return { valid: errors.length === 0, errors };
}

function validateAddSession(params: AddSessionParams, workoutData: Week[]): ValidationResult {
  const { week, errors } = findWorkoutHierarchy(workoutData, params.weekNumber);
  if (errors.length > 0) return { valid: false, errors };

  if (!params.session.name) errors.push('Session name is required');

  const maxPosition = week!.sessions.length + 1;
  if (params.position !== 'end' && (params.position < 1 || params.position > maxPosition)) {
    errors.push(`Invalid position ${params.position}. Must be 1-${maxPosition} or "end"`);
  }

  return { valid: errors.length === 0, errors };
}

function validateRemoveSession(params: RemoveSessionParams, workoutData: Week[]): ValidationResult {
  const { errors } = findWorkoutHierarchy(workoutData, params.weekNumber, params.sessionNumber);
  return { valid: errors.length === 0, errors };
}

function validateCopySession(params: CopySessionParams, workoutData: Week[]): ValidationResult {
  const sourceResult = findWorkoutHierarchy(workoutData, params.sourceWeekNumber, params.sourceSessionNumber);
  if (sourceResult.errors.length > 0) {
    return { valid: false, errors: sourceResult.errors.map(e => `Source: ${e}`) };
  }

  const targetResult = findWorkoutHierarchy(workoutData, params.targetWeekNumber);
  if (targetResult.errors.length > 0) {
    return { valid: false, errors: targetResult.errors.map(e => `Target: ${e}`) };
  }

  const maxPosition = targetResult.week!.sessions.length + 1;
  if (params.position !== 'end' && (params.position < 1 || params.position > maxPosition)) {
    return { valid: false, errors: [`Invalid position ${params.position}. Must be 1-${maxPosition} or "end"`] };
  }

  return { valid: true, errors: [] };
}

function validateModifyWeek(params: ModifyWeekParams, workoutData: Week[]): ValidationResult {
  const { errors } = findWorkoutHierarchy(workoutData, params.weekNumber);
  if (errors.length > 0) return { valid: false, errors };

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
  const { errors } = findWorkoutHierarchy(workoutData, params.weekNumber);
  return { valid: errors.length === 0, errors };
}

// ============================================================================
// Execution Functions
// ============================================================================

function executeModifyExercise(workoutData: Week[], params: ModifyExerciseParams): Week[] {
  const updatedData = deepClone(workoutData);
  const { exercise } = findWorkoutHierarchy(updatedData, params.weekNumber, params.sessionNumber, params.exerciseNumber);
  Object.assign(exercise!, params.updates);
  return updatedData;
}

function executeAddExercise(workoutData: Week[], params: AddExerciseParams): Week[] {
  const updatedData = deepClone(workoutData);
  const { session } = findWorkoutHierarchy(updatedData, params.weekNumber, params.sessionNumber);

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
  renumberExercises(session!, params.weekNumber, params.sessionNumber, insertPosition);

  return updatedData;
}

function executeRemoveExercise(workoutData: Week[], params: RemoveExerciseParams): Week[] {
  const updatedData = deepClone(workoutData);
  const { session } = findWorkoutHierarchy(updatedData, params.weekNumber, params.sessionNumber);

  const removeIndex = params.exerciseNumber - 1;
  session!.exercises.splice(removeIndex, 1);
  renumberExercises(session!, params.weekNumber, params.sessionNumber, removeIndex);

  return updatedData;
}

function executeReorderExercises(workoutData: Week[], params: ReorderExercisesParams): Week[] {
  const updatedData = deepClone(workoutData);
  const { session } = findWorkoutHierarchy(updatedData, params.weekNumber, params.sessionNumber);

  const oldIndex = params.exerciseNumber - 1;
  const newIndex = params.newPosition - 1;

  const [exercise] = session!.exercises.splice(oldIndex, 1);
  session!.exercises.splice(newIndex, 0, exercise);
  renumberExercises(session!, params.weekNumber, params.sessionNumber);

  return updatedData;
}

function executeModifySession(workoutData: Week[], params: ModifySessionParams): Week[] {
  const updatedData = deepClone(workoutData);
  const { session } = findWorkoutHierarchy(updatedData, params.weekNumber, params.sessionNumber);
  Object.assign(session!, params.updates);
  return updatedData;
}

function executeAddSession(workoutData: Week[], params: AddSessionParams): Week[] {
  const updatedData = deepClone(workoutData);
  const { week } = findWorkoutHierarchy(updatedData, params.weekNumber);

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
    cardio: params.session.cardio,
    notes: params.session.notes,
    completed: false,
  };

  week!.sessions.splice(insertPosition, 0, newSession);
  renumberSessions(week!, insertPosition);

  return updatedData;
}

function executeRemoveSession(workoutData: Week[], params: RemoveSessionParams): Week[] {
  const updatedData = deepClone(workoutData);
  const { week } = findWorkoutHierarchy(updatedData, params.weekNumber);

  const removeIndex = params.sessionNumber - 1;
  week!.sessions.splice(removeIndex, 1);
  renumberSessions(week!, removeIndex);

  return updatedData;
}

function executeCopySession(workoutData: Week[], params: CopySessionParams): Week[] {
  const updatedData = deepClone(workoutData);
  const sourceResult = findWorkoutHierarchy(updatedData, params.sourceWeekNumber, params.sourceSessionNumber);
  const targetResult = findWorkoutHierarchy(updatedData, params.targetWeekNumber);

  const insertPosition = params.position === 'end' ? targetResult.week!.sessions.length : params.position - 1;

  const newSession: WorkoutSession = deepClone(sourceResult.session!);
  newSession.completed = false;
  newSession.startedAt = undefined;
  newSession.completedDate = undefined;
  newSession.exercises.forEach(ex => {
    ex.sets = [];
    ex.skipped = false;
  });

  targetResult.week!.sessions.splice(insertPosition, 0, newSession);
  renumberSessions(targetResult.week!, insertPosition);

  return updatedData;
}

function executeModifyWeek(workoutData: Week[], params: ModifyWeekParams): Week[] {
  const updatedData = deepClone(workoutData);
  const { week } = findWorkoutHierarchy(updatedData, params.weekNumber);
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
      cardio: sessData.cardio,
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
  const weekIndex = updatedData.findIndex(w => w.weekNumber === params.weekNumber);

  if (weekIndex === -1) return updatedData;

  updatedData.splice(weekIndex, 1);
  renumberWeeks(updatedData, weekIndex);

  return updatedData;
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
