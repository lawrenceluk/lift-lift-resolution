# Tool System Specification: Coach Workout Modifications

## Overview

This document specifies the tool system that enables the AI coach to modify workout programs through structured function calls. The system follows a confirm-before-execute pattern where all modifications require explicit user approval.

---

## Architecture

### High-Level Flow

```
User Message → LLM with Tools → Tool Call Response → User Confirmation → Execute Tools → Update localStorage → Feedback to User
```

### Key Principles

1. **Explicit Confirmation Required** - No modifications happen without user approval via UI button click
2. **Atomic Operations** - Each tool call is a single, well-defined operation
3. **Validation First** - All parameters validated before execution
4. **Clear Feedback** - User sees exactly what will change before confirming
5. **Graceful Failures** - Invalid tool calls don't crash, they provide helpful errors
6. **Conversation Continuity** - User can ask questions while tool calls are pending without triggering execution
7. **All-or-Nothing** - User approves all pending tool calls or cancels all (simplicity over granular control)

---

## Data Models

### CardioBlock

Used in sessions for cardio-focused workouts:

```
{
  type: "zone2" | "intervals" | "sweetspot" | "threshold" | "vo2max",
  duration: number,          // Minutes
  modality?: string,         // e.g., "Running", "Cycling", "Rowing"
  instructions?: string,     // Detailed workout instructions
  completed: boolean,
  actualDuration?: number,   // Actual minutes completed
  avgHeartRate?: number,     // Average heart rate during cardio
  notes?: string
}
```

### Exercise

Referenced by exercise-related tools:

```
{
  id: string,                // Hierarchical ID (week-X-session-Y-exercise-Z)
  name: string,
  groupLabel?: string,       // Superset/circuit grouping
  warmupSets: number,
  workingSets: number,
  reps: string,              // Can be range like "8-10"
  targetLoad: string,        // e.g., "185 lbs", "70% 1RM", "bodyweight"
  restSeconds: number,
  notes?: string,
  sets: SetResult[],         // Logged performance data
  skipped?: boolean          // Whether exercise is skipped in current session
}
```

### WorkoutSession

Referenced by session-related tools:

```
{
  id: string,                // Hierarchical ID (week-X-session-Y)
  name: string,
  scheduledDate?: string,    // ISO date
  dayOfWeek?: string,
  warmup?: string[],
  exercises: Exercise[],     // Can be empty for rest/cardio days
  cardio?: CardioBlock,      // Optional cardio component
  notes?: string,
  startedAt?: string,
  completed: boolean,
  completedDate?: string,
  duration?: number,
  rating?: number
}
```

### Week

Referenced by week-related tools:

```
{
  id: string,                // week-X
  weekNumber: number,        // 1-based
  phase: string,             // e.g., "Accumulation", "Deload"
  startDate: string,         // ISO date
  endDate: string,           // ISO date
  description?: string,
  sessions: WorkoutSession[]
}
```

---

## Phase 1: Tool Definitions

### Available Tools

#### 1. modify_exercise

**Purpose**: Update properties of a specific exercise

**Parameters**:
```
{
  weekNumber: number,        // 1-based week index
  sessionNumber: number,     // 1-based session index within week
  exerciseNumber: number,    // 1-based exercise index within session
  updates: {
    name?: string,           // Exercise name
    reps?: string,           // Target reps (e.g., "8-10")
    targetLoad?: string,     // Target load (e.g., "185 lbs", "70%")
    workingSets?: number,    // Number of working sets
    warmupSets?: number,     // Number of warmup sets
    restSeconds?: number,    // Rest period between sets
    notes?: string,          // Exercise notes/instructions
    groupLabel?: string      // Superset/circuit grouping
    skipped?: boolean        // Is this exercise skipped in the current session?
  }
}
```

**Validation Rules**:
- weekNumber must reference existing week
- sessionNumber must reference existing session in that week
- exerciseNumber must reference existing exercise in that session
- At least one field in `updates` must be provided
- workingSets/warmupSets must be >= 0 if provided
- restSeconds must be >= 0 if provided

**Example**:
```json
{
  "weekNumber": 2,
  "sessionNumber": 1,
  "exerciseNumber": 3,
  "updates": {
    "name": "Goblet Squat",
    "targetLoad": "50 lbs"
  }
}
```

---

#### 2. remove_exercise

**Purpose**: Delete an exercise from a session

**Parameters**:
```
{
  weekNumber: number,        // 1-based week index
  sessionNumber: number,     // 1-based session index
  exerciseNumber: number     // 1-based exercise index
}
```

**Validation Rules**:
- All numbers must reference existing items
- No restriction on minimum exercises (sessions can have zero exercises for rest/cardio days)

**Side Effects**:
- Exercises after deleted one are renumbered
- Exercise IDs regenerated to maintain sequential numbering

---

#### 3. add_exercise

**Purpose**: Insert a new exercise into a session

**Parameters**:
```
{
  weekNumber: number,        // 1-based week index
  sessionNumber: number,     // 1-based session index
  position: number | "end",  // Where to insert (1-based index or "end")
  exercise: {
    name: string,            // Required
    reps: string,            // Required (e.g., "8-10")
    targetLoad: string,      // Required (e.g., "135 lbs")
    workingSets: number,     // Required
    warmupSets: number,      // Default: 0
    restSeconds: number,     // Default: 120
    notes?: string,
    groupLabel?: string
  }
}
```

**Validation Rules**:
- Week and session must exist
- position must be valid index (1 to existing count + 1) or "end"
- Exercise name, reps, targetLoad, workingSets are required

**Side Effects**:
- Exercises at/after insertion point are renumbered
- New exercise gets proper hierarchical ID

---

#### 4. remove_session

**Purpose**: Delete an entire workout session from a week

**Parameters**:
```
{
  weekNumber: number,        // 1-based week index
  sessionNumber: number      // 1-based session index
}
```

**Validation Rules**:
- Week and session must exist
- Week must have at least one session remaining after deletion

**Side Effects**:
- Sessions after deleted one are renumbered
- All session and child exercise IDs regenerated

---

#### 5. add_session

**Purpose**: Add a new workout session to a week

**Parameters**:
```
{
  weekNumber: number,        // 1-based week index
  position: number | "end",  // Where to insert
  session: {
    name: string,            // Required (e.g., "Upper Body A", "Rest", "Zone 2 Cardio")
    exercises: Exercise[],   // Can be empty for rest/cardio-only days
    scheduledDate?: string,  // ISO date string
    dayOfWeek?: string,      // e.g., "Monday"
    warmup?: string[],       // Warmup activities
    cardio?: CardioBlock,    // Optional cardio block for cardio-focused sessions
    notes?: string
  }
}
```

**Validation Rules**:
- Week must exist
- position must be valid
- session.name is required
- session.exercises can be empty array (for rest/cardio days)
- If cardio block provided, must have valid type and duration

**Side Effects**:
- Sessions at/after insertion point renumbered
- All IDs for new session and exercises generated

**Note**: Sessions can represent different day types:
- Strength training: exercises array populated, cardio optional
- Cardio-only: exercises array empty, cardio block provided
- Rest: exercises array empty, no cardio block

---

#### 6. modify_session

**Purpose**: Update session-level properties (name, schedule, notes, cardio)

**Parameters**:
```
{
  weekNumber: number,
  sessionNumber: number,
  updates: {
    name?: string,
    scheduledDate?: string,
    dayOfWeek?: string,
    warmup?: string[],
    cardio?: CardioBlock,    // Add, update, or remove cardio block
    notes?: string
  }
}
```

**Validation Rules**:
- Week and session must exist
- At least one update field required
- scheduledDate must be valid ISO string if provided
- cardio block must have valid type and duration if provided

**Note**: To remove cardio block, pass `cardio: null`

---

#### 7. reorder_exercises

**Purpose**: Change exercise order within a session

**Parameters**:
```
{
  weekNumber: number,
  sessionNumber: number,
  exerciseNumber: number,    // Exercise to move
  newPosition: number        // Where to move it (1-based)
}
```

**Validation Rules**:
- All references must exist
- newPosition must be valid (1 to exercise count)
- newPosition != exerciseNumber (no-op)

**Side Effects**:
- Exercise IDs renumbered to reflect new order

---

#### 8. copy_session

**Purpose**: Duplicate a session within the same or different week

**Parameters**:
```
{
  sourceWeekNumber: number,
  sourceSessionNumber: number,
  targetWeekNumber: number,
  position: number | "end"
}
```

**Validation Rules**:
- Source week and session must exist
- Target week must exist
- position must be valid in target week

**Side Effects**:
- Creates deep copy of session with new IDs
- Sessions at/after insertion point renumbered

---

#### 9. modify_week

**Purpose**: Update week-level properties

**Parameters**:
```
{
  weekNumber: number,
  updates: {
    phase?: string,          // e.g., "Accumulation", "Deload"
    startDate?: string,      // ISO date
    endDate?: string,        // ISO date
    description?: string
  }
}
```

**Validation Rules**:
- Week must exist
- At least one update field required
- Dates must be valid ISO strings if provided

---

#### 10. add_week

**Purpose**: Add one or more complete weeks to the program

**Parameters**:
```
{
  position: number | "end",  // Where to insert (1-based week number or "end")
  weeks: Week[]              // Array of complete week objects to insert
}
```

**Week Structure**:
```
{
  weekNumber: number,        // Will be renumbered based on insertion position
  phase: string,             // e.g., "Hypertrophy", "Strength", "Deload"
  startDate: string,         // ISO date
  endDate: string,           // ISO date
  description?: string,
  sessions: WorkoutSession[] // Array of sessions (can include rest/cardio days)
}
```

**Validation Rules**:
- position must be valid (1 to current week count + 1) or "end"
- weeks array must contain at least one week
- Each week must have valid phase, startDate, endDate
- Each week's sessions must have valid structure (per add_session rules)

**Side Effects**:
- Weeks at/after insertion point are renumbered
- All week, session, and exercise IDs regenerated for affected weeks
- New weeks get proper sequential week numbers

**Use Cases**:
- User starting program from scratch: add multiple weeks at once
- User traveling and wants to add a new training block
- Coach building out a multi-week periodized program
- Adding deload weeks or specialization phases

**Note**: This is an "expensive" operation in terms of LLM token usage, but valuable for major program changes. For single-week additions, consider using multiple add_session calls instead.

---

#### 11. remove_week

**Purpose**: Remove an entire week from the program

**Parameters**:
```
{
  weekNumber: number         // 1-based week index
}
```

**Validation Rules**:
- Week must exist
- Program must have at least one week remaining after deletion

**Side Effects**:
- Weeks after deleted one are renumbered
- All week, session, and exercise IDs regenerated for affected weeks

---

## Phase 2: LLM Integration

### Tool Schema Format

Tools are passed to the LLM using the OpenRouter/Anthropic tool calling format:

```
Tool Definition Schema:
{
  name: string,              // Tool function name
  description: string,       // What the tool does (guides LLM usage)
  input_schema: {            // JSON Schema for parameters
    type: "object",
    properties: { ... },
    required: [ ... ]
  }
}
```

### LLM Request Structure

```
POST to OpenRouter API:
{
  model: "anthropic/claude-haiku-4.5",
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: "Replace squats with lunges" },
    ...conversationHistory
  ],
  tools: [
    { name: "modify_exercise", description: "...", input_schema: {...} },
    { name: "add_exercise", description: "...", input_schema: {...} },
    ...allToolDefinitions
  ]
}
```

### LLM Response Formats

#### Response Without Tool Calls (Informational)

```
{
  role: "assistant",
  content: "Romanian Deadlifts target your hamstrings and glutes. Start with the bar at hip height...\n---\nThanks!\nShow me a video\nWhat about form cues?"
}
```

#### Response With Tool Calls (Modification Intent)

```
{
  role: "assistant",
  content: "I can replace Barbell Squats with Lunges in today's workout. This will still target your quads and glutes. Should I make this change?\n---\nYes, do it\nWhat's the difference?\nSuggest something else",
  tool_calls: [
    {
      id: "call_abc123",
      type: "function",
      function: {
        name: "modify_exercise",
        arguments: "{\"weekNumber\":2,\"sessionNumber\":1,\"exerciseNumber\":1,\"updates\":{\"name\":\"Lunges\",\"targetLoad\":\"bodyweight\"}}"
      }
    }
  ]
}
```

**Important**: When tool_calls are present, the LLM:
1. Explains what it wants to do in `content`
2. Provides suggested replies for user to confirm/deny
3. Includes structured tool calls but does NOT execute them
4. Waits for user confirmation before execution

### Multi-Tool Responses

LLM can return multiple tool calls in one response:

```
{
  role: "assistant",
  content: "I'll replace Squats with Lunges and add an extra set since you're feeling strong today. Sound good?\n---\nYes, perfect\nJust do the replacement\nNever mind",
  tool_calls: [
    {
      id: "call_1",
      function: {
        name: "modify_exercise",
        arguments: "{\"weekNumber\":2,\"sessionNumber\":1,\"exerciseNumber\":1,\"updates\":{\"name\":\"Lunges\"}}"
      }
    },
    {
      id: "call_2",
      function: {
        name: "modify_exercise",
        arguments: "{\"weekNumber\":2,\"sessionNumber\":1,\"exerciseNumber\":1,\"updates\":{\"workingSets\":5}}"
      }
    }
  ]
}
```

---

## Phase 3: Tool Confirmation UX

### Confirmation Flow

```
Pseudocode: handleLLMResponse(response)

  IF response has NO tool_calls:
    // Simple informational response
    displayCoachMessage(response.content)
    showSuggestedReplies(extractReplies(response.content))
    return

  IF response has tool_calls:
    // Modification intent - requires confirmation
    parsedMessage = extractMessageWithoutSuggestions(response.content)
    suggestedReplies = extractSuggestedReplies(response.content)

    // Store tool calls in state for later execution
    setPendingToolCalls(response.tool_calls)

    // Display coach message explaining what will change
    displayCoachMessage(parsedMessage)

    // Show preview of modifications
    displayModificationPreview(response.tool_calls)

    // Show suggested replies (should include confirm/deny options)
    showSuggestedReplies(suggestedReplies)

    // Wait for user response
```

### Modification Preview Component

**Purpose**: Show user exactly what will change before they confirm

**Data Model**:
```
ModificationPreview:
{
  toolCalls: ToolCall[],
  summary: string          // Human-readable summary
  details: PreviewItem[]   // Individual change details
}

PreviewItem:
{
  type: "modify" | "add" | "remove" | "reorder",
  target: string,          // What's being changed (e.g., "Week 2, Session 1, Exercise 3")
  before?: string,         // Current state (for modifications)
  after?: string,          // New state (for modifications/additions)
  fields?: FieldChange[]   // Detailed field-by-field changes
}

FieldChange:
{
  field: string,           // e.g., "name", "reps", "targetLoad"
  oldValue: any,
  newValue: any
}
```

**Pseudocode: buildModificationPreview(toolCalls, workoutData)**:
```
preview = {
  toolCalls: toolCalls,
  summary: "",
  details: []
}

FOR EACH toolCall in toolCalls:
  SWITCH toolCall.function.name:

    CASE "modify_exercise":
      params = parseJSON(toolCall.function.arguments)
      exercise = findExercise(workoutData, params)

      detail = {
        type: "modify",
        target: `Week ${params.weekNumber}, Session ${params.sessionNumber}, Exercise ${params.exerciseNumber}: ${exercise.name}`,
        fields: []
      }

      FOR EACH (field, newValue) in params.updates:
        oldValue = exercise[field]
        IF oldValue != newValue:
          detail.fields.push({
            field: field,
            oldValue: oldValue,
            newValue: newValue
          })

      preview.details.push(detail)

    CASE "add_exercise":
      params = parseJSON(toolCall.function.arguments)
      session = findSession(workoutData, params)

      detail = {
        type: "add",
        target: `Week ${params.weekNumber}, Session ${params.sessionNumber}`,
        after: `${params.exercise.name} - ${params.exercise.workingSets} sets × ${params.exercise.reps} @ ${params.exercise.targetLoad}`
      }

      preview.details.push(detail)

    CASE "remove_exercise":
      params = parseJSON(toolCall.function.arguments)
      exercise = findExercise(workoutData, params)

      detail = {
        type: "remove",
        target: `Week ${params.weekNumber}, Session ${params.sessionNumber}, Exercise ${params.exerciseNumber}`,
        before: exercise.name
      }

      preview.details.push(detail)

    // ... similar patterns for other tools

preview.summary = generateSummary(preview.details)
RETURN preview
```

### User Confirmation Handling

**Principle**: Confirmation of tool calls happens explicitly via UI interaction, NOT through message content. Any user message while tool calls are pending is treated as continuing the conversation.

```
Pseudocode: handleLLMResponseWithToolCalls(response)

  // LLM returned tool calls - show modification preview
  pendingToolCalls = response.tool_calls
  coachMessage = extractMessageWithoutSuggestions(response.content)
  suggestedReplies = extractSuggestedReplies(response.content)

  // Build preview of what will change
  preview = buildModificationPreview(pendingToolCalls, workoutData)

  // Update UI state
  displayCoachMessage(coachMessage)
  displayModificationPreview(preview)

  // Show explicit confirmation UI (not suggested replies)
  showConfirmationDialog({
    confirmButton: "Apply Changes",
    cancelButton: "Cancel",
    onConfirm: () => handleToolConfirmation(pendingToolCalls),
    onCancel: () => handleToolCancellation()
  })

  // If user sends a message while confirmation dialog is showing
  // Treat it as continuing the conversation, NOT as confirmation
  IF userSendsMessage(message):
    // Keep tool calls pending
    // Send message to LLM to continue conversation
    // User can still confirm/cancel later via buttons
    sendMessageToLLM(message, { pendingToolCalls: pendingToolCalls })
```

**Explicit Confirmation Flow**:
```
Function handleToolConfirmation(toolCalls):
  // User clicked "Apply Changes" button

  TRY:
    result = executeToolCalls(toolCalls, workoutData)

    IF result.success:
      // All tools executed successfully
      clearPendingToolCalls()
      hideConfirmationDialog()

      // Send confirmation to LLM so it can acknowledge
      sendMessageToLLM("I applied the changes", {
        toolResults: result.results
      })

      // LLM responds with acknowledgment
      // E.g., "Done! I've replaced Squats with Lunges."

    ELSE:
      // Some tools failed
      showError(buildErrorMessage(result.results))
      // Keep confirmation dialog visible
      // Keep tool calls pending so user can try again

  CATCH error:
    showError("Failed to apply changes: " + error.message)
    // Keep confirmation dialog visible


Function handleToolCancellation():
  // User clicked "Cancel" button

  clearPendingToolCalls()
  hideConfirmationDialog()

  // Send cancellation to LLM to continue conversation
  sendMessageToLLM("I decided not to make those changes")

  // LLM responds acknowledging cancellation
  // E.g., "No problem! Let me know if you want to try something else."
```

**UI Components**:
```
ConfirmationDialog:
  - Preview panel showing what will change
  - Two explicit buttons:
    - "Apply Changes" (primary action, green/blue)
    - "Cancel" (secondary action, gray)
  - Suggested replies are HIDDEN while confirmation dialog is showing
  - Message input is ENABLED (user can ask questions)

Behavior:
  - Dialog appears when LLM returns tool calls
  - Dialog persists until user clicks a button (not dismissible by clicking outside)
  - If user sends a message, dialog stays visible
  - Only "Apply Changes" or "Cancel" buttons dismiss the dialog
```

**Key Differences from Message-Based Confirmation**:

1. **Explicit Action Required**: User must click a button, not type a message
2. **Conversation Can Continue**: User can ask "What's a goblet squat?" while preview is visible
3. **No Ambiguity**: No pattern matching on message text to detect intent
4. **All-or-Nothing**: User approves all pending tool calls or none (simplicity)
5. **Visual Clarity**: Preview always visible until user takes action

**Example Flow**:
```
User: "Replace squats with lunges"
LLM: Returns tool_call for modify_exercise + message "I can replace..."

UI Shows:
  ┌─────────────────────────────────────┐
  │ Coach: I can replace Barbell Squats │
  │ with Lunges in today's workout.     │
  │                                     │
  │ ┌─ Changes Preview ────────────────┐│
  │ │ Week 2, Session 1, Exercise 1   ││
  │ │ Name: Squats → Lunges           ││
  │ │ Target Load: 185 lbs → bodyweight││
  │ └─────────────────────────────────┘│
  │                                     │
  │ [Apply Changes] [Cancel]            │
  │                                     │
  │ Message input: (enabled)            │
  └─────────────────────────────────────┘

User can:
  A) Click "Apply Changes" → Tools execute, dialog dismisses
  B) Click "Cancel" → Tools discarded, dialog dismisses
  C) Type "What's the difference?" → Message sent to LLM, dialog stays visible

If user chooses C:
  - Conversation continues
  - Tool calls remain pending
  - Preview and buttons stay visible
  - User can still click "Apply Changes" or "Cancel" later
```

---

## Phase 4: Tool Execution

### Validation Before Execution

```
Pseudocode: validateToolCall(toolCall, workoutData)

  params = parseJSON(toolCall.function.arguments)
  errors = []

  SWITCH toolCall.function.name:

    CASE "modify_exercise":
      // Validate week exists
      week = findWeekByNumber(workoutData, params.weekNumber)
      IF NOT week:
        errors.push(`Week ${params.weekNumber} does not exist`)
        BREAK

      // Validate session exists
      session = findSessionByNumber(week, params.sessionNumber)
      IF NOT session:
        errors.push(`Session ${params.sessionNumber} does not exist in Week ${params.weekNumber}`)
        BREAK

      // Validate exercise exists
      exercise = findExerciseByNumber(session, params.exerciseNumber)
      IF NOT exercise:
        errors.push(`Exercise ${params.exerciseNumber} does not exist in this session`)
        BREAK

      // Validate update fields
      IF params.updates is empty:
        errors.push("No updates provided")

      IF params.updates.workingSets AND params.updates.workingSets < 0:
        errors.push("workingSets cannot be negative")

      // ... similar validation for other fields

    CASE "add_exercise":
      week = findWeekByNumber(workoutData, params.weekNumber)
      IF NOT week:
        errors.push(`Week ${params.weekNumber} does not exist`)
        BREAK

      session = findSessionByNumber(week, params.sessionNumber)
      IF NOT session:
        errors.push(`Session ${params.sessionNumber} does not exist`)
        BREAK

      // Validate required exercise fields
      IF NOT params.exercise.name:
        errors.push("Exercise name is required")
      IF NOT params.exercise.reps:
        errors.push("Exercise reps is required")
      // ... etc

      // Validate position
      IF params.position != "end" AND (params.position < 1 OR params.position > session.exercises.length + 1):
        errors.push(`Invalid position ${params.position}`)

    // ... similar patterns for other tools

  RETURN {
    valid: errors.length == 0,
    errors: errors
  }
```

### Execution Functions

#### modify_exercise

```
Pseudocode: executeModifyExercise(workoutData, params)

  // Clone data for immutability
  updatedData = deepClone(workoutData)

  // Navigate to target exercise
  week = findWeekByNumber(updatedData, params.weekNumber)
  session = findSessionByNumber(week, params.sessionNumber)
  exercise = findExerciseByNumber(session, params.exerciseNumber)

  // Apply updates (merge)
  FOR EACH (field, value) in params.updates:
    exercise[field] = value

  RETURN updatedData
```

#### add_exercise

```
Pseudocode: executeAddExercise(workoutData, params)

  updatedData = deepClone(workoutData)
  week = findWeekByNumber(updatedData, params.weekNumber)
  session = findSessionByNumber(week, params.sessionNumber)

  // Create new exercise with proper ID
  insertPosition = (params.position == "end") ? session.exercises.length : params.position - 1
  exerciseNumber = insertPosition + 1

  newExercise = {
    id: createExerciseId(params.weekNumber, params.sessionNumber, exerciseNumber),
    name: params.exercise.name,
    reps: params.exercise.reps,
    targetLoad: params.exercise.targetLoad,
    workingSets: params.exercise.workingSets,
    warmupSets: params.exercise.warmupSets || 0,
    restSeconds: params.exercise.restSeconds || 180,
    notes: params.exercise.notes,
    groupLabel: params.exercise.groupLabel,
    sets: [],  // No logged sets yet
    skipped: false
  }

  // Insert exercise
  session.exercises.splice(insertPosition, 0, newExercise)

  // Renumber subsequent exercises
  FOR i from (insertPosition + 1) to session.exercises.length - 1:
    exercise = session.exercises[i]
    newNumber = i + 1
    exercise.id = createExerciseId(params.weekNumber, params.sessionNumber, newNumber)

  RETURN updatedData
```

#### remove_exercise

```
Pseudocode: executeRemoveExercise(workoutData, params)

  updatedData = deepClone(workoutData)
  week = findWeekByNumber(updatedData, params.weekNumber)
  session = findSessionByNumber(week, params.sessionNumber)

  // Validate not removing last exercise
  IF session.exercises.length <= 1:
    THROW error("Cannot remove last exercise from session")

  // Remove exercise
  removeIndex = params.exerciseNumber - 1
  session.exercises.splice(removeIndex, 1)

  // Renumber remaining exercises
  FOR i from removeIndex to session.exercises.length - 1:
    exercise = session.exercises[i]
    newNumber = i + 1
    exercise.id = createExerciseId(params.weekNumber, params.sessionNumber, newNumber)

  RETURN updatedData
```

#### add_session

```
Pseudocode: executeAddSession(workoutData, params)

  updatedData = deepClone(workoutData)
  week = findWeekByNumber(updatedData, params.weekNumber)

  insertPosition = (params.position == "end") ? week.sessions.length : params.position - 1
  sessionNumber = insertPosition + 1

  // Create new session with proper ID
  newSession = {
    id: createSessionId(params.weekNumber, sessionNumber),
    name: params.session.name,
    scheduledDate: params.session.scheduledDate,
    dayOfWeek: params.session.dayOfWeek,
    warmup: params.session.warmup || [],
    exercises: [],
    notes: params.session.notes,
    startedAt: null,
    completed: false,
    completedDate: null,
    duration: null,
    rating: null
  }

  // Create exercises with proper IDs
  FOR i from 0 to params.session.exercises.length - 1:
    exerciseData = params.session.exercises[i]
    exerciseNumber = i + 1

    newExercise = {
      id: createExerciseId(params.weekNumber, sessionNumber, exerciseNumber),
      ...exerciseData,
      sets: [],
      skipped: false
    }

    newSession.exercises.push(newExercise)

  // Insert session
  week.sessions.splice(insertPosition, 0, newSession)

  // Renumber subsequent sessions and all their exercises
  FOR i from (insertPosition + 1) to week.sessions.length - 1:
    session = week.sessions[i]
    newSessionNumber = i + 1
    session.id = createSessionId(params.weekNumber, newSessionNumber)

    FOR j from 0 to session.exercises.length - 1:
      exercise = session.exercises[j]
      exerciseNumber = j + 1
      exercise.id = createExerciseId(params.weekNumber, newSessionNumber, exerciseNumber)

  RETURN updatedData
```

#### remove_session

```
Pseudocode: executeRemoveSession(workoutData, params)

  updatedData = deepClone(workoutData)
  week = findWeekByNumber(updatedData, params.weekNumber)

  // Validate not removing last session
  IF week.sessions.length <= 1:
    THROW error("Cannot remove last session from week")

  // Remove session
  removeIndex = params.sessionNumber - 1
  week.sessions.splice(removeIndex, 1)

  // Renumber remaining sessions and exercises
  FOR i from removeIndex to week.sessions.length - 1:
    session = week.sessions[i]
    newSessionNumber = i + 1
    session.id = createSessionId(params.weekNumber, newSessionNumber)

    FOR j from 0 to session.exercises.length - 1:
      exercise = session.exercises[j]
      exerciseNumber = j + 1
      exercise.id = createExerciseId(params.weekNumber, newSessionNumber, exerciseNumber)

  RETURN updatedData
```

### Multi-Tool Execution

```
Pseudocode: executeToolCalls(toolCalls, workoutData)

  updatedData = workoutData
  executionResults = []

  FOR EACH toolCall in toolCalls:
    TRY:
      // Validate first
      validation = validateToolCall(toolCall, updatedData)

      IF NOT validation.valid:
        executionResults.push({
          toolCallId: toolCall.id,
          success: false,
          errors: validation.errors
        })
        CONTINUE  // Skip execution, move to next tool

      // Execute
      SWITCH toolCall.function.name:
        CASE "modify_exercise":
          params = parseJSON(toolCall.function.arguments)
          updatedData = executeModifyExercise(updatedData, params)

        CASE "add_exercise":
          params = parseJSON(toolCall.function.arguments)
          updatedData = executeAddExercise(updatedData, params)

        CASE "remove_exercise":
          params = parseJSON(toolCall.function.arguments)
          updatedData = executeRemoveExercise(updatedData, params)

        CASE "add_session":
          params = parseJSON(toolCall.function.arguments)
          updatedData = executeAddSession(updatedData, params)

        CASE "remove_session":
          params = parseJSON(toolCall.function.arguments)
          updatedData = executeRemoveSession(updatedData, params)

        // ... other tools

      executionResults.push({
        toolCallId: toolCall.id,
        success: true
      })

    CATCH error:
      executionResults.push({
        toolCallId: toolCall.id,
        success: false,
        errors: [error.message]
      })

  // Check if all succeeded
  allSucceeded = executionResults.every(r => r.success)

  IF allSucceeded:
    // Persist to localStorage
    saveWeeks(updatedData)

    RETURN {
      success: true,
      data: updatedData,
      results: executionResults
    }
  ELSE:
    // Don't persist if any failed
    RETURN {
      success: false,
      data: workoutData,  // Return original unchanged
      results: executionResults
    }
```

---

## Phase 5: Error Handling

### Validation Errors

**When**: Before execution
**Action**: Show user-friendly error, don't execute, keep conversation going

```
Example Error Responses:

{
  type: "validation_error",
  message: "I couldn't make that change because Exercise 5 doesn't exist in that session. The session only has 4 exercises.",
  suggestedReplies: [
    "Try a different exercise",
    "Show me the session",
    "Never mind"
  ]
}
```

### Execution Errors

**When**: During execution (unexpected failures)
**Action**: Log error, rollback changes, inform user

```
Pseudocode: handleExecutionError(error, toolCall)

  // Log for debugging
  console.error("Tool execution failed:", error, toolCall)

  // Build user-friendly message
  userMessage = "Something went wrong while making that change. "

  IF error.message includes "Cannot remove last":
    userMessage += "I can't remove the last exercise/session because each session/week needs at least one."
  ELSE:
    userMessage += "The change couldn't be applied. Please try again or ask me to do something different."

  RETURN {
    type: "execution_error",
    message: userMessage,
    technicalDetails: error.message,  // For debugging
    suggestedReplies: [
      "Try again",
      "Never mind",
      "Show me what's there"
    ]
  }
```

### Partial Failure in Multi-Tool Execution

**When**: Some tools succeed, others fail
**Action**: Rollback all changes, report which failed

```
Example:

User asks to "replace squats with lunges and add a set to bench press"

Tool calls:
1. modify_exercise (squats → lunges) ✓ validates
2. modify_exercise (bench press sets) ✗ fails (bench press doesn't exist)

Result: Neither change is applied

Response to user:
"I couldn't make those changes because I couldn't find the bench press exercise. The squat replacement wasn't applied either since I tried to make both changes together. Would you like me to just replace the squats?"

Suggested replies:
- "Yes, just do the squats"
- "Show me the exercises"
- "Never mind"
```

### LLM Malformed Responses

**When**: LLM returns invalid tool call format
**Action**: Graceful degradation, ask for clarification

```
Pseudocode: handleMalformedToolCall(toolCall)

  IF toolCall.function.arguments is not valid JSON:
    RETURN {
      type: "parse_error",
      message: "I had trouble understanding that request. Can you rephrase what you'd like me to change?",
      suggestedReplies: ["Start over", "Show me my workouts"]
    }

  params = parseJSON(toolCall.function.arguments)

  IF missing required parameters:
    RETURN {
      type: "missing_params",
      message: "I need more information to make that change. Which exercise did you want to modify?",
      suggestedReplies: ["Exercise 1", "Exercise 2", "Never mind"]
    }
```

---

## Phase 6: Tool Result Feedback to LLM

### Success Feedback

After successful execution, send result back to LLM so it can acknowledge:

```
Pseudocode: sendToolResultToLLM(executionResults)

  // Build tool result messages for LLM
  toolResultMessages = []

  FOR EACH result in executionResults:
    IF result.success:
      toolResultMessages.push({
        type: "tool_result",
        tool_use_id: result.toolCallId,
        content: "Success"
      })
    ELSE:
      toolResultMessages.push({
        type: "tool_result",
        tool_use_id: result.toolCallId,
        content: `Error: ${result.errors.join(", ")}`,
        is_error: true
      })

  // Send to LLM in next request
  conversationHistory.push({
    role: "user",
    content: toolResultMessages
  })

  // LLM will respond with acknowledgment
  // E.g., "Done! I've replaced Squats with Lunges."
```

### Anthropic Tool Result Format

```
Message format when sending tool results:

{
  role: "user",
  content: [
    {
      type: "tool_result",
      tool_use_id: "call_abc123",
      content: "Success"  // or error message
    }
  ]
}
```

The LLM uses this to:
1. Know the tool executed successfully
2. Craft appropriate acknowledgment message
3. Continue conversation with context of what changed

---

## Phase 7: Multi-Tool Orchestration

### Dependent Tool Calls

Some modifications require specific ordering:

**Example**: "Remove the first exercise and add a new one at the start"

```
Correct order:
1. remove_exercise (exerciseNumber: 1)
   → Remaining exercises get renumbered (old #2 becomes #1, etc.)
2. add_exercise (position: 1)
   → New exercise becomes #1, others shift down

Wrong order:
1. add_exercise (position: 1)
   → New exercise is #1, original #1 becomes #2
2. remove_exercise (exerciseNumber: 1)
   → Removes the NEW exercise, not the original!
```

**Handling**:
- LLM should generate tools in correct order
- Execution happens sequentially in order provided
- If LLM gets it wrong, validation/execution will catch it and error

### Conflicting Tool Calls

**Example**: Modify same exercise twice in one response

```
Tool calls:
1. modify_exercise (ex 1: reps → "10-12")
2. modify_exercise (ex 1: reps → "8-10")

Result: Second call overwrites first (last one wins)
```

**Detection**:
```
Pseudocode: detectConflicts(toolCalls)

  conflicts = []
  targets = new Map()  // key: target identifier, value: tool call

  FOR EACH toolCall in toolCalls:
    targetId = buildTargetIdentifier(toolCall)

    IF targets.has(targetId):
      conflicts.push({
        toolCall1: targets.get(targetId),
        toolCall2: toolCall,
        target: targetId
      })
    ELSE:
      targets.set(targetId, toolCall)

  RETURN conflicts

Function buildTargetIdentifier(toolCall):
  params = parseJSON(toolCall.function.arguments)

  SWITCH toolCall.function.name:
    CASE "modify_exercise", "remove_exercise":
      RETURN `w${params.weekNumber}-s${params.sessionNumber}-e${params.exerciseNumber}`

    CASE "modify_session", "remove_session":
      RETURN `w${params.weekNumber}-s${params.sessionNumber}`

    CASE "modify_week":
      RETURN `w${params.weekNumber}`

    // add_* tools don't conflict (adding different items)
    DEFAULT:
      RETURN `${toolCall.id}`  // Unique per tool call
```

**Handling Conflicts**:
- Warn user: "I noticed you're modifying the same exercise twice. I'll apply both changes in order."
- OR: Merge the updates if they're compatible
- Let execution proceed (last wins)

---

## Implementation Checklist

### Phase 1: Tool Definitions
- [ ] Define all 11 tool schemas in code (including add_week and remove_week)
- [ ] Document each tool's parameters and validation rules
- [ ] Create TypeScript types for each tool's parameters
- [ ] Support CardioBlock in add_session and modify_session
- [ ] Support skipped status in modify_exercise

### Phase 2: LLM Integration
- [ ] Convert tool schemas to OpenRouter format
- [ ] Include tools in API requests
- [ ] Parse tool calls from LLM responses
- [ ] Handle responses with and without tool calls

### Phase 3: Tool Confirmation UX
- [ ] Build modification preview component
- [ ] Implement preview generation logic
- [ ] Store pending tool calls in state
- [ ] Build explicit confirmation dialog with "Apply Changes" and "Cancel" buttons
- [ ] Hide suggested replies when confirmation dialog is showing
- [ ] Keep message input enabled during confirmation (allow questions)
- [ ] Handle tool confirmation via button click (not message detection)
- [ ] Handle tool cancellation via button click
- [ ] Keep tool calls pending if user sends message during confirmation
- [ ] Show/hide confirmation dialog based on tool call state

### Phase 4: Tool Execution
- [ ] Implement validation for each tool
- [ ] Implement execution for each tool
- [ ] Handle ID renumbering correctly
- [ ] Test multi-tool execution
- [ ] Ensure immutability (deep cloning)

### Phase 5: Error Handling
- [ ] Validation error messages
- [ ] Execution error handling
- [ ] Partial failure rollback
- [ ] Malformed response handling
- [ ] User-friendly error display

### Phase 6: Tool Result Feedback
- [ ] Send tool results back to LLM
- [ ] Format results in Anthropic tool_result format
- [ ] Test LLM acknowledgment messages

### Phase 7: Multi-Tool Orchestration
- [ ] Test sequential tool execution
- [ ] Detect and handle conflicts
- [ ] Test dependent tool call scenarios
- [ ] Ensure proper ordering

---

## Testing Scenarios

### Basic Single-Tool Tests

1. **Modify exercise name**
   - Ask: "Change squats to lunges"
   - Expected: modify_exercise with name update
   - Validate: Exercise name changed, ID unchanged

2. **Add exercise**
   - Ask: "Add bench press after exercise 2"
   - Expected: add_exercise at position 3
   - Validate: New exercise inserted, subsequent exercises renumbered

3. **Remove exercise**
   - Ask: "Remove the last exercise"
   - Expected: remove_exercise
   - Validate: Exercise removed, no renumbering needed

4. **Modify session**
   - Ask: "Rename this workout to 'Push Day A'"
   - Expected: modify_session with name update
   - Validate: Session name changed

### Multi-Tool Tests

5. **Replace and modify**
   - Ask: "Change squats to lunges and increase reps to 12"
   - Expected: Two modify_exercise calls OR one with both updates
   - Validate: Both changes applied

6. **Remove and add**
   - Ask: "Replace the first exercise with pull-ups"
   - Expected: remove_exercise #1, add_exercise at position 1
   - Validate: Exercise replaced, IDs correct

### New Tool Tests

7. **Add week**
   - Ask: "Add a deload week after week 4"
   - Expected: add_week with deload structure
   - Validate: New week inserted, subsequent weeks renumbered

8. **Mark exercise as skipped**
   - Ask: "I can't do squats today, skip that exercise"
   - Expected: modify_exercise with skipped: true
   - Validate: Exercise marked as skipped

9. **Add cardio-only session**
   - Ask: "Add a 30-minute zone 2 cardio day on Saturday"
   - Expected: add_session with empty exercises, cardio block
   - Validate: Session created with cardio block, no exercises

10. **Add rest day**
    - Ask: "Make Sunday a rest day"
    - Expected: add_session with empty exercises, no cardio
    - Validate: Session created with no exercises or cardio

### Error Tests

11. **Invalid reference**
    - Ask: "Remove exercise 10" (only 4 exercises exist)
    - Expected: Validation error
    - Validate: Error message shown, no changes made

12. **Malformed parameters**
    - Simulate LLM returning invalid JSON
    - Expected: Parse error, graceful fallback
    - Validate: User sees helpful message

### Explicit Confirmation Tests

13. **User clicks "Apply Changes"**
    - Tool call returned → Preview shown → User clicks "Apply Changes" button
    - Expected: Tools execute, dialog dismisses
    - Validate: Changes applied, confirmation sent to LLM

14. **User clicks "Cancel"**
    - Tool call returned → Preview shown → User clicks "Cancel" button
    - Expected: Tools cleared, no execution, dialog dismisses
    - Validate: No changes made, cancellation sent to LLM

15. **User sends message during confirmation**
    - Tool call returned → Preview shown → User types "what's a goblet squat?"
    - Expected: Message sent to LLM, tools remain pending, dialog stays visible
    - Validate: Conversation continues, tools still pending, user can still confirm/cancel

16. **User sends message then confirms**
    - Tool call returned → User asks question → LLM responds → User clicks "Apply Changes"
    - Expected: Tools execute despite intermediate conversation
    - Validate: Changes applied correctly

17. **Confirmation after error**
    - Tool fails → Error shown → User clicks "Apply Changes" again
    - Expected: Retry execution
    - Validate: Can retry after failure

---

## Notes

### General Principles

- All tool execution must be **idempotent within a single execution** (applying same tool twice with same params = same result)
- Tool calls operate on **1-based indexing** for human readability (weekNumber 1, not 0)
- IDs must be **regenerated after any insertion/deletion** to maintain sequential numbering
- **Deep clone** workout data before any modifications to ensure immutability
- Always **validate before executing** - never trust LLM parameters
- **Rollback all changes** if any tool in a multi-tool execution fails
- Send **tool results back to LLM** so it can acknowledge changes

### Special Capabilities

- **Rest days**: Sessions can have empty exercises array with no cardio block (pure rest)
- **Cardio-only days**: Sessions can have empty exercises array with cardio block
- **Skipped exercises**: Exercises can be marked as skipped without being removed (preserves program structure)
- **Multi-week operations**: add_week tool allows adding multiple weeks at once for major program changes
- **Explicit confirmation**: All modifications require user to click "Apply Changes" button - messages during confirmation continue conversation without executing

### Confirmation Flow Notes

- User can ask questions while tool calls are pending
- All tool calls from the conversation are added to a queue
- Conversation history is maintained across confirmation dialog
- "Apply all" attempts to sequentially apply all tool calls in the queue
- LLM receives tool results only after explicit confirmation
- "Cancel" button clears all pending tools and sends cancellation message to LLM
