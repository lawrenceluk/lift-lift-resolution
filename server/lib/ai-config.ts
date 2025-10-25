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
- For targetLoad, use strings like "2-3 RIR", "bodyweight", "until failure"
- updates/modifications: only include fields you want to change

IMPORTANT - Suggested Replies:
- End EVERY response with 1-3 suggested replies the user can tap to respond
- Format them on separate lines after your message like this:
---
Suggested reply 1
Suggested reply 2 (optional)
Suggested reply 3 (optional)

- Make suggested replies SHORT (2-5 words max)
- Suggested replies should feel natural, like quick responses in a text conversation
- Examples: "Tell me more", "Sounds good!", "Show me alternatives"

Your response structure should ALWAYS be:
[Your message here]
---
[Suggested reply 1]
[Suggested reply 2 (optional)]
[Suggested reply 3 (optional)]`;

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

      // List all weeks with basic info
      context.fullProgram.forEach((w: any) => {
        const completedSessions = w.sessions?.filter((s: any) => s.completed).length || 0;
        systemPrompt += `\n  Week ${w.weekNumber}${w.phase ? ` (${w.phase})` : ''}: ${completedSessions}/${w.sessions?.length || 0} sessions completed`;
      });
    }

    systemPrompt += `\n\n=== END CONTEXT ===\n\nWhen the user asks questions, prioritize information from the CURRENT WORKOUT SESSION they're viewing. Be specific and reference actual exercises, sets, and reps from their program. Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.`;
  }

  console.log('systemPrompt\n\n', systemPrompt);

  return systemPrompt;
}
