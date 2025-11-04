/**
 * Shared formatting utilities for workout data
 * Used by both context building and read tool results
 *
 * COMPACT FORMAT DESIGN:
 * - Status codes: C=completed, P=in-progress, N=not-started, S=skipped
 * - Dates compressed: 2025-01-15 → 01-15
 * - Units abbreviated: lbs→lb, reps→r for RIR notation
 * - Fields only shown if present (no "n/a" or empty markers)
 * - Multi-line reduced to single-line where possible
 */

/**
 * Format exercise details with optional set-by-set progress
 * @param exercises - Array of exercises to format
 * @param includeSetDetails - Whether to include detailed set-by-set data (default: false)
 */
export function formatExerciseDetails(exercises: any[], includeSetDetails: boolean = false): string {
  let output = '';

  exercises?.forEach((ex: any, idx: number) => {
    // Format: E1:Name[Group] 3×8-10@225lb [3/3|S] Notes
    output += `\nE${idx + 1}:${ex.name}`;
    if (ex.groupLabel) output += `[${ex.groupLabel}]`;

    output += ` ${ex.workingSets}×${ex.reps}@${ex.targetLoad}`;

    if (ex.skipped) {
      output += ' [S]';
    } else {
      const completedCount = ex.sets?.filter((s: any) => s.completed).length || 0;
      const total = ex.workingSets;

      if (completedCount > 0) {
        output += ` [${completedCount}/${total}]`;
      } else {
        output += ' [0]';
      }

      // Set-by-set data in compact format
      if (includeSetDetails && ex.sets && ex.sets.length > 0) {
        const setData = ex.sets
          .filter((s: any) => s.completed)
          .map((s: any) => {
            // Format: 1:10@225r2 (set:reps@weight+RIR)
            let sd = `${s.setNumber}:${s.reps}`;
            if (s.weight !== undefined) sd += `@${s.weight}`;
            if (s.rir !== undefined) sd += `r${s.rir}`;
            if (s.notes) sd += `"${s.notes}"`;
            return sd;
          })
          .join(' ');

        if (setData) output += `\n  ${setData}`;

        // Show pending sets count
        const pending = total - ex.sets.length;
        if (pending > 0) {
          output += ` +${pending}pending`;
        }
      }
    }

    // Notes compressed
    if (ex.notes) output += ` |N:${ex.notes}`;
    if (ex.userNotes) output += ` |U:${ex.userNotes}`;
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
    const status = ex.skipped ? '[S]' :
                   completedSets > 0 ? `[${completedSets}/${ex.workingSets}]` :
                   '[0]';
    return `\n  ${ex.name} ${ex.workingSets}×${ex.reps}@${ex.targetLoad} ${status}`;
  }).join('');
}

/**
 * Compress date string from ISO format
 * 2025-01-15 → 01-15
 * 2025-01-15T14:30:00Z → 01-15T14:30
 */
export function compressDate(date: string | undefined): string {
  if (!date) return '';
  const match = date.match(/\d{4}-(\d{2}-\d{2})(T\d{2}:\d{2})?/);
  return match ? match[1] + (match[2] || '') : date;
}

/**
 * Format session status as single character
 * completed → C, in-progress → P, not-started → N
 */
export function formatSessionStatus(session: any): string {
  if (session.completed) return 'C';
  if (session.startedAt) return 'P';
  return 'N';
}
