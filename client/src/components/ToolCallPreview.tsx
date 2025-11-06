import { Badge } from './ui/badge';
import type { ToolCall, ToolCallSnapshot } from '@/types/chat';
import type { Week } from '@/types/workout';

interface ToolCallPreviewProps {
  toolCalls: ToolCall[];
  workoutData: Week[];
  executionSnapshot?: ToolCallSnapshot[]; // If provided, use this instead of building from workoutData
}

interface PreviewChange {
  field: string;
  before?: string;
  after: string;
}

interface PreviewResult {
  title: string;
  changes: PreviewChange[];
}

/**
 * Preview component showing what modifications will be made
 * Displays tool calls in a human-readable format before execution
 * If executionSnapshot is provided, shows the historical snapshot instead of rebuilding from current state
 */
export function ToolCallPreview({ toolCalls, workoutData, executionSnapshot }: ToolCallPreviewProps) {
  if (!toolCalls || toolCalls.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 border border-blue-200 rounded-lg bg-blue-50 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="bg-blue-100 text-blue-900 border-blue-300">
          {executionSnapshot ? 'Applied Changes' : 'Proposed Changes'}
        </Badge>
        {/* <span className="text-xs text-gray-600">
          {toolCalls.length} modification{toolCalls.length !== 1 ? 's' : ''}
        </span> */}
      </div>

      <div className="space-y-2">
        {toolCalls.map((toolCall, index) => {
          // If we have an execution snapshot, use it; otherwise build from current state
          const preview = executionSnapshot?.find(s => s.toolCallId === toolCall.id)
            || buildToolCallPreview(toolCall, workoutData);

          return (
            <div key={toolCall.id || index} className="bg-white rounded p-2 text-sm">
              <div className="font-medium text-gray-900 mb-1">
                {preview.title}
              </div>
              {preview.changes.map((change, i) => (
                <div key={i} className="text-gray-700 ml-2">
                  {('before' in change) && change.before && (
                    <div className="text-gray-500 line-through text-xs">
                      {change.field}: {String(change.before)}
                    </div>
                  )}
                  <div className="text-blue-700 text-xs">
                    {change.field}: {String(change.after)}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Build human-readable preview from tool call
 * Exported so it can be used to capture execution snapshots
 */
export function buildToolCallPreview(toolCall: ToolCall, workoutData: Week[]): PreviewResult {
  try {
    const params = JSON.parse(toolCall.function.arguments);
    const toolName = toolCall.function.name;

    switch (toolName) {
      case 'modify_exercise':
        return buildModifyExercisePreview(params, workoutData);

      case 'add_exercise':
        return buildAddExercisePreview(params, workoutData);

      case 'remove_exercise':
        return buildRemoveExercisePreview(params, workoutData);

      case 'reorder_exercises':
        return buildReorderExercisesPreview(params, workoutData);

      case 'modify_session':
        return buildModifySessionPreview(params, workoutData);

      case 'add_session':
        return buildAddSessionPreview(params, workoutData);

      case 'remove_session':
        return buildRemoveSessionPreview(params, workoutData);

      case 'copy_session':
        return buildCopySessionPreview(params, workoutData);

      case 'modify_week':
        return buildModifyWeekPreview(params, workoutData);

      case 'add_week':
        return buildAddWeekPreview(params, workoutData);

      case 'remove_week':
        return buildRemoveWeekPreview(params, workoutData);

      case 'create_workout_program':
        return buildCreateWorkoutProgramPreview(params, workoutData);

      default:
        return {
          title: toolName,
          changes: [{ field: 'Action', after: 'Modify workout' }]
        };
    }
  } catch (e) {
    return {
      title: 'Workout Modification',
      changes: [{ field: 'Error', after: 'Could not parse changes' }]
    };
  }
}

function buildModifyExercisePreview(params: any, workoutData: Week[]): PreviewResult {
  const { weekNumber, sessionNumber, exerciseNumber, updates: rawUpdates } = params;

  // Handle case where updates might be a stringified JSON
  let updates = rawUpdates;
  if (typeof updates === 'string') {
    try {
      updates = JSON.parse(updates);
    } catch {
      updates = {};
    }
  }

  // Find the exercise
  const week = workoutData.find(w => w.weekNumber === weekNumber);
  const session = week?.sessions[sessionNumber - 1];
  const exercise = session?.exercises[exerciseNumber - 1];

  const exerciseName = exercise?.name || `Exercise ${exerciseNumber}`;
  const location = `Week ${weekNumber}, Session ${sessionNumber}, Exercise ${exerciseNumber}`;

  const changes: PreviewChange[] = Object.entries(updates).map(([field, value]) => {
    const before = exercise ? (exercise as any)[field] : undefined;
    return {
      field: formatFieldName(field),
      before: before !== undefined ? String(before) : undefined,
      after: String(value)
    };
  });

  return {
    title: `Modify: ${exerciseName} (${location})`,
    changes
  };
}

function buildAddExercisePreview(params: any, _workoutData: Week[]): PreviewResult {
  const { weekNumber, sessionNumber, position, exercise } = params;
  const location = `Week ${weekNumber}, Session ${sessionNumber}`;
  const positionText = position === 'end' ? 'at end' : `at position ${position}`;

  return {
    title: `Add: ${exercise.name} (${location}, ${positionText})`,
    changes: [
      { field: 'Sets', after: `${exercise.workingSets} working sets` },
      { field: 'Reps', after: exercise.reps },
      { field: 'Load', after: exercise.targetLoad }
    ]
  };
}

function buildRemoveExercisePreview(params: any, workoutData: Week[]): PreviewResult {
  const { weekNumber, sessionNumber, exerciseNumber } = params;

  const week = workoutData.find(w => w.weekNumber === weekNumber);
  const session = week?.sessions[sessionNumber - 1];
  const exercise = session?.exercises[exerciseNumber - 1];
  const exerciseName = exercise?.name || `Exercise ${exerciseNumber}`;

  return {
    title: `Remove: ${exerciseName}`,
    changes: [
      { field: 'From', after: `Week ${weekNumber}, Session ${sessionNumber}` }
    ]
  };
}

function buildModifySessionPreview(params: any, workoutData: Week[]): PreviewResult {
  const { weekNumber, sessionNumber, updates: rawUpdates } = params;

  // Handle case where updates might be a stringified JSON
  let updates = rawUpdates;
  if (typeof updates === 'string') {
    try {
      updates = JSON.parse(updates);
    } catch {
      updates = {};
    }
  }

  const week = workoutData.find(w => w.weekNumber === weekNumber);
  const session = week?.sessions[sessionNumber - 1];

  const changes: PreviewChange[] = Object.entries(updates).map(([field, value]) => {
    const before = session ? (session as any)[field] : undefined;
    return {
      field: formatFieldName(field),
      before: before !== undefined ? String(before) : undefined,
      after: String(value)
    };
  });

  return {
    title: `Modify Session: Week ${weekNumber}, Session ${sessionNumber}`,
    changes
  };
}

function buildAddSessionPreview(params: any, _workoutData: Week[]): PreviewResult {
  const { weekNumber, position, session } = params;
  const positionText = position === 'end' ? 'at end' : `at position ${position}`;

  const changes = [];
  if (session.exercises?.length > 0) {
    changes.push({ field: 'Exercises', after: `${session.exercises?.length || 0} exercises` });
  }

  return {
    title: `Add Session: ${session.name} (Week ${weekNumber}, ${positionText})`,
    changes
  };
}

function buildRemoveSessionPreview(params: any, workoutData: Week[]): PreviewResult {
  const { weekNumber, sessionNumber } = params;

  const week = workoutData.find(w => w.weekNumber === weekNumber);
  const session = week?.sessions[sessionNumber - 1];
  const sessionName = session?.name || `Session ${sessionNumber}`;

  return {
    title: `Remove Session: ${sessionName}`,
    changes: [
      { field: 'From', after: `Week ${weekNumber}` }
    ]
  };
}

function buildReorderExercisesPreview(params: any, workoutData: Week[]): PreviewResult {
  const { weekNumber, sessionNumber, exerciseNumber, newPosition } = params;

  const week = workoutData.find(w => w.weekNumber === weekNumber);
  const session = week?.sessions[sessionNumber - 1];
  const exercise = session?.exercises[exerciseNumber - 1];
  const exerciseName = exercise?.name || `Exercise ${exerciseNumber}`;

  return {
    title: `Reorder: ${exerciseName}`,
    changes: [
      { field: 'Current Position', before: String(exerciseNumber), after: String(newPosition) },
      { field: 'From', after: `Week ${weekNumber}, Session ${sessionNumber}` }
    ]
  };
}

function buildCopySessionPreview(params: any, workoutData: Week[]): PreviewResult {
  const { sourceWeekNumber, sourceSessionNumber, targetWeekNumber, position } = params;

  const sourceWeek = workoutData.find(w => w.weekNumber === sourceWeekNumber);
  const sourceSession = sourceWeek?.sessions[sourceSessionNumber - 1];
  const sessionName = sourceSession?.name || `Session ${sourceSessionNumber}`;
  const positionText = position === 'end' ? 'at end' : `at position ${position}`;

  return {
    title: `Copy Session: ${sessionName}`,
    changes: [
      { field: 'From', after: `Week ${sourceWeekNumber}, Session ${sourceSessionNumber}` },
      { field: 'To', after: `Week ${targetWeekNumber}, ${positionText}` },
      { field: 'Exercises', after: `${sourceSession?.exercises.length || 0} exercises` }
    ]
  };
}

function buildModifyWeekPreview(params: any, workoutData: Week[]): PreviewResult {
  const { weekNumber, updates: rawUpdates } = params;

  // Handle case where updates might be a stringified JSON
  let updates = rawUpdates;
  if (typeof updates === 'string') {
    try {
      updates = JSON.parse(updates);
    } catch {
      updates = {};
    }
  }

  const week = workoutData.find(w => w.weekNumber === weekNumber);

  const changes: PreviewChange[] = Object.entries(updates).map(([field, value]) => {
    const before = week ? (week as any)[field] : undefined;
    return {
      field: formatFieldName(field),
      before: before !== undefined ? String(before) : undefined,
      after: String(value)
    };
  });

  return {
    title: `Modify Week ${weekNumber}`,
    changes
  };
}

function buildAddWeekPreview(params: any, _workoutData: Week[]): PreviewResult {
  const { position, weeks } = params;
  const positionText = position === 'end' ? 'at end' : `at position ${position}`;
  const weekCount = weeks.length;

  return {
    title: `Add ${weekCount} Week${weekCount !== 1 ? 's' : ''} (${positionText})`,
    changes: weeks.map((week: any, index: number) => ({
      field: `Week ${index + 1}`,
      after: `${week.phase || 'Training'}: ${week.sessions?.length || 0} sessions`
    }))
  };
}

function buildRemoveWeekPreview(params: any, workoutData: Week[]): PreviewResult {
  const { weekNumber } = params;

  const week = workoutData.find(w => w.weekNumber === weekNumber);
  const weekPhase = week?.phase || '';

  return {
    title: `Remove Week ${weekNumber}`,
    changes: [
      { field: 'Phase', after: weekPhase },
      { field: 'Sessions', after: `${week?.sessions.length || 0} sessions will be removed` }
    ]
  };
}

function buildCreateWorkoutProgramPreview(params: any, _workoutData: Week[]): PreviewResult {
  const { weeks, name } = params;

  const totalWeeks = weeks?.length || 0;
  const totalSessions = weeks?.reduce((sum: number, week: Week) => sum + (week.sessions?.length || 0), 0) || 0;
  const totalExercises = weeks?.reduce((sum: number, week: Week) =>
    sum + week.sessions?.reduce((sessionSum: number, session: any) =>
      sessionSum + (session.exercises?.length || 0), 0), 0) || 0;

  const changes: PreviewChange[] = [
    { field: 'Program Name', after: name || 'New Program' },
    { field: 'Weeks', after: `${totalWeeks} week${totalWeeks !== 1 ? 's' : ''}` },
    { field: 'Sessions', after: `${totalSessions} session${totalSessions !== 1 ? 's' : ''}` },
    { field: 'Exercises', after: `${totalExercises} exercise${totalExercises !== 1 ? 's' : ''}` }
  ];

  // Add week details
  if (weeks && weeks.length > 0) {
    weeks.forEach((week: Week, index: number) => {
      const weekPhase = week.phase || 'Training';
      const sessionCount = week.sessions?.length || 0;
      changes.push({
        field: `Week ${index + 1}`,
        after: `${weekPhase} - ${sessionCount} session${sessionCount !== 1 ? 's' : ''}`
      });
    });
  }

  return {
    title: 'Create New Workout Program',
    changes
  };
}

function formatFieldName(field: string): string {
  // Convert camelCase to Title Case
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}
