import { WorkoutContext } from './ai-service';

/**
 * Build context-aware system prompt for the workout coach
 */
export function buildSystemPrompt(context?: WorkoutContext): string {
  let systemPrompt = `You are a helpful workout coach texting back and forth with a user. Keep responses concise, friendly but devoid of unnecessary pleasantries, and focused on fitness guidance. Do not use markdown or emojis that would be unsupported by SMS text clients.

IMPORTANT - You Can Modify Workout Programs:
You have tools available to modify the user's workout program. When the user asks to:
- Change, swap, or replace an exercise (e.g., "replace squats with lunges")
- Add or remove exercises or sessions
- Modify reps, sets, weight, or rest periods
- Reorder exercises
- Change session names or schedules

USE THE APPROPRIATE TOOL to make the modification. The user will see a preview and can approve or reject your changes. Be proactive about using tools when the user clearly wants to modify their program.

TOOL CALLING CONVENTIONS:
- All indices are 1-based (first week = 1, first session = 1, first exercise = 1)
- position parameter: number or "end" to append
- String fields support ranges ("8-10") and expressions ("70% 1RM", "bodyweight")
- For targetLoad, use RIR counts like "2-3 RIR" or "bodyweight" unless reps are not applicable
- updates/modifications: only include fields you want to change
- groupLabel: Used for supersets/circuits. Same letter = same group, different numbers = exercise order
  * Examples: "A1" + "A2" = superset, "B1" + "B2" + "B3" = tri-set, "C1" = standalone
  * When adding/modifying exercises, check existing groupLabels in the session
  * If other exercises are grouped, consider grouping the new exercise appropriately
  * If user asks to superset exercises, assign matching letters with sequential numbers

IMPORTANT - Suggested Replies:
- ALWAYS call the suggest_replies tool with 1-3 short reply options (2-5 words each)
- Suggest replies that ADVANCE the conversation or provide USEFUL actions
- AVOID generic/useless replies like "Okay", "Thanks", "Got it" - these don't add value
- Good examples: "Tell me more", "Show alternatives", "Adjust intensity", "Skip this exercise"
- Bad examples: "Okay, thanks", "Sounds good", "Alright" - too generic
- Each reply should represent a meaningfully different direction for the conversation
- You can combine the suggest_replies tool with other tools in a single response`;

  // Add workout context if available
  if (context) {
    systemPrompt += `\n\n=== WORKOUT PROGRAM CONTEXT ===`;

    // PRIORITY: Current session (what user is looking at right now)
    if (context.currentSession) {
      console.log('context.currentSession\n\n', JSON.stringify(context.currentSession));
      const session = context.currentSession;
      systemPrompt += `\n\n🎯 CURRENT WORKOUT SESSION (User is viewing this NOW):
Session: ${session.name || 'Unnamed'} (${session.id})
Status: ${session.completed ? 'Completed' : session.startedAt ? 'In Progress' : 'Not Started'}
${session.scheduledDate ? `Scheduled: ${session.scheduledDate}` : ''}

Exercises in this session:`;

      session.exercises?.forEach((ex: any, idx: number) => {
        systemPrompt += `\n${idx + 1}. ${ex.name}`;
        if (ex.groupLabel) systemPrompt += ` [${ex.groupLabel}]`;
        systemPrompt += ` - ${ex.workingSets} sets × ${ex.reps} reps @ ${ex.targetLoad}`;
        if (ex.skipped) {
          systemPrompt += ` [SKIPPED]`;
        } else {
          systemPrompt += ` - Target: ${ex.workingSets} sets × ${ex.reps} reps @ ${ex.targetLoad}`;

          // Show detailed set-by-set data if any sets are logged
          if (ex.sets && ex.sets.length > 0) {
            const completedSets = ex.sets.filter((s: any) => s.completed).length;
            systemPrompt += ` [${completedSets}/${ex.workingSets} logged]`;

            // Add detailed set information
            ex.sets.forEach((set: any) => {
              const setPrefix = `\n   Set ${set.setNumber}:`;
              if (set.completed) {
                systemPrompt += setPrefix;
                systemPrompt += ` ${set.reps} reps`;
                if (set.weight !== undefined) {
                  systemPrompt += ` @ ${set.weight} ${set.weightUnit}`;
                }
                if (set.rir !== undefined) {
                  systemPrompt += `, RIR ${set.rir}`;
                }
                if (set.notes) {
                  systemPrompt += ` (${set.notes})`;
                }
                systemPrompt += ` ✓`;
              }
            });

            // Show which sets are pending
            const pendingSets = ex.workingSets - ex.sets.length;
            if (pendingSets > 0) {
              const nextSetNum = ex.sets.length + 1;
              systemPrompt += `\n   Set ${nextSetNum}`;
              if (pendingSets > 1) {
                systemPrompt += `-${ex.workingSets}`;
              }
              systemPrompt += `: [pending]`;
            }
          } else {
            systemPrompt += ` [no sets logged yet]`;
          }
        }
        if (ex.notes) systemPrompt += `\n   Exercise notes: ${ex.notes}`;
        if (ex.userNotes) systemPrompt += `\n   User notes: ${ex.userNotes}`;
      });
    }

    // SECONDARY: Current week context
    if (context.currentWeek) {
      const week = context.currentWeek;
      systemPrompt += `\n\nCurrent Week: Week ${week.weekNumber}`;
      if (week.phase) systemPrompt += ` (${week.phase})`;
      systemPrompt += `\nSessions in this week: ${week.sessions?.length || 0}`;
    }

    // TERTIARY: Full program (compressed for context limit awareness)
    if (context.fullProgram && context.fullProgram.length > 0) {
      systemPrompt += `\n\nFull Program Overview:`;
      systemPrompt += `\n- Total weeks: ${context.fullProgram.length}`;
      const totalSessions = context.fullProgram.reduce((sum: number, w: any) => sum + (w.sessions?.length || 0), 0);
      systemPrompt += `\n- Total sessions: ${totalSessions}`;

      // List all sessions with compact format: session number + name
      systemPrompt += `\n\nAll Sessions:`;
      context.fullProgram.forEach((w: any) => {
        const sessionList = w.sessions?.map((s: any, idx: number) =>
          `${idx + 1}. ${s.name || 'Unnamed'}${s.completed ? ' ✓' : ''}`
        ).join(', ') || 'none';
        systemPrompt += `\n  Week ${w.weekNumber}${w.phase ? ` (${w.phase})` : ''}: ${sessionList}`;
      });
    }

    systemPrompt += `\n\n=== END CONTEXT ===\n\nWhen the user asks questions, prioritize information from the CURRENT WORKOUT SESSION they're viewing. Be specific and reference actual exercises, sets, and reps from their program. Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.`;
  }

  console.log('systemPrompt\n\n', systemPrompt);

  return systemPrompt;
}
