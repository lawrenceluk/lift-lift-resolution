# Product Vision: Program Library & Multi-Program Support

## Overview

Enable logged-in users to manage multiple workout programs through a library interface, while maintaining the app's local-first architecture and simple UX for guest users.

---

## Core Principles

1. **Simple defaults** - New programs get "Training Program" as name, can be customized later
2. **Library is the control center** - Only visible to logged-in users, where you view/create/switch programs
3. **Local-first** - localStorage always holds the currently selected program
4. **Optimistic sync** - Changes sync to cloud in background, no blocking
5. **No prompts/wizards** - Keep it simple, discovery through navigation

---

## User Experience

### Guest Users (Not Logged In)
- Everything works as today
- Single implicit program in localStorage
- No concept of "programs" anywhere in UI
- No library, no naming, no cloud sync

### Logged-In Users

**Main App UI (Unchanged)**
```
┌─────────────────────────────────────┐
│  ← Week 2                      [⚙️] │  ← No program name shown here
├─────────────────────────────────────┤
│  Monday - Upper Body                 │
│  Wednesday - Lower Body              │
│  Friday - Upper Body                 │
└─────────────────────────────────────┘
```
- No mention of programs in main workout tracking UI
- Works exactly like guest mode
- Silent sync to cloud in background

**Program Library Page** (New)
```
┌─────────────────────────────────────┐
│  Program Library              [⚙️]  │
├─────────────────────────────────────┤
│  📋 Training Program      ● ACTIVE  │  ← Currently selected
│     ✨ Smart name  |  ✏️ Rename      │
│     8 weeks • Last updated 2h ago    │
│     "Focus on compound movements..." │  ← AI-generated description
│                                      │
│  📋 Summer Cut Program              │
│     12 weeks • Last updated 3d ago   │
│     "High-volume hypertrophy with..."│
│                                      │
│  [+ New Program]                    │
└─────────────────────────────────────┘
```

**Navigation:**
- Settings → "Program Library" (or similar menu item)
- Only visible when logged incall
---

## Program Metadata

### Name
**Default:** `"Training Program"`
- Created with simple default name
- User can:
  - Click name directly → Edit inline (manual text input)
  - Click ✨ icon → AI generates smart name from workout data
    - Examples: "4-Day Push/Pull/Legs", "Strength Cycle - Squat/Bench/Dead"
- Stored in database `workout_programs.name`

### Description
**Default:** `NULL` (empty)
- Initially empty, shows "No description yet"
- User can:
  - Click description area → Edit inline (manual text input)
  - Click ✨ icon → AI generates description from workout analysis
    - Example: "12-week program emphasizing compound movements. Primary lifts: Squat, Deadlift, Bench Press. Progressive overload with 4 sessions per week."
- Stored in database `workout_programs.description`
- Displayed in library as preview text

**UX Pattern:**
- Single ✨ icon button generates both name AND description together
- More compact than separate "Smart name" / "Generate description" buttons
- Click once, AI analyzes workout data and fills both fields

**Key Point:** Metadata exists for organization/discovery, not required for functionality

---

## Data Architecture

### Local-First Model

**What Lives Where:**
```
localStorage:
  - workout_weeks: Week[]           // Currently selected program's data
  - current_program_id: UUID        // Which program is selected
  - last_workout_sync_hash: string  // For change detection

Supabase workout_programs:
  - id: UUID (PK)                   // Program identifier
  - user_id: UUID (FK)              // Owner
  - name: text                      // "Training Program" default
  - description: text               // Optional AI/manual
  - weeks: JSONB                    // Full program data
  - created_at: timestamp
  - updated_at: timestamp
```

**Key Invariant:** localStorage always contains exactly one program (the active/selected one)

### Program Selection Flow

**When user switches programs in library:**
```typescript
async function selectProgram(programId: string) {
  // 1. Sync current program to cloud first (save any pending changes)
  await syncCurrentProgramToDB();

  // 2. Load selected program from database
  const { data } = await supabase
    .from('workout_programs')
    .select('*')
    .eq('id', programId)
    .single();

  // 3. Replace localStorage with selected program
  localStorage.setItem('workout_weeks', JSON.stringify(data.weeks));
  localStorage.setItem('current_program_id', programId);

  // 4. Reload app state
  window.location.reload(); // Or update React state
}
```

**Benefits:**
- Simple mental model: localStorage = current program
- No conflicts between programs
- Fast local reads for main app
- Cloud is source of truth for all programs

### Create New Program Flow

**Option A: Start Fresh**
```typescript
async function createNewProgram() {
  // 1. Generate new program with sample data
  const newProgram = {
    id: crypto.randomUUID(),
    user_id: user.id,
    name: 'Training Program',
    description: null,
    weeks: createSampleWeeks(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 2. Save to database
  await supabase.from('workout_programs').insert(newProgram);

  // 3. Switch to it (replaces localStorage)
  await selectProgram(newProgram.id);
}
```

**Option B: Duplicate Current**
```typescript
async function duplicateProgram(sourceId: string) {
  // 1. Load source program
  const { data: source } = await supabase
    .from('workout_programs')
    .select('*')
    .eq('id', sourceId)
    .single();

  // 2. Create duplicate with new ID
  const duplicate = {
    ...source,
    id: crypto.randomUUID(),
    name: `${source.name} (Copy)`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    weeks: resetProgramProgress(source.weeks), // Clear logged sets, keep structure
  };

  // 3. Save and switch
  await supabase.from('workout_programs').insert(duplicate);
  await selectProgram(duplicate.id);
}
```

---

## Cross-Device Session Continuity

### The Problem

**Scenario:**
```
1. User starts workout on Phone (Monday, Exercise 2 of 5)
   - Session marked as "started", some sets logged
   - Data syncs to cloud

2. User opens app on Laptop
   - Sees same program, but which state?
   - Should they see the in-progress session?
   - What if they want to start a different session instead?

3. User returns to Phone
   - Continues logging same session
   - Laptop changes now need to merge
```

**Core Tension:**
- Local-first = fast, works offline, simple
- Multi-device = needs coordination, conflict resolution

### Solution: Server Always Wins (Simple & Intuitive)

**Approach:**
```
1. Device A makes changes → localStorage updated immediately
2. Changes queue for sync (1 second debounce)
3. Sync to database happens in background
4. Device B polls for updates (on app focus/reload)
5. If DB version is newer → Auto-pull and replace local
6. No conflict UI, no user decisions needed
```

**Why This Works:**
- Every action (logging sets, updating exercises) is immediately persisted to DB
- If DB is newer, it means you made changes on another device more recently
- Taking server version is always the "right" choice intuitively
- Eliminates cognitive load of conflict resolution

**Implementation:**
```typescript
// On app focus/visibility change
async function syncFromServer() {
  const localProgramId = localStorage.getItem('current_program_id');

  const { data: cloudProgram } = await supabase
    .from('workout_programs')
    .select('updated_at, weeks')
    .eq('id', localProgramId)
    .single();

  const localWeeks = loadWeeks();
  const localHash = hashWeeks(localWeeks);
  const cloudHash = hashWeeks(cloudProgram.weeks);

  if (cloudHash !== localHash) {
    // Server has different version → Take it
    localStorage.setItem('workout_weeks', JSON.stringify(cloudProgram.weeks));

    // Update React state (trigger re-render)
    window.dispatchEvent(new Event('storage'));

    // Optional: Show subtle toast
    showToast('Synced from another device');
  }
}

// Listen for app becoming visible
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    syncFromServer();
  }
});
```

**Sync Status Indicators:**
- "Synced ✓" - All changes uploaded to cloud
- "Syncing..." - Upload in progress
- No error states needed (optimistic sync always succeeds)

---

## Implementation Plan

### Phase 1: Program Library Foundation (This Sprint)
**Goal:** Logged-in users can view their current program in a library

**Tasks:**
- [x] Add `name` and `description` columns to `workout_programs` table
- [x] Update TypeScript types (`WorkoutProgram` interface)
- [x] Update `useWorkoutProgram` hook to sync name/description
- [ ] Create `ProgramLibraryPage.tsx` component
  - List all programs for current user
  - Show which is currently active
  - Display name, description, metadata
- [ ] Add "Program Library" link in settings/navigation (logged-in only)

**Expected State:**
- User sees one program: "Training Program"
- Can view but not yet switch/create

### Phase 2: Program Switching & Creation ✅ COMPLETE
**Goal:** Users can create and switch between programs

**Tasks:**
- [x] Implement `selectProgram()` function
  - Sync current → Load selected → Update localStorage
- [x] Add "New Program" button in library
  - Creates with default name + sample data
  - Switches to it
- [x] Add "Duplicate Program" option
  - Copies structure, clears logged sets
- [x] Handle program deletion (with confirmation)

**Expected State:**
- User can create multiple programs
- Can switch between them
- LocalStorage updates on switch

**Implementation:**
- `useProgramLibrary.ts`: Core functions for selectProgram, createProgram, duplicateProgram, deleteProgram
- `ProgramLibraryPage.tsx`: Full UI with dropdowns, confirmation dialogs, loading states
- Auth routing fixed: `/library` page redirects to `/login?returnTo=/library` when not authenticated

### Phase 3: Smart Metadata ✅ COMPLETE
**Goal:** AI-generated names and descriptions

**Tasks:**
- [x] Implement workout analysis utilities
  - Extract main lifts, session frequency, week count
  - Detect training style (strength/hypertrophy/etc.)
- [x] Auto-generate metadata on library load
  - Any program still named "Training Program" gets AI-generated name + description
  - Happens automatically in background when library page loads
  - Non-blocking, fires off async requests
- [x] Server API endpoint for metadata generation
  - POST `/api/programs/:programId/generate-metadata`
  - Uses Claude Haiku 4.5 via OpenRouter
  - Analyzes program structure and generates smart name + description
  - Fallback to rule-based generation if AI fails

**Implementation:**
- `server/lib/program-metadata-generator.ts`: AI-powered metadata analysis
- `server/routes.ts`: API endpoint at `/api/programs/:programId/generate-metadata`
- `useProgramLibrary.ts`: Auto-generation logic that detects "Training Program" names
- Prevents infinite loops with `useRef` tracking of attempted generations
- Future: Add manual "Rename" modal for user editing of metadata

### Phase 4: Cross-Device Sync Polish (Future)
**Goal:** Graceful handling of multi-device conflicts

**Tasks:**
- [ ] Add `updated_at` tracking to localStorage
- [ ] Implement conflict detection on app focus
- [ ] UI for sync status indicators
- [ ] Manual "Pull latest" / "Push local" controls
- [ ] Toast notifications for auto-syncs

---

## Technical Considerations

### 1. Program Switching Performance
**Challenge:** Loading new program replaces all workout data
**Impact:** Potential UI flash/re-render

**Solutions:**
- Loading state while fetching from DB
- Optimistic updates (assume switch succeeds)
- Consider suspense boundaries for smoother transition

### 2. localStorage Size Limits
**Challenge:** Browser localStorage typically 5-10MB limit
**Current:** Single program unlikely to exceed (JSON compression)
**Future:** If users have 100+ week programs, might hit limits

**Solutions:**
- Monitor localStorage usage
- Warn if approaching limits
- Consider IndexedDB for larger programs (future)

### 3. Offline Support
**Challenge:** User switches programs while offline
**Current:** Won't work (needs DB fetch)

**Solutions (V1):**
- Disable program switching when offline
- Show "Connect to switch programs" message

**Solutions (V2 - Future):**
- Cache last N programs in IndexedDB
- Allow switching between cached programs offline
- Sync when back online

### 4. Migration for Existing Users
**Challenge:** Current users have localStorage data but no program in DB

**Current Behavior:**
- On login, `useWorkoutProgram` creates program with UUID
- Name is NULL → Shows as empty in DB

**Needed:**
- On first library visit, auto-populate name: "Training Program"
- Optional: Run AI generation and suggest smart name

---

## Design Decisions (Finalized)

### 1. Program name in main app header?
**Decision:** Never show it. Keep main UI simple and focused on workout tracking.
- Library is where you see/manage program names
- Main app stays clean and identical to guest experience

### 2. Program creation limits?
**Decision:** Unlimited programs.
- Storage is cheap
- Add soft limits only if abuse detected
- Future: Could tier for monetization (free: 3, paid: unlimited)

### 3. Program templates/sharing?
**Decision:** Out of scope for V1, but design to support it later.

**Future database additions:**
```sql
ALTER TABLE workout_programs ADD COLUMN is_template BOOLEAN DEFAULT FALSE;
ALTER TABLE workout_programs ADD COLUMN published_at TIMESTAMP;
ALTER TABLE workout_programs ADD COLUMN source_template_id UUID REFERENCES workout_programs(id);
```

### 4. In-progress session handling during program switch?
**Decision:** No warning needed - switching is safe.
- All actions (logged sets, etc.) are persisted immediately
- Switching programs just changes which data you're viewing
- User can switch freely, return anytime to in-progress session
- Auto-saves before switching ensures no data loss

---

## Success Metrics

**Adoption:**
- % of logged-in users who visit library
- % of users with 2+ programs
- Average programs per active user

**Engagement:**
- Program switches per week
- Use of "duplicate program" feature
- Use of AI name/description generation

**Quality:**
- Sync success rate (should be >99%)
- Conflict occurrences (lower is better)
- Cross-device usage (% of users active on 2+ devices)

**Performance:**
- Program switch latency (should be <1s)
- localStorage size (monitor for limits)
- Sync queue length (detect backlog issues)

---

## UI Mockups

### Program Library - Single Program (First Visit)
```
┌─────────────────────────────────────┐
│  ← Program Library            [⚙️]  │
├─────────────────────────────────────┤
│                                      │
│  📋 Training Program      ● ACTIVE  │
│     ┌─────────────────────────────┐ │
│     │ 8 weeks                     │ │
│     │ Last updated 2 hours ago    │ │
│     │                             │ │
│     │ Training Program     [✨]   │ │  ← Single icon generates both
│     │ No description yet          │ │
│     └─────────────────────────────┘ │
│                                      │
│  [+ New Program]                    │
│  [+ Duplicate This Program]         │
│                                      │
└─────────────────────────────────────┘

Note: [✨] icon button generates smart name + description
      Click text to manually edit
```

### Program Library - Multiple Programs
```
┌─────────────────────────────────────┐
│  ← Program Library            [⚙️]  │
├─────────────────────────────────────┤
│                                      │
│  📋 Spring Strength Cycle ● ACTIVE  │
│     Focuses on Squat, Bench, Dead.  │
│     8 weeks • Updated 10 min ago     │
│     [Open] [✨] [🗑️]                │
│                                      │
│  📋 Summer Cut Program              │
│     High-volume hypertrophy with    │
│     progressive overload.           │
│     12 weeks • Updated 3 days ago    │
│     [Switch] [Copy] [🗑️]           │
│                                      │
│  📋 Training Program                │
│     No description yet              │
│     4 weeks • Updated 2 weeks ago    │
│     [Switch] [Copy] [✨] [🗑️]       │
│                                      │
│  [+ New Program]                    │
│                                      │
└─────────────────────────────────────┘

Actions:
- [✨] = Generate/regenerate smart metadata
- [Copy] = Duplicate program (clear logged sets)
- [🗑️] = Delete program (with confirmation)
```

### Cross-Device Sync (No Conflict UI Needed)
```
User on Phone:
  - Logs sets for Exercise 3
  - Changes sync to cloud automatically

User opens Laptop:
  - App checks cloud on focus
  - Detects newer version
  - Auto-pulls and updates UI
  - Subtle toast: "✓ Synced from another device"

No conflict UI needed - server always wins
```

---

## Appendix: AI Name Generation Examples

**Pattern Detection:**
```typescript
// Input: Workout data
weeks: [
  sessions: [
    { name: "Upper Body", exercises: ["Bench Press", "Rows", "OHP"] },
    { name: "Lower Body", exercises: ["Squat", "RDL", "Leg Press"] },
    { name: "Upper Body", exercises: ["Incline Bench", "Pullups", "Dips"] },
    { name: "Lower Body", exercises: ["Deadlift", "Front Squat", "Lunges"] }
  ]
]

// Output suggestions:
"4-Day Upper/Lower Split"
"Strength Program - Squat/Bench/Deadlift"
"Push/Pull Legs Cycle"
```

**Metadata-Based:**
```typescript
// Input: Program structure
weekCount: 8
sessionsPerWeek: 4
phase: "Accumulation"

// Output:
"8-Week Accumulation Block"
"4-Day Training Program"
```

**Goal-Based (if user provides context):**
```typescript
// Input: User goals (from profile or setup)
goal: "strength"
experience: "intermediate"

// Output:
"Intermediate Strength Program"
"Powerlifting Preparation Cycle"
```
