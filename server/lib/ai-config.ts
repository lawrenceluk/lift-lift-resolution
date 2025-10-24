import { WorkoutContext } from './ai-service';

/**
 * Build context-aware system prompt for the workout coach
 */
export function buildSystemPrompt(context?: WorkoutContext): string {
  let systemPrompt = `You are a helpful workout coach texting back and forth with a user. Keep responses concise, friendly but devoid of unnecessary pleasantries, and focused on fitness guidance. Do not use markdown or emojis that would be unsupported by SMS text clients.

IMPORTANT - Suggested Replies:
- End EVERY response with 1-3 suggested replies the user can tap to respond
- Format them on separate lines after your message like this:
---
Suggested reply 1
Suggested reply 2
Suggested reply 3

- Make suggested replies SHORT (2-5 words max)
- Suggested replies should feel natural, like quick responses in a text conversation
- Examples: "Tell me more", "Sounds good!", "What about cardio?", "Show me alternatives", "I'm ready"

Your response structure should ALWAYS be:
[Your message here]
---
[Suggested reply 1]
[Suggested reply 2]
[Suggested reply 3]`;

  // Add workout context if available
  if (context) {
    systemPrompt += `\n\n=== WORKOUT PROGRAM CONTEXT ===`;

    // PRIORITY: Current session (what user is looking at right now)
    if (context.currentSession) {
      console.log('context.currentSession\n\n', JSON.stringify(context.currentSession));
      const session = context.currentSession;
      systemPrompt += `\n\n🎯 CURRENT WORKOUT SESSION (User is viewing this NOW):
Session: ${session.name || 'Unnamed'}
Status: ${session.completed ? 'Completed' : session.startedAt ? 'In Progress' : 'Not Started'}
${session.scheduledDate ? `Scheduled: ${session.scheduledDate}` : ''}

Exercises in this session:`;

      session.exercises?.forEach((ex: any, idx: number) => {
        systemPrompt += `\n${idx + 1}. ${ex.name}`;
        systemPrompt += ` - ${ex.workingSets} sets × ${ex.reps} reps @ ${ex.targetLoad}`;
        if (ex.skipped) {
          systemPrompt += ` [SKIPPED]`;
        } else if (ex.sets && ex.sets.length > 0) {
          const completedSets = ex.sets.filter((s: any) => s.completed).length;
          systemPrompt += ` [${completedSets}/${ex.workingSets} sets logged]`;
        }
        if (ex.notes) systemPrompt += `\n   Notes: ${ex.notes}`;
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

    systemPrompt += `\n\n=== END CONTEXT ===\n\nWhen the user asks questions, prioritize information from the CURRENT WORKOUT SESSION they're viewing. Be specific and reference actual exercises, sets, and reps from their program.`;
  }

  console.log('systemPrompt\n\n', systemPrompt);

  return systemPrompt;
}
