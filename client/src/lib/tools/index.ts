/**
 * Workout Program Modification Tools
 *
 * This module provides the tool definitions and types for AI-powered
 * workout program modifications. All tools follow a confirm-before-execute
 * pattern where modifications require explicit user approval.
 *
 * @see project-docs/tool-system-spec.md for complete specification
 */

// Export all types
export * from './types';

// Export all schemas
export * from './schemas';

// Re-export commonly used items for convenience
export { allToolSchemas, toolSchemasByName } from './schemas';
export type {
  ToolName,
  ToolParams,
  ModifyExerciseParams,
  AddExerciseParams,
  RemoveExerciseParams,
  ModifySessionParams,
  AddSessionParams,
  RemoveSessionParams,
} from './types';
