import { WorkoutContext } from './ai-service';
import { formatExerciseDetails, formatExerciseSummary } from './formatters';

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

IMPORTANT - You Can Fetch Detailed Workout Data:
The basic context provides ONLY summary information. When you need detailed data, choose the right read tool:

1. get_current_week_detail - For week-specific questions (PREFERRED for efficiency)
   - Use when: Questions about the current week's sessions, comparing exercises within the week
   - Returns: Detailed set-by-set data for ALL sessions in current week only
   - Examples: "How's my week going?", "Compare my bench sessions this week", "Total volume this week"
   - Most efficient - keeps context small for follow-up questions

2. get_workout_data - For cross-week analysis or historical data
   - Use when: Questions spanning multiple weeks or specific historical lookups
   - Scopes: 'full_program' (all weeks), 'specific_week' (one week), 'specific_session' (one session)
   - Examples: "What's my total volume this month?", "Show squat progress over all weeks", "Compare Week 1 vs Week 4"
   - WARNING: 'full_program' adds ALL program data to conversation context - use sparingly

Both tools execute server-side instantly (no user confirmation needed).
Both return comprehensive set-by-set data that is NOT in the basic context.
DEFAULT to get_current_week_detail unless the question explicitly requires cross-week data.

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

  // Add user profile context if available
  if (context?.userProfile) {
    const profile = context.userProfile;
    const profileParts: string[] = [];
    if (profile.name) profileParts.push(`Name: ${profile.name}`);
    if (profile.height) profileParts.push(`Height: ${profile.height}`);
    if (profile.weight) profileParts.push(`Weight: ${profile.weight}`);
    if (profile.notes) profileParts.push(`Notes: ${profile.notes}`);

    if (profileParts.length > 0) {
      systemPrompt += `\n\n=== USER PROFILE ===\n${profileParts.join('\n')}`;
    }
  }

  // Add workout context if available
  if (context) {
    systemPrompt += `\n\n=== WORKOUT PROGRAM CONTEXT ===`;

    // Detect if user is viewing week-level (no specific session) vs session-level
    const isWeekView = context.currentWeek && !context.currentSession;

    if (isWeekView) {
      // User is viewing WEEK LEVEL - show all sessions with compressed detail
      systemPrompt += `\n\n📅 USER IS VIEWING WEEK LEVEL SCREEN`;
      const week = context.currentWeek!;
      systemPrompt += `\n\nWeek ${week.weekNumber}`;
      if (week.phase) systemPrompt += ` - ${week.phase}`;
      if (week.startDate && week.endDate) {
        systemPrompt += `\n${week.startDate} to ${week.endDate}`;
      }
      systemPrompt += `\nTotal sessions: ${week.sessions?.length || 0}`;

      // Show all sessions with compressed format
      if (week.sessions && week.sessions.length > 0) {
        week.sessions.forEach((session: any, idx: number) => {
          systemPrompt += `\n\n--- Session ${idx + 1}: ${session.name || 'Unnamed'} (${session.id})
Status: ${session.completed ? 'Completed ✓' : session.startedAt ? 'In Progress' : 'Not Started'}`;
          if (session.scheduledDate) systemPrompt += `\nScheduled: ${session.scheduledDate}`;
          if (session.completedDate) systemPrompt += `\nCompleted: ${session.completedDate}`;

          systemPrompt += `\nExercises:`;
          systemPrompt += formatExerciseSummary(session.exercises);
        });
      }
    } else if (context.currentSession) {
      // User is viewing SESSION LEVEL - show detailed current session only
      systemPrompt += `\n\n🎯 USER IS VIEWING SESSION LEVEL SCREEN`;
      if (process.env.NODE_ENV === 'development') {
        console.log('[ai-config] context.currentSession', JSON.stringify(context.currentSession));
      }
      const session = context.currentSession;
      systemPrompt += `\n\nCurrent Session: ${session.name || 'Unnamed'} (${session.id})
Status: ${session.completed ? 'Completed' : session.startedAt ? 'In Progress' : 'Not Started'}
${session.scheduledDate ? `Scheduled: ${session.scheduledDate}` : ''}

Exercises in this session:`;
      // Include set details ONLY for current session
      systemPrompt += formatExerciseDetails(session.exercises, true);

      // Show minimal week context (just metadata, no other sessions)
      if (context.currentWeek) {
        const week = context.currentWeek;
        systemPrompt += `\n\n📅 Week Context:
Week ${week.weekNumber}`;
        if (week.phase) systemPrompt += ` - ${week.phase}`;
        if (week.startDate && week.endDate) {
          systemPrompt += `\n${week.startDate} to ${week.endDate}`;
        }
      }
    }

    systemPrompt += `\n\n=== END CONTEXT ===

IMPORTANT: The context above provides ONLY summary data for efficiency. For questions requiring detailed set-by-set information, historical performance data, or volume calculations, you MUST use the appropriate read tool to fetch comprehensive data.

USER VIEW CONTEXT:
- If "VIEWING WEEK LEVEL SCREEN": User sees all sessions in the week overview. Tailor responses to week-level planning, session selection, and weekly progress.
- If "VIEWING SESSION LEVEL SCREEN": User is focused on a specific session. Tailor responses to that session's exercises, sets, and immediate performance.

When the user asks questions, prioritize information from their current view. Be specific and reference actual exercises, sets, and reps from their program. Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.`;
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[ai-config] Built system prompt', {
      length: systemPrompt.length,
      hasContext: !!context,
      hasSession: !!context?.currentSession,
      hasWeek: !!context?.currentWeek,
    });
  }

  return systemPrompt;
}
