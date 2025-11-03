/**
 * Tool Schema Definitions for OpenRouter/Anthropic API
 * Ultra-compressed for minimal token usage
 * See system prompt for global conventions (1-based indexing, position format, etc.)
 */

export type ToolCategory = 'read' | 'write' | 'ui';

export interface ToolSchema {
  name: string;
  description: string;
  category: ToolCategory;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

// ============================================================================
// Exercise Tools
// ============================================================================

export const modifyExerciseSchema: ToolSchema = {
  name: 'modify_exercise',
  description: 'Modify exercise properties',
  category: 'write',
  input_schema: {
    type: 'object',
    properties: {
      weekNumber: { type: 'number' },
      sessionNumber: { type: 'number' },
      exerciseNumber: { type: 'number' },
      updates: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          reps: { type: 'string' },
          targetLoad: { type: 'string' },
          workingSets: { type: 'number' },
          warmupSets: { type: 'number' },
          restSeconds: { type: 'number' },
          notes: { type: 'string' },
          groupLabel: { type: 'string', description: 'Superset label' },
          skipped: { type: 'boolean' },
        },
      },
    },
    required: ['weekNumber', 'sessionNumber', 'exerciseNumber', 'updates'],
  },
};

export const addExerciseSchema: ToolSchema = {
  name: 'add_exercise',
  description: 'Add exercise to session',
  category: 'write',
  input_schema: {
    type: 'object',
    properties: {
      weekNumber: { type: 'number' },
      sessionNumber: { type: 'number' },
      position: { type: ['number', 'string'] },
      exercise: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          reps: { type: 'string' },
          targetLoad: { type: 'string' },
          workingSets: { type: 'number' },
          warmupSets: { type: 'number' },
          restSeconds: { type: 'number' },
          notes: { type: 'string' },
          groupLabel: { type: 'string' },
        },
        required: ['name', 'reps', 'targetLoad', 'workingSets'],
      },
    },
    required: ['weekNumber', 'sessionNumber', 'position', 'exercise'],
  },
};

export const removeExerciseSchema: ToolSchema = {
  name: 'remove_exercise',
  description: 'Remove exercise from session',
  category: 'write',
  input_schema: {
    type: 'object',
    properties: {
      weekNumber: { type: 'number' },
      sessionNumber: { type: 'number' },
      exerciseNumber: { type: 'number' },
    },
    required: ['weekNumber', 'sessionNumber', 'exerciseNumber'],
  },
};

export const reorderExercisesSchema: ToolSchema = {
  name: 'reorder_exercises',
  description: 'Move exercise to new position',
  category: 'write',
  input_schema: {
    type: 'object',
    properties: {
      weekNumber: { type: 'number' },
      sessionNumber: { type: 'number' },
      exerciseNumber: { type: 'number' },
      newPosition: { type: 'number' },
    },
    required: ['weekNumber', 'sessionNumber', 'exerciseNumber', 'newPosition'],
  },
};

// ============================================================================
// Session Tools
// ============================================================================

export const modifySessionSchema: ToolSchema = {
  name: 'modify_session',
  description: 'Modify session properties',
  category: 'write',
  input_schema: {
    type: 'object',
    properties: {
      weekNumber: { type: 'number' },
      sessionNumber: { type: 'number' },
      updates: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          scheduledDate: { type: 'string' },
          dayOfWeek: { type: 'string' },
          notes: { type: 'string' },
        },
      },
    },
    required: ['weekNumber', 'sessionNumber', 'updates'],
  },
};

export const addSessionSchema: ToolSchema = {
  name: 'add_session',
  description: 'Add session to week',
  category: 'write',
  input_schema: {
    type: 'object',
    properties: {
      weekNumber: { type: 'number' },
      position: { type: ['number', 'string'] },
      session: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          scheduledDate: { type: 'string' },
          dayOfWeek: { type: 'string' },
          exercises: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                reps: { type: 'string' },
                targetLoad: { type: 'string' },
                workingSets: { type: 'number' },
                warmupSets: { type: 'number' },
                restSeconds: { type: 'number' },
                notes: { type: 'string' },
                groupLabel: { type: 'string' },
              },
              required: ['name', 'reps', 'targetLoad', 'workingSets'],
            },
          },
          notes: { type: 'string' },
        },
        required: ['name'],
      },
    },
    required: ['weekNumber', 'position', 'session'],
  },
};

export const removeSessionSchema: ToolSchema = {
  name: 'remove_session',
  description: 'Remove session from week',
  category: 'write',
  input_schema: {
    type: 'object',
    properties: {
      weekNumber: { type: 'number' },
      sessionNumber: { type: 'number' },
    },
    required: ['weekNumber', 'sessionNumber'],
  },
};

export const copySessionSchema: ToolSchema = {
  name: 'copy_session',
  description: 'Copy session to another week',
  category: 'write',
  input_schema: {
    type: 'object',
    properties: {
      sourceWeekNumber: { type: 'number' },
      sourceSessionNumber: { type: 'number' },
      targetWeekNumber: { type: 'number' },
      position: { type: ['number', 'string'] },
    },
    required: ['sourceWeekNumber', 'sourceSessionNumber', 'targetWeekNumber', 'position'],
  },
};

// ============================================================================
// Week Tools
// ============================================================================

export const modifyWeekSchema: ToolSchema = {
  name: 'modify_week',
  description: 'Modify week properties',
  category: 'write',
  input_schema: {
    type: 'object',
    properties: {
      weekNumber: { type: 'number' },
      updates: {
        type: 'object',
        properties: {
          phase: { type: 'string', description: 'Training phase name' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          description: { type: 'string' },
        },
      },
    },
    required: ['weekNumber', 'updates'],
  },
};

export const addWeekSchema: ToolSchema = {
  name: 'add_week',
  description: 'Add weeks to program',
  category: 'write',
  input_schema: {
    type: 'object',
    properties: {
      position: { type: ['number', 'string'] },
      weeks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            phase: { type: 'string' },
            startDate: { type: 'string' },
            endDate: { type: 'string' },
            description: { type: 'string' },
            sessions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  scheduledDate: { type: 'string' },
                  dayOfWeek: { type: 'string' },
                  exercises: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        reps: { type: 'string' },
                        targetLoad: { type: 'string' },
                        workingSets: { type: 'number' },
                        warmupSets: { type: 'number' },
                        restSeconds: { type: 'number' },
                        notes: { type: 'string' },
                        groupLabel: { type: 'string' },
                      },
                      required: ['name', 'reps', 'targetLoad', 'workingSets'],
                    },
                  },
                  notes: { type: 'string' },
                },
                required: ['name'],
              },
            },
          },
        },
      },
    },
    required: ['position', 'weeks'],
  },
};

export const removeWeekSchema: ToolSchema = {
  name: 'remove_week',
  description: 'Remove week from program',
  category: 'write',
  input_schema: {
    type: 'object',
    properties: {
      weekNumber: { type: 'number' },
    },
    required: ['weekNumber'],
  },
};

// ============================================================================
// Read Tools
// ============================================================================

export const getWorkoutDataSchema: ToolSchema = {
  name: 'get_workout_data',
  description: 'Fetch detailed workout data to answer questions about progress, volume, or history across weeks',
  category: 'read',
  input_schema: {
    type: 'object',
    properties: {
      scope: {
        type: 'string',
        enum: ['full_program', 'specific_week', 'specific_session'],
        description: 'Scope of data to fetch: full_program (all weeks), specific_week (one week), or specific_session (one session)',
      },
      weekNumber: {
        type: 'number',
        description: 'Week number (required for specific_week or specific_session scope)',
      },
      sessionNumber: {
        type: 'number',
        description: 'Session number within week (required for specific_session scope)',
      },
      includeSetData: {
        type: 'boolean',
        description: 'Include detailed set-by-set data (default: true)',
      },
    },
    required: ['scope'],
  },
};

export const getCurrentWeekDetailSchema: ToolSchema = {
  name: 'get_current_week_detail',
  description: 'Fetch detailed set-by-set data for ALL sessions in the current week only. More efficient than full_program when questions are week-specific.',
  category: 'read',
  input_schema: {
    type: 'object',
    properties: {
      includeSetData: {
        type: 'boolean',
        description: 'Include detailed set-by-set data (default: true)',
      },
    },
    required: [],
  },
};

// ============================================================================
// UI Tools
// ============================================================================

export const suggestRepliesSchema: ToolSchema = {
  name: 'suggest_replies',
  description: 'Suggest quick reply options for the user',
  category: 'ui',
  input_schema: {
    type: 'object',
    properties: {
      replies: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of 1-3 short suggested replies (2-5 words each)',
        minItems: 1,
        maxItems: 3,
      },
    },
    required: ['replies'],
  },
};

// ============================================================================
// Export all schemas
// ============================================================================

export const allToolSchemas: ToolSchema[] = [
  modifyExerciseSchema,
  addExerciseSchema,
  removeExerciseSchema,
  reorderExercisesSchema,
  modifySessionSchema,
  addSessionSchema,
  removeSessionSchema,
  copySessionSchema,
  modifyWeekSchema,
  addWeekSchema,
  removeWeekSchema,
  getWorkoutDataSchema,
  getCurrentWeekDetailSchema,
  suggestRepliesSchema,
];

export const toolSchemasByName: Record<string, ToolSchema> = {
  modify_exercise: modifyExerciseSchema,
  add_exercise: addExerciseSchema,
  remove_exercise: removeExerciseSchema,
  reorder_exercises: reorderExercisesSchema,
  modify_session: modifySessionSchema,
  add_session: addSessionSchema,
  remove_session: removeSessionSchema,
  copy_session: copySessionSchema,
  modify_week: modifyWeekSchema,
  add_week: addWeekSchema,
  remove_week: removeWeekSchema,
  get_workout_data: getWorkoutDataSchema,
  get_current_week_detail: getCurrentWeekDetailSchema,
  suggest_replies: suggestRepliesSchema,
};
