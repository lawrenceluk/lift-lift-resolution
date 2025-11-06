/**
 * Tool Parameter Types for Workout Program Modifications
 *
 * These types define the parameters for each tool that the AI coach can use
 * to modify workout programs. All tools follow a confirm-before-execute pattern.
 */

import type { Exercise, WorkoutSession, Week } from '@/types/workout';

// ============================================================================
// Exercise Tools
// ============================================================================

/**
 * Parameters for modifying an existing exercise
 * Uses GUID for deterministic targeting
 */
export interface ModifyExerciseParams {
  exerciseGuid: string;
  updates: {
    name?: string;
    reps?: string;
    targetLoad?: string;
    workingSets?: number;
    warmupSets?: number;
    restSeconds?: number;
    notes?: string;
    groupLabel?: string;
    skipped?: boolean;
  };
}

/**
 * Parameters for removing an exercise from a session
 * Uses GUID for deterministic targeting
 */
export interface RemoveExerciseParams {
  exerciseGuid: string;
}

/**
 * Parameters for adding a new exercise to a session
 * Uses session GUID for scope, position for insertion point
 */
export interface AddExerciseParams {
  sessionGuid: string;
  position: number | 'end';
  exercise: {
    name: string;
    reps: string;
    targetLoad: string;
    workingSets: number;
    warmupSets?: number;
    restSeconds?: number;
    notes?: string;
    groupLabel?: string;
  };
}

/**
 * Parameters for reordering exercises within a session
 * Uses exercise GUID for targeting, position for destination
 */
export interface ReorderExercisesParams {
  exerciseGuid: string;
  newPosition: number;
}

// ============================================================================
// Session Tools
// ============================================================================

/**
 * Parameters for modifying session-level properties
 * Uses GUID for deterministic targeting
 */
export interface ModifySessionParams {
  sessionGuid: string;
  updates: {
    name?: string;
    scheduledDate?: string;
    dayOfWeek?: string;
    warmup?: string[];
    notes?: string;
  };
}

/**
 * Parameters for removing an entire session from a week
 * Uses GUID for deterministic targeting
 */
export interface RemoveSessionParams {
  sessionGuid: string;
}

/**
 * Session data for adding a new session (without ID fields)
 */
export interface NewSessionData {
  name: string;
  exercises?: Omit<Exercise, 'id' | 'sets' | 'skipped'>[];
  scheduledDate?: string;
  dayOfWeek?: string;
  warmup?: string[];
  notes?: string;
}

/**
 * Parameters for adding a new session to a week
 * Uses week GUID for scope, position for insertion point
 */
export interface AddSessionParams {
  weekGuid: string;
  position: number | 'end';
  session: NewSessionData;
}

/**
 * Parameters for copying a session within or between weeks
 * Uses GUIDs for source and target, position for insertion point
 */
export interface CopySessionParams {
  sourceSessionGuid: string;
  targetWeekGuid: string;
  position: number | 'end';
}

// ============================================================================
// Week Tools
// ============================================================================

/**
 * Parameters for modifying week-level properties
 * Uses GUID for deterministic targeting
 */
export interface ModifyWeekParams {
  weekGuid: string;
  updates: {
    phase?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  };
}

/**
 * Week data for adding new weeks (without ID field)
 */
export interface NewWeekData {
  weekNumber: number;
  phase: string;
  startDate: string;
  endDate: string;
  description?: string;
  sessions: NewSessionData[];
}

/**
 * Parameters for adding one or more weeks to the program
 */
export interface AddWeekParams {
  position: number | 'end';
  weeks: NewWeekData[];
}

/**
 * Parameters for removing a week from the program
 * Uses GUID for deterministic targeting
 */
export interface RemoveWeekParams {
  weekGuid: string;
}

// ============================================================================
// Program Tools
// ============================================================================

/**
 * Parameters for creating a complete workout program
 * Replaces the entire program with new data
 */
export interface CreateWorkoutProgramParams {
  weeks: Week[];
  name?: string | null;
}

// ============================================================================
// Union Types
// ============================================================================

/**
 * All possible tool parameter types
 */
export type ToolParams =
  | ModifyExerciseParams
  | RemoveExerciseParams
  | AddExerciseParams
  | ReorderExercisesParams
  | ModifySessionParams
  | RemoveSessionParams
  | AddSessionParams
  | CopySessionParams
  | ModifyWeekParams
  | AddWeekParams
  | RemoveWeekParams
  | CreateWorkoutProgramParams;

/**
 * Tool names
 */
export type ToolName =
  | 'modify_exercise'
  | 'remove_exercise'
  | 'add_exercise'
  | 'reorder_exercises'
  | 'modify_session'
  | 'remove_session'
  | 'add_session'
  | 'copy_session'
  | 'modify_week'
  | 'add_week'
  | 'remove_week'
  | 'create_workout_program';
