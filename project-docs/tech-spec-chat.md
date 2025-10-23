# Technical Specification: Workout Coach Chat

## Overview

This document outlines the implementation approach for adding conversational AI coaching functionality to the workout tracking app. The feature enables users to ask questions, get guidance, and make modifications to their workout program through a **JRPG-style dialog interface** powered by OpenRouter API (Claude 4.5 Haiku hardcoded for MVP).

---

## Design Philosophy

**Simplicity First**: Build the simplest thing that works. Hardcode model selection (Haiku 4.5), no model picker UI, no authentication, no backend persistence. Focus on unblocking development velocity with small, testable milestones.

**JRPG-Inspired Dialog**: Instead of a scrolling chat window, use a focused dialog box where:
- Coach messages fill the screen (like an NPC talking)
- User taps to proceed through coach's message
- User selects from suggested reply options (quick responses)
- OR user enters custom text (when options aren't suitable)
- Reduces cognitive overhead, enables one-tap interactions
- Leverages LLM's ability to suggest natural reply options

**Leverage Existing Patterns**: Use the existing localStorage-based architecture, hierarchical ID system, and React patterns already established in the codebase.

**Stepwise Progress**: Each milestone is independently testable and provides visible progress.

---

## Architecture Overview

### High-Level Flow

```
User → Chat UI → API Route → OpenRouter (Haiku 4.5) → Tool Calls → Data Mutations → LocalStorage → UI Update
```

### Components

1. **Frontend Chat UI** - React component overlay (no model picker)
2. **API Route Handler** - Express endpoint for OpenRouter API proxy
3. **Tool System** - Functions that modify workout data
4. **Context Builder** - Prepares system prompt with program data
5. **State Integration** - Hooks into existing `useWorkoutProgram`

---

## Implementation Milestones

Each milestone is independently testable and builds on the previous one.

### Milestone 1: Floating UI Shell
**Goal**: Get the basic UI structure working - button, dialog box, open/close
**Test**: Can click button, dialog appears, can close

### Milestone 2: Static Dialog Display
**Goal**: Render single coach message (hardcoded) in JRPG style
**Test**: Can see coach message filling the dialog area (not a scrolling list)

### Milestone 2.5: History Navigation UI
**Goal**: Add back/forward arrows to header, wire up navigation
**Test**: Can step backward/forward through hardcoded conversation history, arrows show/hide correctly

### Milestone 3: Reply Options UI
**Goal**: Display suggested reply buttons below coach message
**Test**: Can see 2-3 reply option buttons, tapping one shows it selected, input hidden when viewing history

### Milestone 4: Custom Text Input Toggle
**Goal**: Add "Type custom message" option that shows text input
**Test**: Can toggle between reply options and free-form text entry

### Milestone 5: API Endpoint Stub
**Goal**: Server endpoint that returns hardcoded coach response + suggested replies
**Test**: Frontend sends user message, receives coach message + reply options, displays both

### Milestone 6: OpenRouter Integration
**Goal**: Real API call to Haiku 4.5 with response format instructions
**Test**: Send "Hello", receive actual AI response with suggested reply options

### Milestone 7: Context Passing
**Goal**: Include workout program in system prompt
**Test**: Ask "What exercises are in my program?", get accurate answer

### Milestone 8: Tool Definitions
**Goal**: Define tools in API request (not executing yet)
**Test**: API accepts tools parameter without errors

### Milestone 9: Tool Call Detection with Options
**Goal**: When AI returns tool calls, show in dialog with confirm/cancel options
**Test**: Ask "Remove today's workout", see confirmation dialog with suggested replies

### Milestone 10: Tool Execution
**Goal**: Execute tool calls and update localStorage
**Test**: Select "Yes, remove it", see workout program actually change

### Milestone 11: Error Handling & Polish
**Goal**: Loading states, error messages, edge cases
**Test**: Handle network errors, invalid tool calls gracefully

---

## Data Models

### Message
```
{
  id: string (uuid)
  role: "user" | "coach"
  content: string
  timestamp: ISO date string
}
```

### CoachResponse
```
{
  message: string (coach's message text)
  suggestedReplies?: string[] (2-4 quick reply options)
  inputMode: "options" | "freeform" (whether to show reply buttons or text input)
  toolCalls?: ToolCall[]
}
```

### ChatApiRequest
```
{
  messages: Message[]
  context: {
    workoutProgram: Week[] (from existing type)
    currentUrl: string (e.g., "/week-2-session-3")
    currentDate: ISO date string
  }
}
```

### ChatApiResponse
```
{
  message: string (AI response text)
  suggestedReplies?: string[] (optional reply options)
  inputMode: "options" | "freeform"
  toolCalls?: ToolCall[]
}
```

### ToolCall
```
{
  id: string
  name: string (e.g., "modify_exercise")
  input: object (tool-specific parameters)
}
```

---

## Component Structure

### Chat UI (CoachChat.tsx)

**Visual Hierarchy**:
```
<CoachChat />
  ├── Floating button (fixed bottom-right)
  └── Dialog overlay (slides up from bottom, JRPG-style)
      ├── Header
      │   ├── Back arrow (left, if not at start of history)
      │   ├── Forward arrow (side by side, if viewing past messages)
      │   └── Close button (top-right)
      ├── Coach message area (single message, fills space)
      │   └── Text content (current coach message)
      └── User input area (below message, only shown when at latest message)
          ├── Reply option buttons (2-4 buttons, when inputMode="options")
          │   └── Each button: suggested reply text
          ├── OR Text input field (when inputMode="freeform" or user requests custom)
          │   └── Text input + send button
          └── "Write your reply" toggle (when options are shown)
```

**JRPG Dialog Behavior**:
- Only ONE message visible at a time (not a scrolling list)
- Message fills the dialog area
- User responds → New coach message replaces the old one
- Feels like talking to an NPC: focused, turn-based, one screen at a time

**History Navigation**:
- **Back arrow** (←): Step backward through conversation history
- **Forward arrow** (→): Step forward through conversation history
- Arrows appear subtly in header, only when applicable
- When viewing past messages: input area is hidden (can only reply to latest)
- Auto-scrolls to latest message when new response arrives
- Navigation is purely for review, not for editing past messages

**Component State**:
```
isOpen: boolean
conversationHistory: Message[] (all messages, user + coach)
currentMessageIndex: number (which message in history is displayed)
currentInputMode: "options" | "freeform" (only relevant when at latest message)
currentSuggestedReplies: string[] | null (only relevant when at latest message)
isLoading: boolean
pendingToolCalls: ToolCall[] | null
isViewingHistory: boolean (true if currentMessageIndex < history.length - 1)
```

**Props from Parent**:
```
weeks: Week[]
currentUrl: string
onApplyModifications: (toolCalls) => void
```

## API Design

### Endpoint: POST /api/chat

**Request Body**: ChatApiRequest (see data models above)

**Response**: ChatApiResponse (see data models above)

**Pseudocode**:
```
function handleChatRequest(request):
  1. Extract messages and context from request body
  2. Build system prompt from context:
     - Include workout program JSON
     - Include current URL for location awareness
     - Include coach persona instructions
     - Include response format instructions (see below)
  3. Call OpenRouter API:
     - Model: anthropic/claude-4.5-haiku (hardcoded)
     - Messages: [system prompt] + user messages
     - Tools: workout modification tools
  4. Parse response:
     - Extract text content
     - Extract suggested replies (if present)
     - Extract inputMode (default to "freeform" if not specified)
     - Extract tool calls if present
  5. Return { message, suggestedReplies, inputMode, toolCalls }
```

**Response Format Instructions** (added to system prompt):
```
When responding to the user:

1. If you're asking a YES/NO question or want to offer specific choices:
   - Set inputMode: "options"
   - Provide 2-4 suggestedReplies (brief, natural options like "Yes, let's do it", "No thanks", "Tell me more")

2. If you're asking an open-ended question or want the user to provide details:
   - Set inputMode: "freeform"
   - No suggestedReplies needed

3. Examples:
   - "Should we add a deload week?" → options: ["Yes, add it", "No, I'm fine", "What's a deload week?"]
   - "How are you feeling today?" → freeform (let user type freely)
   - Proposing a modification → options: ["Confirm", "Cancel", "Modify it differently"]

Return responses in this JSON structure:
{
  "message": "Your response text",
  "inputMode": "options" | "freeform",
  "suggestedReplies": ["Option 1", "Option 2", ...] (only if inputMode is "options")
}
```

**Error Handling**:
```
- Network errors → 500 + "Unable to reach AI service"
- Rate limits → 429 + "Too many requests, try again soon"
- Invalid request → 400 + "Invalid request format"
- Tool errors → Log but continue (graceful degradation)
- Missing inputMode → Default to "freeform"
```

**Environment**:
- `OPENROUTER_API_KEY` in Replit Secrets

## Tool System

### Tool Definitions (passed to OpenRouter)

**modify_exercise**:
```
Description: Modify a specific exercise in a workout session
Inputs:
  - weekNumber (number, required)
  - sessionNumber (number, required)
  - exerciseNumber (number, required)
  - updates (object, required): {
      name?: string
      reps?: string
      targetLoad?: string
      notes?: string
      // ... other Exercise fields
    }
```

**remove_workout**:
```
Description: Remove a workout session from a week
Inputs:
  - weekNumber (number, required)
  - sessionNumber (number, required)
```

**add_workout**:
```
Description: Add a new workout session to a week
Inputs:
  - weekNumber (number, required)
  - position (number | "start" | "end", optional, default "end")
  - workout (WorkoutSession object, required)
```

*Additional tools (add_week, remove_week, replace_workout) follow similar pattern*

### Tool Execution (client-side)

**Pseudocode**:
```
function applyModifications(weeks, toolCalls):
  updatedWeeks = clone(weeks)

  for each toolCall in toolCalls:
    switch toolCall.name:
      case "modify_exercise":
        updatedWeeks = modifyExercise(updatedWeeks, toolCall.input)
      case "remove_workout":
        updatedWeeks = removeWorkout(updatedWeeks, toolCall.input)
      case "add_workout":
        updatedWeeks = addWorkout(updatedWeeks, toolCall.input)
      // ... other tools

  return updatedWeeks

function modifyExercise(weeks, params):
  1. Find week by weekNumber
  2. Find session by sessionNumber
  3. Find exercise by exerciseNumber
  4. Apply updates object to exercise (merge)
  5. Return updated weeks array

function removeWorkout(weeks, params):
  1. Find week by weekNumber
  2. Remove session at sessionNumber
  3. Renumber subsequent session IDs (use existing helpers)
  4. Return updated weeks array

function addWorkout(weeks, params):
  1. Find week by weekNumber
  2. Generate proper session ID
  3. Insert workout at position
  4. Renumber subsequent session IDs
  5. Return updated weeks array
```

**ID Renumbering Logic**:
- Leverage existing `createSessionId()`, `createExerciseId()` helpers
- After insertion/deletion, iterate through affected items
- Regenerate IDs with sequential numbers
- Maintain hierarchical structure: `week-{N}-session-{M}-exercise-{P}`

---

## Context Builder

**System Prompt Template**:
```
You are a knowledgeable workout coach helping a user adapt their training program.

# Current Context
- Current URL: {currentUrl}
- Today's Date: {currentDate}

# Workout Program
{workoutProgramJSON}

# Your Role
- Answer questions about exercises, programming, and training
- Suggest intelligent modifications when needed
- Always confirm before making changes
- Maintain training intent when modifying workouts

# Tone
- Direct and helpful, like a knowledgeable friend
- Science-grounded but flexible about real-world constraints
- Encouraging but honest (push back on unwise decisions)

# Important
- Exercise IDs follow format: week-{N}-session-{M}-exercise-{P}
- When modifying, preserve hierarchical ID structure
- Always use 1-based indexing for human-readable numbers
- If uncertain about changes, ask clarifying questions

# Available Tools
You can modify the workout program using the provided tools. Always show a clear summary of proposed changes before executing.
```

**Context Size Optimization**:
- Include full program if <100kb
- If larger: include current week + adjacent 2 weeks only
- Minify JSON (remove unnecessary whitespace)

---

## State Integration

**useWorkoutProgram Extension**:
```
Add new method: applyBulkModifications(toolCalls)
  - Takes array of ToolCall objects
  - Calls applyModifications() helper
  - Calls existing updateWeeks() to persist

Usage in CoachChat:
  - Pass as prop: onApplyModifications
  - Call when user confirms changes
```

---

## Data Flow Examples

### Simple Question (No Modifications)
```
1. User opens chat → Initial state: inputMode="freeform", text input shown
2. User types: "How do I do a Romanian Deadlift?" → Sends message
3. Frontend: POST /api/chat (messages + context)
4. Server: Call Haiku 4.5 with system prompt
5. Haiku returns:
   {
     message: "Romanian Deadlifts are...",
     inputMode: "options",
     suggestedReplies: ["Thanks!", "Show me another exercise", "What about form cues?"]
   }
6. Frontend: Display coach message + 3 reply buttons
7. User: Taps "Thanks!" button
8. Frontend: Sends that as user message, cycle repeats
```

### Exercise Substitution (with Tool Call)
```
1. User types: "Squat rack is taken, what can I do instead?"
2. Frontend: POST /api/chat
3. Haiku identifies current exercise from currentUrl
4. Haiku returns:
   {
     message: "I can replace Barbell Squats with Goblet Squats. Should I make that change?",
     inputMode: "options",
     suggestedReplies: ["Yes, do it", "What's a Goblet Squat?", "Suggest something else"],
     toolCalls: [{ name: "modify_exercise", input: {...} }]
   }
5. Frontend: Display message + options + store toolCalls in state
6. User: Taps "Yes, do it"
7. Frontend: applyBulkModifications(toolCalls) → localStorage updated
8. Frontend: Send confirmation message, get coach's acknowledgment
9. Coach: "Done! I've replaced it with Goblet Squats."
```

### Open-Ended Question
```
1. Coach: "How are you feeling about your training lately?"
2. Haiku returns:
   {
     message: "How are you feeling about your training lately?",
     inputMode: "freeform"
   }
3. Frontend: Show text input field (no suggested replies)
4. User: Types detailed response about fatigue, etc.
5. Cycle continues based on user's input
```

---

## Key Technical Decisions

### 1. JRPG-Style Dialog (Not Scrolling Chat)
**Why**: Reduces cognitive overhead, enables one-tap responses, feels more focused
**Implementation**: Single coach message visible at a time, user replies with options or custom text
**Trade-off**: Can't scroll back through history in UI, but conversation history is kept for API context

### 2. LLM-Generated Reply Options
**Why**: LLMs are good at suggesting natural responses, reduces friction for common replies
**Implementation**: Coach returns `suggestedReplies` array + `inputMode` flag in response
**Fallback**: Always allow "Type custom message" option for flexibility

### 3. Client-Side Tool Execution
**Why**: All data lives in localStorage anyway. Server just proxies AI requests.
**Trade-off**: Client must validate tool calls, but avoids server state complexity.

### 4. No Conversation Persistence (Between Sessions)
**Why**: PRD requirement + simplicity + cost reduction
**Implementation**: Component state only, resets on close
**Note**: Within a session, conversation history is maintained for API context

### 5. Hardcoded Model (Haiku 4.5)
**Why**: MVP simplicity, avoid UI complexity, good balance of speed/capability
**Future**: Can add model picker later if needed

### 6. Tool Call Validation
**Why**: Protect against malformed AI responses
**Implementation**: Validate before execution - check week/session/exercise exists, required fields present
**Error Handling**: Show user-friendly error, don't execute, log for debugging

---

## File Structure

```
server/
├── routes/
│   └── chat.ts                 # POST /api/chat endpoint
├── utils/
│   ├── contextBuilder.ts       # System prompt generation
│   └── workoutTools.ts         # Tool definitions

client/src/
├── components/
│   ├── CoachChat.tsx           # Main chat component
│   ├── ChatMessage.tsx         # Message bubble (optional sub-component)
│   └── ModificationPreview.tsx # Tool call preview card
├── hooks/
│   └── useChat.ts              # Chat state management (optional)
├── utils/
│   ├── workoutModifications.ts # Tool execution functions
│   └── chatApi.ts              # API client
└── types/
    └── chat.ts                 # Type definitions
```

---

## Dependencies

**New**:
- `openai` (^4.0.0) - Compatible with OpenRouter API

**Existing to Use**:
- `lucide-react` - Icons
- `@radix-ui/react-dialog` - Overlay primitives
- `framer-motion` - Animations (optional)

---

## Environment

**Replit Secrets**:
- `OPENROUTER_API_KEY` - API key for OpenRouter

**Hardcoded in Code**:
- Model: `anthropic/claude-4.5-haiku` (or most recent Haiku 4.5 identifier)

---

## Testing Per Milestone

**M1 - Floating UI**: Button visible, dialog appears/closes
**M2 - Static Display**: Single hardcoded coach message renders in JRPG style
**M2.5 - History Nav**: Back/forward arrows work, navigate through hardcoded history, input hidden when viewing past
**M3 - Reply Options**: Reply buttons render and can be selected
**M4 - Custom Toggle**: Can switch to custom text input mode
**M5 - API Stub**: Send message, receive hardcoded response + options, history updates
**M6 - OpenRouter**: Receive real AI responses with suggested replies
**M7 - Context**: AI knows about workout program from context
**M8 - Tools**: API accepts tools parameter without errors
**M9 - Tool Detection**: Tool calls show in dialog with confirm/cancel options
**M10 - Execution**: Selecting "confirm" option executes modifications
**M11 - Polish**: Errors handled, loading states work, smooth UX, history navigation smooth

---

## Notes & Considerations

**JRPG Dialog UX**:
- Keep coach messages concise (1-3 sentences ideal)
- Streaming coach responses with typewriter effect
- Reply options should be brief (3-6 words each)
- "Type custom message" option always available as fallback
- Consider subtle animations (fade in/out) between message transitions
- Navigation arrows should be subtle (ghost/outline style) to not distract
- Keyboard shortcuts: Left/Right arrow keys for history navigation (optional enhancement)

**Expected Response Time**:
- Simple questions: 1-3 seconds (Haiku is fast)
- Complex modifications: 3-5 seconds
- Show loading state while waiting (typing indicator style)

**Context Size**:
- Typical 4-week program: ~10-50kb
- If program >100kb: include only current week + 2 adjacent weeks

**Mobile**:
- Reply buttons should be thumb-friendly (min 44px height)
- Handle keyboard appearance for custom text input
- Test on mobile devices in later milestones

---

## Open Questions

1. **Dialog Height**: 40vh, 50vh, or dynamic based on content? → Suggest 40vh to leave workout visible
2. **Multiple Modifications**: If tool call affects multiple items, show all in one message? → Suggest yes
3. **Failed Modifications**: Retry mechanism? → Suggest no, just show error message
4. **Reply Button Styling**: Pill-shaped, rounded rectangles, or card-style? → TBD based on design system
5. **Custom Input Placement**: Replace reply buttons or appear below them? → Suggest replace (cleaner)
6. **Conversation Start**: Should first message be coach greeting or wait for user? → Suggest wait for user (less intrusive)
7. **Arrow Styling**: Ghost buttons, icon-only, or subtle chevrons? → Suggest ghost buttons with chevron icons
8. **History Indicator**: Show position in history (e.g., "3/7")? → Suggest no, keep it minimal
