/**
 * Shared formatting utilities for workout data
 * Used by both context building and read tool results
 */

/**
 * Format exercise details with optional set-by-set progress
 * @param exercises - Array of exercises to format
 * @param includeSetDetails - Whether to include detailed set-by-set data (default: false)
 */
export function formatExerciseDetails(exercises: any[], includeSetDetails: boolean = false): string {
  let output = '';

  exercises?.forEach((ex: any, idx: number) => {
    output += `\n${idx + 1}. ${ex.name}`;
    if (ex.groupLabel) output += ` [${ex.groupLabel}]`;

    if (ex.skipped) {
      output += ` - ${ex.workingSets} sets × ${ex.reps} @ ${ex.targetLoad} [SKIPPED]`;
    } else {
      output += ` - Target: ${ex.workingSets} sets × ${ex.reps} @ ${ex.targetLoad}`;

      // Show completion status
      if (ex.sets && ex.sets.length > 0) {
        const completedSets = ex.sets.filter((s: any) => s.completed).length;
        output += ` [${completedSets}/${ex.workingSets} logged]`;

        // Only show detailed set-by-set data if requested
        if (includeSetDetails) {
          ex.sets.forEach((set: any) => {
            if (set.completed) {
              output += `\n   Set ${set.setNumber}: ${set.reps} reps`;
              if (set.weight !== undefined) {
                output += ` @ ${set.weight} ${set.weightUnit}`;
              }
              if (set.rir !== undefined) {
                output += `, RIR ${set.rir}`;
              }
              if (set.notes) {
                output += ` (${set.notes})`;
              }
              output += ` ✓`;
            }
          });

          // Show which sets are pending
          const pendingSets = ex.workingSets - ex.sets.length;
          if (pendingSets > 0) {
            const nextSetNum = ex.sets.length + 1;
            output += `\n   Set ${nextSetNum}`;
            if (pendingSets > 1) {
              output += `-${ex.workingSets}`;
            }
            output += `: [pending]`;
          }
        }
      } else {
        output += ` [no sets logged yet]`;
      }
    }

    if (ex.notes) output += `\n   Exercise notes: ${ex.notes}`;
    if (ex.userNotes) output += `\n   User notes: ${ex.userNotes}`;
  });

  return output;
}

/**
 * Format exercise summary (compressed, no set details)
 * One line per exercise with completion status
 */
export function formatExerciseSummary(exercises: any[]): string {
  if (!exercises || exercises.length === 0) return ' none';

  return exercises.map((ex: any) => {
    const completedSets = ex.sets?.filter((s: any) => s.completed).length || 0;
    const status = ex.skipped ? '[SKIPPED]' :
                   completedSets > 0 ? `[${completedSets}/${ex.workingSets} logged]` :
                   '[not started]';
    return `\n  - ${ex.name}: ${ex.workingSets}×${ex.reps} @ ${ex.targetLoad} ${status}`;
  }).join('');
}
