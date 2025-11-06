# AI-Powered Program Builder - Work Plan

## 🎉 Status: Phases 1-4 COMPLETE! (Ready for Testing)

**What's Working:**
- ✅ Questionnaire with friendly UX (2-4 week limit, helpful descriptions)
- ✅ AI conversation builder (asks questions, proposes program structure)
- ✅ Real-time chat with WebSocket + HTTP fallback
- ✅ JSON-based program creation (no complex tool execution needed)
- ✅ Automatic redirect to new program

**What's Next:**
- ⏸️ Phase 5: Polish (error handling, mobile testing, accessibility)

---

## Overview

Replace the simple "New Program" button with an AI-powered program builder that guides users through creating a customized workout program using conversational AI and real-time streaming.

**Current Flow:**
```
User clicks "New Program"
  → Creates program with sample data
  → Switches to it
```

**New Flow:**
```
User clicks "New Program"
  → Simple questionnaire (duration, goal, experience, etc.)
  → AI builder interface (chat with coach to refine)
  → Stream program creation (see weeks/sessions being built)
  → Load into new program + sync to library
```

---

## Design Goals

1. **Simple start** - Quick questionnaire captures basics (like HowItWorks page)
2. **Conversational refinement** - Reuse coach chat logic for iterative program design
3. **Visual feedback** - Stream program creation so users see progress
4. **Seamless integration** - Automatically save and switch to new program

---

## Architecture

### 🎯 KISS/DRY Simplifications

**What we're NOT building (unnecessary complexity):**
- ❌ Custom `useProgramBuilder` hook → just use existing `useChatWebSocket`
- ❌ Custom streaming protocol → AI naturally describes program in chat
- ❌ Separate `ProgramBuilderChat` component → reuse `ChatInterface`
- ❌ New `createProgramWithWeeks` function → extend existing `createProgram`
- ❌ Custom WebSocket message types → use existing tool system
- ❌ Special "mode" switching → just different context/prompt

**What we ARE building (minimal new code):**
- ✅ Questionnaire page (simple form, ~100 lines)
- ✅ Builder page (thin wrapper around `ChatInterface`, ~50 lines)
- ✅ One new tool: `create_workout_program` (~30 lines)
- ✅ Small modification to `createProgram` (add optional `weeks` param, +2 lines)

**Result:** ~200 lines of new code vs ~1000+ in original plan. 80% reduction!

### Reuse Existing Infrastructure

**Already have:**
- ✅ WebSocket chat system (`setupWebSocket`, `useChatWebSocket`)
- ✅ AI service with tool calling (`ai-service.ts`, `chat-handler.ts`)
- ✅ Program creation/switching (`useProgramLibrary`)
- ✅ Streaming message display (`ChatInterface`)
- ✅ HTTP fallback (already works in chat)

**Truly new code:**
- 🆕 Questionnaire form component
- 🆕 Builder page (wrapper)
- 🆕 `create_workout_program` tool

---

## User Flow (Detailed)

### Step 1: Initial Questionnaire

**Trigger:** User clicks "+ New Program" in library

**UI:** Modal or slide-over panel with simple form
```
┌─────────────────────────────────────┐
│  Create New Program                  │
├─────────────────────────────────────┤
│  Duration:          [4 weeks    ▾]  │
│  Sessions/week:     [4          ▾]  │
│  Training goal:     [Hypertrophy ▾] │
│  Experience:        [Intermediate▾]  │
│  Equipment:         [Full gym   ▾]  │
│                                      │
│  Additional notes (optional):        │
│  ┌──────────────────────────────┐   │
│  │                              │   │
│  └──────────────────────────────┘   │
│                                      │
│  [Cancel]           [Next →]        │
└─────────────────────────────────────┘
```

**Fields:**
- Duration: Dropdown (2 weeks, 3 weeks, 4 weeks) - **MAX 4 weeks**
  - Help text: "We'll start with a 4-week program. You can always add more weeks later!"
- Sessions/week: Dropdown (2, 3, 4, 5, 6)
  - Label: "How many days per week can you train?"
- Goal: Dropdown (Strength, Hypertrophy, Conditioning, General Fitness)
  - Strength: "Get stronger on the main lifts (squat, bench, deadlift)"
  - Hypertrophy: "Build muscle size and definition"
  - Conditioning: "Improve endurance and work capacity"
  - General Fitness: "Overall health and athleticism"
- Experience: Dropdown (Beginner, Intermediate, Advanced)
  - Beginner: "Less than 1 year of consistent training"
  - Intermediate: "1-3 years of consistent training"
  - Advanced: "3+ years of consistent training"
- Equipment: Dropdown (Full gym, Home gym, Dumbbells only, Bodyweight)
- Notes: Textarea
  - Label: "Anything else we should know?"
  - Placeholder: "Injuries, exercise preferences, time constraints..."

**Constraint: 4-week maximum**
- Keeps creation fast
- Prevents overwhelming new users with long programs
- Users can easily add more weeks later through conversation
- Messaging: Friendly and encouraging, not restrictive

### Step 2: AI Builder Interface

**Trigger:** User clicks "Next" on questionnaire

**UI:** Full-page chat interface dedicated to program building
```
┌─────────────────────────────────────┐
│  ← Building Your Program        [⚙️] │
├─────────────────────────────────────┤
│  [Coach Avatar]                      │
│  Based on your preferences, I'll     │
│  create a 4-week hypertrophy         │
│  program with 4 sessions per week.   │
│                                      │
│  Here's what I'm planning:           │
│  • Week 1-2: Foundation (volume)     │
│  • Week 3-4: Intensification (load)  │
│                                      │
│  Does this sound good, or would you  │
│  like me to adjust anything?         │
│                                      │
│  [Continue]  [Adjust program]        │
├─────────────────────────────────────┤
│  [Preview of program structure]      │  ← Shows weeks/sessions as they're planned
└─────────────────────────────────────┘
```

**Features:**
- Reuses chat WebSocket infrastructure
- Coach proposes program based on questionnaire
- User can ask for changes ("More leg days", "Add Olympic lifts", "Reduce volume")
- Iterative back-and-forth until user is satisfied
- Shows program outline/preview in collapsed format

**Context sent to AI:**
```typescript
{
  programBuilder: true,
  preferences: {
    duration: '4 weeks',  // Max 4 weeks
    sessionsPerWeek: 4,
    goal: 'hypertrophy',
    experience: 'intermediate',
    equipment: 'full gym',
    notes: 'Knee injury, prefer goblet squats'
  }
}
```

**System prompt additions:**
- "Create programs with a maximum of 4 weeks"
- "When users ask for longer programs, explain: 'Let's start with 4 weeks so you can see how it feels. Once you're into it, I can add more weeks for you anytime!'"
- "Use friendly, encouraging language - avoid technical jargon"
- "Keep programs focused and manageable"

### Step 3: Program Creation

**Trigger:** User confirms program ("Looks good, create it!")

**SIMPLIFIED:** AI naturally describes program in chat, then calls tool

**Flow:**
```
User: "Looks good, create it!"

AI: "Great! I'm creating your 4-week hypertrophy program now.

Week 1-2: Foundation phase with moderate volume
  - Upper/Lower split, 4 days per week
  - Main lifts: Bench, Squat, Deadlift, OHP
  - Accessory work for arms, back, legs

Week 3-4: Intensification phase
  - Same split, increased intensity
  - Progressive overload from Week 1-2
  - Deload on Week 4 Day 4

[Calls create_workout_program tool with full JSON]

[Loading state while tool executes]
  "⏳ Creating your program..."

✓ All set! Taking you to Week 1..."
```

**No custom streaming needed:**
- AI describes program in natural language (streams normally in chat)
- User sees the plan as AI types it
- AI calls `create_workout_program` tool with complete JSON
- **While tool executes:** Show loading indicator with friendly text
  - "Creating your program..." (not just a spinner)
  - Friendly, not technical (avoid "database", "saving", etc.)
- Frontend detects tool success and redirects

### Step 4: Load Program

**Trigger:** Program creation completes

**Flow:**
```typescript
1. Save complete program to database
2. Switch user to new program (update localStorage)
3. Show success message
4. Redirect to home (viewing new program)
   OR redirect to library (see it in list)
```

**UI:** Brief success state
```
┌─────────────────────────────────────┐
│  ✓ Program Created!                  │
│                                      │
│  "4-Week Hypertrophy Program"        │
│  4 weeks • 16 sessions               │
│                                      │
│  [View Program →]                   │
└─────────────────────────────────────┘
```

---

## Technical Implementation

### Phase 1: Questionnaire Component

**Files:**
- `client/src/components/ProgramBuilderQuestionnaire.tsx`
- `client/src/types/programBuilder.ts`

**Component:**
```typescript
interface QuestionnaireData {
  duration: string;
  sessionsPerWeek: number;
  goal: string;
  experience: string;
  equipment: string;
  notes?: string;
}

export const ProgramBuilderQuestionnaire: React.FC<{
  onNext: (data: QuestionnaireData) => void;
  onCancel: () => void;
}>;
```

**Integration:**
- Add to `ProgramLibraryPage.tsx`
- Replace current "New Program" button click handler
- Show questionnaire in modal/dialog

### Phase 2: Builder Chat Interface

**SIMPLIFIED APPROACH:**

**Files:**
- `client/src/pages/ProgramBuilderPage.tsx` (that's it!)

**Implementation:**
```typescript
// Just reuse existing ChatInterface component directly!
export const ProgramBuilderPage = () => {
  const [searchParams] = useSearchParams();
  const questionnaire = JSON.parse(searchParams.get('q') || '{}');

  // Pass questionnaire as initial context to existing chat
  const initialContext = {
    programBuilder: true,
    preferences: questionnaire
  };

  return (
    <div>
      <ChatInterface
        context={initialContext}
        systemPrompt="program-builder"  // Different prompt, same component
      />
    </div>
  );
};
```

**Server-side:**
- Add `create_workout_program` tool to existing tools array
- Tool receives full program JSON, saves to DB, returns program ID
- Detect `programBuilder: true` in context to use builder-specific system prompt
- **No custom streaming, no special modes - just reuse everything**

### Phase 3: Program Creation Tool

**SIMPLIFIED: Just add one tool to existing tools**

```typescript
// In server/lib/tools.ts (or wherever tools are defined)
export const createWorkoutProgramTool = {
  name: 'create_workout_program',
  description: 'Saves a workout program to the database and switches user to it. Maximum 4 weeks per program.',
  input_schema: {
    type: 'object',
    properties: {
      weeks: {
        type: 'array',
        description: 'Complete program structure with weeks, sessions, exercises (max 4 weeks)',
        maxItems: 4
      },
      name: {
        type: 'string',
        description: 'Optional program name (will auto-generate if omitted)'
      }
    },
    required: ['weeks']
  },
  handler: async (input, context) => {
    const { weeks, name } = input;
    const { userId } = context;

    // Validate 4-week limit
    if (weeks.length > 4) {
      throw new Error('Let\'s start with a 4-week program. I can add more weeks for you once you get started!');
    }

    // Create program in DB
    const programId = await createProgramInDB(userId, weeks, name);

    return {
      success: true,
      programId,
      message: 'All set! Taking you to your new program...'
    };
  }
};
```

**Client-side:**
```typescript
// Listen for tool result in ChatInterface (already exists!)
// When create_workout_program succeeds, redirect to home
useEffect(() => {
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.toolResults?.some(r => r.tool === 'create_workout_program')) {
    const result = lastMessage.toolResults.find(r => r.tool === 'create_workout_program');
    if (result.success) {
      // Update localStorage to point to new program
      localStorage.setItem('current_program_id', result.programId);
      setLocation('/');
    }
  }
}, [messages]);
```

**Informative loading treatment:**
```typescript
// While tool is executing (in ChatInterface)
{isToolExecuting && toolName === 'create_workout_program' && (
  <div className="flex items-center gap-2 text-gray-600">
    <Spinner />
    <span>Creating your program...</span>
  </div>
)}
```

**No custom streaming needed - AI naturally describes program before calling tool!**

### Phase 4: Save and Switch

**SIMPLIFIED: Make createProgram accept optional weeks**

```typescript
// Modify existing createProgram in useProgramLibrary.ts
const createProgram = useCallback(async (name?: string, weeks?: Week[]) => {
  if (!user) throw new Error('User not logged in');

  const newProgram: Omit<WorkoutProgram, 'created_at' | 'updated_at'> = {
    id: crypto.randomUUID(),
    user_id: user.id,
    name: name || null,
    description: undefined,
    weeks: weeks || createSampleWeeks(),  // Use provided weeks or sample
  };

  const { error: insertError } = await supabase
    .from('workout_programs')
    .insert({
      ...newProgram,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (insertError) throw insertError;

  // Switch to new program
  await selectProgram(newProgram.id);
  return newProgram.id;
}, [user, selectProgram]);
```

**Tool handler just calls this:**
```typescript
handler: async (input, context) => {
  const programId = await createProgram(input.name, input.weeks);
  return { success: true, programId };
}
```

**No new functions needed - just extend existing one!**

---

## Open Questions

### 1. Questionnaire Format
**Question:** Should the questionnaire be a modal, slide-over, or separate page?

**Options:**
- A) Modal/Dialog (keeps context, quick)
- B) Slide-over panel (modern, spacious)
- C) Separate page at `/library/new` (most room, can be bookmarked)

**Recommendation:** separate page (such that refreshing resets the workout builder / lands you at the initial point)

### 2. Builder Interface Placement
**Question:** Should the builder be a separate page or integrated into library?

**Options:**
- A) Separate page `/builder` (dedicated focus)
- B) Slide-over in library (stay in context)
- C) Replace library temporarily (fullscreen takeover)

**Recommendation:** ✅ Separate page

### 3. Conversation Depth
**Question:** How iterative should the builder conversation be?

**Options:**
- A) One-shot: Questionnaire → Generate → Done (fast, simple)
- B) Single refinement: Questionnaire → Preview → Refine once → Generate
- C) Fully iterative: Back-and-forth until user is satisfied (flexible, slower)

**Recommendation:** ✅ C - Fully iterative (keep going until user is happy)

### 4. Streaming Visualization
**Question:** How should we display the program as it's being built?

**Options:**
- A) List of weeks/sessions appearing (simple, clear)
- B) Animated cards/accordions (visual, engaging)
- C) Raw JSON viewer (for advanced users)
- D) Collapsed tree view (compact, expandable)

**Recommendation:** ✅ Scrollable list of weeks/sessions where new things keep being appended to the bottom

### 5. Post-Creation Flow
**Question:** After creation, where should the user land?

**Options:**
- A) Redirect to home (immediately view Week 1)
- B) Stay in library (see new program in list)
- C) Show program detail page (review before starting)

**Recommendation:** ✅ A - Redirect to home (immediately view Week 1)

### 6. Keep Simple Creation?
**Question:** Should we keep a "quick create" option for users who don't want AI assistance?

**Options:**
- A) Remove it entirely (AI-only flow)
- B) Keep as "Create Blank Program" option
- C) Add "Skip AI" button in questionnaire

**Recommendation:** ✅ No - AI-only flow (remove simple creation)

### 7. Error Handling
**Question:** What if AI fails to generate a valid program?

**Options:**
- A) Fall back to sample program
- B) Show error and let user retry
- C) Allow manual JSON input as escape hatch

**Recommendation:** ✅ B - Show error and let user retry (other escape hatch is "import program")

### 8. HTTP Fallback
**Question:** What if WebSocket is unavailable or fails?

**Decision:** ✅ Natural fallback to HTTP (same as coach chat)
- Primary: WebSocket for real-time streaming
- Fallback: HTTP POST requests if WebSocket unavailable
- Graceful degradation with loading states

---

## Implementation Status

### ✅ Phase 1: Questionnaire - COMPLETED
- [x] Create questionnaire page at `/library/new`
- [x] Create `ProgramBuilderQuestionnaire` component
- [x] Add types for questionnaire data (`client/src/types/programBuilder.ts`)
- [x] Duration dropdown: 2-4 weeks only (with help text)
- [x] Add descriptions below dropdowns (not cramped in select items)
- [x] Route from library "+ Create Program" button
- [x] Wire up "Next" button to navigate to builder with URL params

**Files Created:**
- `client/src/types/programBuilder.ts`
- `client/src/components/ProgramBuilderQuestionnaire.tsx`
- `client/src/pages/ProgramBuilderQuestionnairePage.tsx`

### ✅ Phase 2: Builder Interface - COMPLETED
- [x] Create builder page at `/builder`
- [x] Create `ProgramBuilderPage` component (wraps `useChatWebSocket`)
- [x] Pass questionnaire as URL params, parse into context
- [x] Reuse entire chat infrastructure (WebSocket + HTTP fallback)
- [x] Fix WebSocket connection detection (already connected edge case)
- [x] Show "Connecting..." while waiting for WebSocket

**Files Created:**
- `client/src/pages/ProgramBuilderPage.tsx`

**Files Modified:**
- `client/src/App.tsx` - Added `/builder` route
- `client/src/lib/websocket.ts` - Fixed duplicate connection handling

### ✅ Phase 3: Program Creation - COMPLETED (EVEN MORE SIMPLIFIED!)
**Actual Implementation:**
- [x] Update system prompt: conversational first, create only when user confirms
- [x] AI outputs program as JSON in markdown code block (no tool needed!)
- [x] Client parses JSON from message and creates program
- [x] 4-week validation in system prompt
- [x] Friendly user-facing copy throughout

**Why we simplified further:**
- ❌ Removed `create_workout_program` tool (unnecessary complexity)
- ✅ AI describes program in conversation, then outputs JSON
- ✅ Client detects ```json blocks and auto-creates program
- ✅ KISS principle - no server-side tool execution needed

**Files Modified:**
- `server/lib/ai-config.ts` - Added `buildProgramBuilderPrompt()`
- `client/src/pages/ProgramBuilderPage.tsx` - Added JSON detection

### ✅ Phase 4: Save & Switch - COMPLETED
- [x] Modify `createProgram` to accept optional `weeks` param
- [x] Change library button from "New Program" → "Create Program"
- [x] Auto-redirect to home after program creation

**Files Modified:**
- `client/src/hooks/useProgramLibrary.ts` - `createProgram(name?, weeks?)`
- `client/src/pages/ProgramLibraryPage.tsx` - Updated button click handler

### ⏸️ Phase 5: Polish - NOT STARTED
- [ ] Loading states and skeletons
- [ ] Friendly error messages (avoid technical jargon)
- [ ] Retry logic with encouraging messaging
- [ ] Accessibility (keyboard nav, ARIA labels)
- [ ] Mobile responsiveness testing
- [ ] Review all copy for warmth and clarity
- [ ] Analytics tracking

**Total Time Spent:** ~3 hours (even less than estimated!)

---

## Key Implementation Decisions

### 1. JSON Parsing Instead of Server-Side Tool
**Original Plan:** Create a `create_workout_program` tool that executes on the server and saves to DB.

**Actual Implementation:**
- AI outputs program as JSON in markdown code block: ` ```json\n[weeks]\n``` `
- Client watches for JSON blocks in messages
- Client parses and validates, then calls `createProgram(undefined, weeks)`

**Why Better:**
- Simpler - no server-side DB access in tool handlers
- More transparent - user sees the full program before creation
- Easier to debug - JSON is visible in chat
- Follows KISS principle

### 2. Conversational First, Create Later
**System Prompt Strategy:**
- AI explicitly instructed to have a conversation first
- Ask clarifying questions (time per session, injuries, preferences)
- Propose structure and get feedback
- Only create when user explicitly confirms

**Result:** User feels heard, program is customized to their needs.

### 3. WebSocket Connection Handling
**Bug Fixed:** `chatWebSocket.connect()` was creating duplicate sockets when already connected.

**Solution:** Check `this.socket.connected` before creating new socket, resolve immediately if already connected.

**Impact:** Builder page connects instantly when coming from questionnaire page.

---

## Design Decisions ✅ FINALIZED

1. ✅ **Questionnaire format** - Separate page at `/library/new`
2. ✅ **Builder placement** - Separate page `/builder`
3. ✅ **Conversation style** - Fully iterative until user satisfied
4. ✅ **Streaming visualization** - Scrollable list appending to bottom
5. ✅ **Post-creation flow** - Redirect to home (Week 1)
6. ✅ **Keep simple creation?** - No, AI-only
7. ✅ **Error handling** - Show error and retry
8. ✅ **HTTP fallback** - Yes, same as coach chat

---

## Success Metrics

**Engagement:**
- % of users who complete the builder vs cancel
- Average time to create a program
- Number of refinement iterations per program

**Quality:**
- % of generated programs that are valid JSON
- User retention after using builder
- Programs created via AI vs manual

**Performance:**
- Time to first week streamed
- Total program generation time
- WebSocket connection stability

---

## Notes

- Reuse existing coach infrastructure (WebSocket, AI service, tools)
- Keep it simple for V1 - can add complexity later
- Focus on the happy path first, then error handling
- Consider mobile UX (forms on small screens)
- Ensure offline graceful degradation (need internet for AI)
