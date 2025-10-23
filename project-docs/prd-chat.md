# Product Requirements Document: Workout Coach Chat

## Overview
A conversational AI coach integrated into the workout tracking app that helps users adapt their training program in real-time. Users can ask questions, get guidance, and make intelligent modifications to their workout plan through natural conversation.

---

## Problem Statement

### Current State
The workout tracking app displays a pre-programmed workout plan but offers no way to modify it within the app. If users need to make changes (equipment substitution, add/remove workouts, adjust for fatigue, etc.), they must:
1. Export the entire program JSON
2. Edit it manually or use external AI tools
3. Re-import the modified JSON

This workflow is cumbersome and breaks the user's flow, especially when they're in the gym and need immediate help.

### Additional Problems
Users also encounter real-world constraints and questions during training:
- Equipment unavailable
- Feeling sick or fatigued
- Don't know how to perform an exercise
- Not recovering well between sessions
- Want to make strategic program adjustments

There's no in-app way to get contextual guidance or make these adjustments.

### Solution
Bring workout editing in-house through a conversational interface that:
- Provides immediate guidance and answers
- Makes intelligent program modifications
- Maintains data model integrity
- Feels natural and unobtrusive (like talking to an NPC in Pokemon)

---

## Success Criteria
- Users can modify their workout plan without leaving the app
- Users can resolve in-the-moment workout blockers through conversation
- Program modifications preserve training intent and data model structure
- Interface feels lightweight and doesn't interrupt workout flow

---

## User Experience

### Entry Point & Interface
- Floating chat button accessible from anywhere in the app
- Opens as **partial screen overlay** (not full screen takeover)
- Think: Pokemon NPC dialogue box - bottom portion of screen, workout still visible above
- Chat interface remains visible while user can still see their current workout context
- Dismissible with tap outside or close button

### Conversation Flow
1. User taps chat button from any screen
2. Chat overlay appears over bottom portion of screen
3. Bot has full context of workout program and user's current location
4. User asks question or describes situation
5. Bot responds with:
   - Direct answer (no modifications needed), OR
   - Proposed workout/week modifications (requires confirmation)
6. If modifications proposed:
   - Bot shows preview/summary of changes in chat
   - User confirms or rejects
   - Changes applied immediately to workout plan
7. User closes chat when done - no conversation history persists

### Chat Context
The bot has access to:
- **Full workout program** (all weeks, sessions, exercises) - passed in system prompt
- **Training log** (completed workouts, sets, weights, RIR ratings) - passed in system prompt
- **Current URL** (e.g., `/week-1-session-3`) - used to identify what user is looking at
- **User provides additional context** through conversation (how they're feeling, constraints, etc.)

The bot does NOT have:
- Persistent memory across conversations
- User profile/goals (inferred from program structure only)
- Nutrition information
- External data (weather, gym hours, etc.)

---

## Scope

### In Scope
**Informational Responses:**
- Exercise form/technique questions
- Program structure explanations (pairing, RIR, tempo, etc.)
- "Why are we doing this?" rationale questions
- Intensity calibration ("does this feel right?")

**Workout Plan Editing:**
- Add workout sessions at specific positions
- Remove workout sessions
- Replace existing workout sessions
- Modify individual exercises within sessions
- Insert/remove entire weeks
- Reorder workouts

**Strategic Program Changes:**
- Deload week insertion
- Multi-workout adjustments for recovery
- Volume/intensity adjustments across multiple sessions

### Out of Scope
- Nutrition advice
- Programming entirely new workout plans from scratch
- Integration with external services (calendar, fitness trackers, etc.)
- Progress analytics/visualization (use main app features)
- Injury diagnosis or medical advice
- Exercise video content

---

## Functional Requirements

### FR-1: Context Loading
- System prompt includes full workout program JSON (10-100kb)
- System prompt includes training log with completed sets
- Current URL parsed to extract week/session/exercise context
- Context refreshed on each new conversation

### FR-2: Conversational AI
- Natural language understanding of workout-related questions
- Ability to ask clarifying questions when needed
- Responses match trainer persona: direct, helpful, friendly, science-grounded but flexible
- Can handle multiple related modifications in single conversation

### FR-3: Workout Plan Modification Tools

The bot has access to granular editing operations:

**`add_workout(weekNumber, sessionNumber, workoutData, position?)`**
- Adds a new workout session to specified week
- `position`: 'start' | 'end' | number (index) - defaults to 'end'
- Returns properly formatted WorkoutSession JSON
- Automatically renumbers subsequent session IDs

**`remove_workout(weekNumber, sessionNumber)`**
- Removes specified workout session
- Automatically renumbers subsequent session IDs
- Returns confirmation of deletion

**`replace_workout(weekNumber, sessionNumber, workoutData)`**
- Replaces existing workout session with new data
- Preserves session ID
- Returns updated WorkoutSession JSON

**`add_week(weekNumber, weekData, position?)`**
- Adds entire week to program
- `position`: 'before' | 'after' | 'replace' - defaults to 'after'
- Automatically renumbers subsequent week IDs if inserting

**`remove_week(weekNumber)`**
- Removes entire week
- Automatically renumbers subsequent weeks
- Returns confirmation of deletion

**`modify_exercise(weekNumber, sessionNumber, exerciseNumber, exerciseData)`**
- Modifies a single exercise within a session
- Can update any exercise properties (name, sets, reps, load, notes, etc.)
- Preserves exercise ID
- Returns updated Exercise JSON

All tools must:
- Return valid JSON per data model
- Maintain hierarchical ID structure
- Handle ID renumbering when items are inserted/removed

### FR-4: Modification Confirmation
- Before applying any modification, show user a preview
- Preview format: summary of changes in chat (e.g., "Adding Upper Body session to Week 3, Day 2")
- User must explicitly confirm or reject
- On confirmation, update workout plan immediately
- On rejection, bot can iterate on proposal

### FR-5: Multiple Modifications
- Bot can propose multiple related changes in one response
- Example: "Replace today's workout + add arm day next week"
- Each modification requires separate tool call
- Bot should ask clarifying questions if changes affect each other

---

## Non-Functional Requirements

### NFR-1: Response Time
- Chat responses within 3 seconds for simple queries
- Modification proposals within 5 seconds
- No loading states >10 seconds

### NFR-2: Context Size
- System must handle 10-100kb JSON in context window
- Graceful handling if program exceeds context limits

### NFR-3: Reliability
- Tool calls must return valid JSON per data model
- ID generation and renumbering must follow hierarchical format exactly
- Failed modifications should not corrupt workout plan
- Atomic operations - either full success or full rollback

### NFR-4: Tone & Voice
- Conversational, not clinical
- Direct and helpful, like a friend who cares
- Encouraging but honest (will push back on unwise decisions)
- Science-grounded but gracious about real-world flexibility

### NFR-5: UI Performance
- Chat overlay animation smooth (60fps)
- No jank when opening/closing chat
- Workout content above chat remains interactive

---

## User Stories

### Story 1: Equipment Substitution
**As a** user in the middle of a workout  
**I want to** quickly substitute an exercise when equipment is unavailable  
**So that** I can complete my training without interruption

**Acceptance Criteria:**
- User describes situation ("squat rack is taken")
- Bot suggests appropriate substitution based on current exercise
- Bot proposes modification using `modify_exercise` tool
- User confirms and sees updated exercise in tracker immediately
- Workout flow not interrupted

---

### Story 2: Fatigue Management
**As a** user feeling unusually tired  
**I want to** get guidance on whether/how to modify today's workout  
**So that** I can train intelligently without overtraining

**Acceptance Criteria:**
- Bot asks clarifying questions (sleep, soreness, stress)
- Bot offers multiple options (full workout, reduced volume, rest day)
- User chooses option
- Bot applies appropriate modifications using `replace_workout` or `modify_exercise`

---

### Story 3: Recovery Issues
**As a** user struggling to recover between sessions  
**I want to** have a conversation about my training load  
**So that** I can make strategic adjustments to the program

**Acceptance Criteria:**
- Bot reviews training log to identify patterns
- Bot asks diagnostic questions
- Bot proposes program-level changes (deload, volume reduction)
- User can accept/reject/iterate on proposal
- Changes applied using `add_week`, `modify_exercise`, or combination of tools

---

### Story 4: Form Questions
**As a** user unfamiliar with an exercise  
**I want to** get clear instructions on how to perform it  
**So that** I can execute the movement safely and effectively

**Acceptance Criteria:**
- User asks "how do I do X?"
- Bot provides step-by-step instructions
- Bot highlights common mistakes
- No modifications to workout plan
- Chat remains open for follow-up questions

---

### Story 5: Adding Training Volume
**As a** user wanting to add extra work  
**I want to** discuss whether/how to add sessions  
**So that** I can progress toward my goals intelligently

**Acceptance Criteria:**
- Bot evaluates current program phase and volume
- Bot offers smart alternatives (increase existing volume vs. add sessions)
- Bot warns about recovery implications if relevant
- If user insists, bot proposes new session(s) using `add_workout`
- User specifies where to insert (e.g., "between Day 2 and Day 3")
- Changes applied to program with proper ID renumbering

---

### Story 6: Removing a Workout
**As a** user who can't complete a scheduled workout  
**I want to** remove it from my plan  
**So that** my program reflects reality

**Acceptance Criteria:**
- User describes situation ("traveling this week, can't do Friday's workout")
- Bot confirms removal won't disrupt program logic
- Bot uses `remove_workout` tool
- Subsequent sessions renumbered automatically
- User sees updated week view

---

## Data Model Integration

### Input Data Structures
Bot receives:
```typescript
{
  workoutProgram: Week[],  // Full program per data model
  trainingLog: {
    // Map of exercise IDs to completed SetResult[]
  },
  currentUrl: string,  // e.g., "/week-3-session-2"
  currentDate: string  // ISO date
}
```

### Output Data Structures

**Tool: add_workout**
```typescript
{
  weekNumber: number,
  sessionNumber: number,
  position?: 'start' | 'end' | number,  // default: 'end'
  workout: WorkoutSession  // Per data model
}
```

**Tool: remove_workout**
```typescript
{
  weekNumber: number,
  sessionNumber: number
}
```

**Tool: replace_workout**
```typescript
{
  weekNumber: number,
  sessionNumber: number,
  workout: WorkoutSession  // Per data model
}
```

**Tool: add_week**
```typescript
{
  weekNumber: number,
  position?: 'before' | 'after' | 'replace',  // default: 'after'
  week: Week  // Per data model
}
```

**Tool: remove_week**
```typescript
{
  weekNumber: number
}
```

**Tool: modify_exercise**
```typescript
{
  weekNumber: number,
  sessionNumber: number,
  exerciseNumber: number,
  exercise: Partial<Exercise>  // Only fields being modified
}
```

All returned data must conform exactly to the workout data model (see project context).

### ID Renumbering Logic
When insertions/deletions occur:
- Session IDs within affected week are renumbered sequentially
- Exercise IDs within affected session are renumbered sequentially
- Week IDs renumbered if weeks inserted/removed
- Format maintained: `week-{N}-session-{M}-exercise-{P}`

Example: Removing `week-2-session-2`:
- Before: `week-2-session-1`, `week-2-session-2`, `week-2-session-3`
- After: `week-2-session-1`, `week-2-session-2` (was session-3)

---

## Technical Constraints

### Must Use Existing Data Model
- All IDs must follow hierarchical format: `week-{N}-session-{M}-exercise-{P}`
- Exercise IDs are sequential starting from 1 within each session
- All required fields per TypeScript definitions must be present
- No modifications to data model structure

### Context Window Management
- Full program JSON passed in system prompt
- If program exceeds practical context limits (>100kb), truncate to recent weeks + current week + next 2 weeks
- Training log can be summarized if needed (e.g., last 4 weeks only)

### Tool Call Format
- Use standard function calling format
- Return complete, valid JSON objects
- Include all required fields per data model
- Preserve existing IDs when modifying (don't regenerate unnecessarily)

### UI Constraints
- Chat overlay must not block critical workout information
- Keyboard appearance handled gracefully on mobile
- Chat scrollable if conversation extends beyond visible area
- Tap-outside-to-dismiss should work intuitively

---

## Open Questions
1. **Preview/Diff Format:** Exact UI for showing proposed changes - text summary in chat vs. visual diff?
2. **Error Handling:** What happens if tool call returns invalid JSON or malformed IDs?
3. **Conversation Limits:** Should there be a max message limit per conversation to prevent runaway costs?
4. **Undo Functionality:** Should users be able to undo recent modifications? Or is confirmation sufficient?
5. **Partial Screen Layout:** Exact height/positioning of chat overlay - 40% of screen? 50%? Responsive?

---

## Future Considerations (Out of Current Scope)
- Persistent chat history for reference ("why did we change this?")
- Voice input/output for hands-free gym use
- Integration with wearables for automatic fatigue detection
- Social features (share modifications with training partners)
- Program templates library for common modifications
- Batch operations (e.g., "reduce volume across all sessions this week")
- Visual diff view for complex modifications