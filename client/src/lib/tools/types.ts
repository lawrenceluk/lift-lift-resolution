/**
 * Tool Parameter Types for Workout Program Modifications
 *
 * These types define the parameters for each tool that the AI coach can use
 * to modify workout programs. All tools follow a confirm-before-execute pattern.
 */

import type { Exercise, WorkoutSession, Week, CardioBlock } from '@/types/workout';

// ============================================================================
// Exercise Tools
// ============================================================================

/**
 * Parameters for modifying an existing exercise
 */
export interface ModifyExerciseParams {
  weekNumber: number;
  sessionNumber: number;
  exerciseNumber: number;
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
 */
export interface RemoveExerciseParams {
  weekNumber: number;
  sessionNumber: number;
  exerciseNumber: number;
}

/**
 * Parameters for adding a new exercise to a session
 */
export interface AddExerciseParams {
  weekNumber: number;
  sessionNumber: number;
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
 */
export interface ReorderExercisesParams {
  weekNumber: number;
  sessionNumber: number;
  exerciseNumber: number;
  newPosition: number;
}

// ============================================================================
// Session Tools
// ============================================================================

/**
 * Parameters for modifying session-level properties
 */
export interface ModifySessionParams {
  weekNumber: number;
  sessionNumber: number;
  updates: {
    name?: string;
    scheduledDate?: string;
    dayOfWeek?: string;
    warmup?: string[];
    cardio?: CardioBlock | null;
    notes?: string;
  };
}

/**
 * Parameters for removing an entire session from a week
 */
export interface RemoveSessionParams {
  weekNumber: number;
  sessionNumber: number;
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
  cardio?: CardioBlock;
  notes?: string;
}

/**
 * Parameters for adding a new session to a week
 */
export interface AddSessionParams {
  weekNumber: number;
  position: number | 'end';
  session: NewSessionData;
}

/**
 * Parameters for copying a session within or between weeks
 */
export interface CopySessionParams {
  sourceWeekNumber: number;
  sourceSessionNumber: number;
  targetWeekNumber: number;
  position: number | 'end';
}

// ============================================================================
// Week Tools
// ============================================================================

/**
 * Parameters for modifying week-level properties
 */
export interface ModifyWeekParams {
  weekNumber: number;
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
 */
export interface RemoveWeekParams {
  weekNumber: number;
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
  | RemoveWeekParams;

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
  | 'remove_week';
