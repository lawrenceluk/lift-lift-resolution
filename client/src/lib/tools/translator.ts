/**
 * Tool Call Translation Layer
 *
 * Converts index-based tool calls to GUID-based tool calls for deterministic execution.
 * Creates ephemeral GUIDs at execution time, translates parameters, executes operations,
 * then strips GUIDs before returning results.
 */

import type { ToolCall } from '@/types/chat';
import type { Week } from '@/types/workout';
import { addEphemeralGUIDs } from '@/utils/guidHelpers';

/**
 * Translation result containing GUID-enhanced snapshot and translated tool calls
 */
export interface TranslationResult {
  snapshot: Week[]; // Deep clone with ephemeral GUIDs added
  translatedCalls: ToolCall[]; // Tool calls with GUID-based parameters
}

/**
 * Translate index-based tool calls to GUID-based tool calls
 *
 * Process:
 * 1. Deep clone workout data to create isolated snapshot
 * 2. Add ephemeral GUIDs to all items in snapshot
 * 3. Convert each tool call's parameters from index-based to GUID-based
 * 4. Return snapshot + translated calls for execution
 *
 * @param toolCalls - Original index-based tool calls from LLM
 * @param weeks - Current workout program state
 * @returns Snapshot with GUIDs + translated GUID-based tool calls
 * @throws Error if translation fails (item not found, invalid parameters)
 */
export function translateToGUIDs(toolCalls: ToolCall[], weeks: Week[]): TranslationResult {
  // 1. Deep clone to create isolated snapshot
  const snapshot = JSON.parse(JSON.stringify(weeks)) as Week[];

  // 2. Add ephemeral GUIDs to all items
  addEphemeralGUIDs(snapshot);

  // 3. Translate each tool call
  const translatedCalls = toolCalls.map(toolCall => {
    const params = JSON.parse(toolCall.function.arguments);
    const toolName = toolCall.function.name;

    // Convert parameters to GUID-based
    const guidParams = convertParamsToGUIDs(toolName, params, snapshot);

    return {
      ...toolCall,
      function: {
        ...toolCall.function,
        arguments: JSON.stringify(guidParams),
      },
    };
  });

  return { snapshot, translatedCalls };
}

/**
 * Convert tool parameters from index-based to GUID-based
 *
 * @param toolName - Name of the tool (e.g., "modify_exercise")
 * @param params - Original index-based parameters
 * @param snapshot - Workout snapshot with GUIDs
 * @returns GUID-based parameters
 * @throws Error if item not found at specified indices
 */
function convertParamsToGUIDs(toolName: string, params: any, snapshot: Week[]): any {
  switch (toolName) {
    // ========================================================================
    // EXERCISE OPERATIONS
    // ========================================================================

    case 'modify_exercise':
    case 'remove_exercise': {
      const exercise = findExerciseByIndices(
        snapshot,
        params.weekNumber,
        params.sessionNumber,
        params.exerciseNumber
      );

      if (!exercise) {
        throw new Error(
          `Exercise not found at Week ${params.weekNumber}, Session ${params.sessionNumber}, Exercise ${params.exerciseNumber}`
        );
      }

      return {
        exerciseGuid: exercise.guid,
        ...(params.updates ? { updates: params.updates } : {}),
      };
    }

    case 'add_exercise': {
      // For add operations, we need the parent session's GUID for scope
      const session = findSessionByIndices(
        snapshot,
        params.weekNumber,
        params.sessionNumber
      );

      if (!session) {
        throw new Error(
          `Session not found at Week ${params.weekNumber}, Session ${params.sessionNumber}`
        );
      }

      return {
        sessionGuid: session.guid,
        position: params.position, // Keep position (where to insert)
        exercise: params.exercise,
      };
    }

    case 'reorder_exercises': {
      // Find the exercise to reorder
      const exercise = findExerciseByIndices(
        snapshot,
        params.weekNumber,
        params.sessionNumber,
        params.exerciseNumber
      );

      if (!exercise) {
        throw new Error(
          `Exercise not found at Week ${params.weekNumber}, Session ${params.sessionNumber}, Exercise ${params.exerciseNumber}`
        );
      }

      return {
        exerciseGuid: exercise.guid,
        newPosition: params.newPosition, // Keep new position (where to move it)
      };
    }

    // ========================================================================
    // SESSION OPERATIONS
    // ========================================================================

    case 'modify_session':
    case 'remove_session': {
      const session = findSessionByIndices(
        snapshot,
        params.weekNumber,
        params.sessionNumber
      );

      if (!session) {
        throw new Error(
          `Session not found at Week ${params.weekNumber}, Session ${params.sessionNumber}`
        );
      }

      return {
        sessionGuid: session.guid,
        ...(params.updates ? { updates: params.updates } : {}),
      };
    }

    case 'add_session': {
      // Need parent week's GUID for scope
      const week = findWeekByIndex(snapshot, params.weekNumber);

      if (!week) {
        throw new Error(`Week not found at Week ${params.weekNumber}`);
      }

      return {
        weekGuid: week.guid,
        position: params.position, // Keep position
        session: params.session,
      };
    }

    case 'copy_session': {
      // Find source session and target week
      const sourceSession = findSessionByIndices(
        snapshot,
        params.sourceWeekNumber,
        params.sourceSessionNumber
      );

      const targetWeek = findWeekByIndex(snapshot, params.targetWeekNumber);

      if (!sourceSession) {
        throw new Error(
          `Source session not found at Week ${params.sourceWeekNumber}, Session ${params.sourceSessionNumber}`
        );
      }

      if (!targetWeek) {
        throw new Error(`Target week not found at Week ${params.targetWeekNumber}`);
      }

      return {
        sourceSessionGuid: sourceSession.guid,
        targetWeekGuid: targetWeek.guid,
        position: params.position, // Keep position
      };
    }

    // ========================================================================
    // WEEK OPERATIONS
    // ========================================================================

    case 'modify_week':
    case 'remove_week': {
      const week = findWeekByIndex(snapshot, params.weekNumber);

      if (!week) {
        throw new Error(`Week not found at Week ${params.weekNumber}`);
      }

      return {
        weekGuid: week.guid,
        ...(params.updates ? { updates: params.updates } : {}),
      };
    }

    case 'add_week': {
      // add_week doesn't need a parent GUID, just position
      // Position is relative to the entire program
      return {
        position: params.position,
        weeks: params.weeks,
      };
    }

    // ========================================================================
    // UNKNOWN TOOL
    // ========================================================================

    default:
      // Unknown tool, pass through parameters unchanged
      console.warn(`[Translator] Unknown tool: ${toolName}, passing through parameters`);
      return params;
  }
}

/**
 * Find exercise by hierarchical indices
 */
function findExerciseByIndices(
  weeks: Week[],
  weekNumber: number,
  sessionNumber: number,
  exerciseNumber: number
) {
  const week = weeks.find(w => w.weekNumber === weekNumber);
  if (!week) return null;

  const session = week.sessions[sessionNumber - 1];
  if (!session) return null;

  const exercise = session.exercises[exerciseNumber - 1];
  return exercise || null;
}

/**
 * Find session by hierarchical indices
 */
function findSessionByIndices(
  weeks: Week[],
  weekNumber: number,
  sessionNumber: number
) {
  const week = weeks.find(w => w.weekNumber === weekNumber);
  if (!week) return null;

  const session = week.sessions[sessionNumber - 1];
  return session || null;
}

/**
 * Find week by index
 */
function findWeekByIndex(weeks: Week[], weekNumber: number) {
  return weeks.find(w => w.weekNumber === weekNumber) || null;
}
