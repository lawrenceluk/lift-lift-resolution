# User Profile Data Model Specification

## Overview

This specification defines a simple user profile system that allows users to store personal information relevant to their training program. This data serves dual purposes:
1. **User reference** - Quick reference for body metrics and training considerations
2. **AI context** - Provides the coach AI with essential information for personalized programming and advice

## Current State Review

**Existing Export/Import Architecture:**
- Export: Serializes `Week[]` array directly to JSON (raw array, no wrapper object)
- Import: Validates and normalizes the array, stores to `localStorage.setItem('workout_weeks', ...)`
- No user/profile data currently stored or transmitted
- AI receives context via WebSocket (currentSession, currentWeek, fullProgram)
- System prompt built dynamically based on user's current view (week vs session level)

**Key Findings:**
- Export modal: Custom filename + copy-to-clipboard options
- Import modal: File upload (drag-drop) or paste JSON, with validation
- Storage key: `'workout_weeks'` only
- AI tools: 11 modification tools (GUID-based execution) + 2 read tools (server-side)
- No append_coach_note tool currently exists

## Goals

- Store minimal, essential user information in a simple format
- Make this data easily editable through a dedicated Profile UI
- **Minimize disruption**: Keep export/import backward compatible with existing `Week[]` array format
- Provide free-form context to the AI coach for better personalization
- Allow the AI coach to append notes to the profile (via new `append_coach_note` tool)
- Maintain backward compatibility with existing workout data

## Data Model

### UserProfile Interface

```typescript
interface UserProfile {
  // Basic info
  name?: string;

  // Body metrics (stored as strings for flexibility)
  height?: string; // e.g., "180cm", "5'11\"", "6 feet"
  weight?: string; // e.g., "85kg", "187lbs", "190 pounds"

  // Free-form training context
  // User can include: injuries, equipment access, preferences, goals,
  // training history, time constraints, etc.
  notes?: string; // multi-line text area

  // AI coach can append observations here
  coachNotes?: string; // append-only by AI

  // Metadata
  updatedAt?: string; // ISO timestamp
}
```

### Root Data Structure

The profile will be stored alongside weeks in the exportable data structure:

```typescript
interface WorkoutProgramData {
  profile?: UserProfile; // optional for backward compatibility
  weeks: Week[]; // existing weeks array
}
```

## Storage Strategy

### localStorage Keys

Use separate localStorage keys:

```typescript
const STORAGE_KEY_WEEKS = 'workout_weeks'; // existing - stores Week[] array
const STORAGE_KEY_PROFILE = 'user_profile'; // new - stores UserProfile object
```

### Export Format: IMPORTANT BACKWARD COMPATIBILITY

The export format requires careful handling to maintain compatibility with existing users:

**For users WITH profile data:**
- Export as object wrapper: `{ profile: {...}, weeks: [...] }`
- New format clearly indicates profile presence

**For users WITHOUT profile data:**
- Export as raw array: `[...]` (existing format)
- Existing users can continue to import/export without changes
- New users with profile can export the object format

**Rationale:**
- Maintains backward compatibility - existing `workout_weeks` data unchanged
- Profile is logically separate from workout planning data
- Users without profile never see changes - exports remain plain arrays
- Users can move between devices/sessions seamlessly

## Data Persistence Functions

New utility functions needed (pseudo-code):

```typescript
// In client/src/utils/localStorage.ts

const STORAGE_KEY_PROFILE = 'user_profile';

export const saveProfile = (profile: UserProfile): void => {
  localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
};

export const loadProfile = (): UserProfile | null => {
  const data = localStorage.getItem(STORAGE_KEY_PROFILE);
  return data ? JSON.parse(data) : null;
};

// Update existing export to include profile
export const exportProgramData = (weeks: Week[], profile?: UserProfile): void => {
  const data = { profile, weeks };
  // ... download as JSON
};

// Update existing import to handle both formats
export const importProgramData = (file: File): Promise<{
  weeks: Week[];
  profile?: UserProfile;
}> => {
  // If data is array: { weeks: data, profile: null }
  // If data is object with weeks: { weeks: data.weeks, profile: data.profile }
};
```

## State Management

### New Hook: useUserProfile

```typescript
// In client/src/hooks/useUserProfile.ts

export const useUserProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const loaded = loadProfile();
    setProfile(loaded || {});
  }, []);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    const updated = {
      ...profile,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    setProfile(updated);
    saveProfile(updated);
  }, [profile]);

  return { profile, updateProfile };
};
```

## UI/UX Design

### Profile Page Location

**Navigation Path:**
- Home page → Overflow menu (⋮) → "Profile"
- New route: `/profile`

**Menu Structure:**
```
Home Page Overflow Menu:
├── Import Workout Data
├── Export Workout Data
├── Profile (NEW)
└── [other options]
```

### Profile Page Layout

Simple, clean form:

```
┌─────────────────────────────────────┐
│ ← Profile                           │
├─────────────────────────────────────┤
│                                     │
│ Name                                │
│ ┌─────────────────────────────────┐│
│ │ [text input]                    ││
│ └─────────────────────────────────┘│
│                                     │
│ Height                              │
│ ┌─────────────────────────────────┐│
│ │ [text input]                    ││
│ └─────────────────────────────────┘│
│ e.g., "6'2\"", "188cm", "6 feet"    │
│                                     │
│ Weight                              │
│ ┌─────────────────────────────────┐│
│ │ [text input]                    ││
│ └─────────────────────────────────┘│
│ e.g., "185lbs", "84kg", "190 pounds"│
│                                     │
│ Training Notes                      │
│ ┌─────────────────────────────────┐│
│ │ [text area - multi-line]        ││
│ │                                 ││
│ │                                 ││
│ │                                 ││
│ └─────────────────────────────────┘│
│ Include: injuries, equipment access,│
│ goals, preferences, constraints     │
│                                     │
│ Coach Notes (read-only)             │
│ ┌─────────────────────────────────┐│
│ │ [text area - read-only]         ││
│ │                                 ││
│ └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘
```

### Form Behavior

- **Auto-save**: Changes persist on blur/change (no explicit save button)
- **All fields optional**: User fills what's relevant
- **Coach notes read-only**: Only AI can write here

## AI Coach Integration

### Current Context Architecture

The AI coach receives context via WebSocket with:
- `currentSession` - The session user is viewing (with full set-by-set data)
- `currentWeek` - The week containing current session
- `fullProgram` - Complete Week[] array
- System prompt dynamically built in `server/lib/ai-config.ts` based on view level (week vs session)

### Providing Profile Context to AI

Profile data should be added to the system prompt when present, integrated into `buildSystemPrompt()` in `server/lib/ai-config.ts`:

**Logic:**
1. Fetch profile alongside weeks when context is available
2. Check if profile exists and has meaningful data
3. Add profile section to system prompt BEFORE workout context
4. Include: name, height, weight, notes, coachNotes (if present)

**Placement in System Prompt (high-level):**
```
=== USER PROFILE ===
[Name if provided]
[Height/Weight if provided]
[Free-form notes]

Previous Coach Observations:
[coachNotes if provided]

=== WORKOUT PROGRAM CONTEXT ===
[existing week/session context...]
```

**Benefit:** Coach immediately understands user constraints (injuries, equipment, preferences) when suggesting modifications

### AI Writing to Profile

Add new read-only function tool `append_coach_note` that appends to profile:

```typescript
// Function tool available to AI
{
  name: "append_coach_note",
  description: "Append an observation or recommendation to coach notes",
  parameters: {
    type: "object",
    properties: {
      note: {
        type: "string",
        description: "The observation or recommendation to add"
      }
    },
    required: ["note"]
  }
}
```

**Tool Behavior:**
- Single parameter: `note` (string)
- Server-side execution (no client confirmation needed - read tool)
- Appends timestamp + note to `profile.coachNotes`
- Called when coach makes observations about user limitations, preferences, or progress

**Example Interaction:**
```
User: "I have access to a home gym with barbell and dumbbells up to 50lbs"

AI: [Calls append_coach_note with: "User has home gym: barbell + dumbbells to 50lbs"]
    "Got it! I'll keep that in mind when suggesting exercises..."
```

**Implementation:** Add alongside existing read tools in `server/lib/read-tools.ts`

## Export/Import Workflow

### Export Format

```json
{
  "profile": {
    "name": "Alex",
    "height": "6'2\"",
    "weight": "185lbs",
    "notes": "Home gym with barbell, dumbbells to 50lbs, bench, rack.\nLeft knee sometimes bothers me - avoid deep knee flexion.\nTraining 4x/week, prefer 60min sessions.",
    "coachNotes": "User has home gym constraints. Focus on barbell compounds.",
    "updatedAt": "2024-10-29T11:30:00Z"
  },
  "weeks": [
    // ... existing weeks array
  ]
}
```

### Import Handling

```typescript
// Import logic (pseudo-code)
const handleImport = async (file: File) => {
  const data = await parseImportFile(file);

  // If array (old format), wrap it
  if (Array.isArray(data)) {
    return { weeks: data, profile: null };
  }

  // If object, extract both
  return {
    weeks: data.weeks || [],
    profile: data.profile || null
  };
};
```

**Import Behaviors:**
- If import includes profile: Replace current profile
- If import has no profile: Keep current profile unchanged

## Implementation Architecture (KISS + DRY)

### Component Structure

**Core Modules (minimal, reusable):**

1. **Types** (`client/src/types/profile.ts`)
   - `UserProfile` interface only
   - Single source of truth for profile shape

2. **Storage** (`client/src/utils/localStorage.ts` - extend existing)
   - `saveProfile(profile)` - persist to `'user_profile'` key
   - `loadProfile()` - retrieve from localStorage
   - Update existing `exportProgram()` to check if profile exists
   - Update existing `importProgram()` to handle both array and object formats

3. **State Management** (`client/src/hooks/useUserProfile.ts`)
   - Single hook: load profile on mount, provide update function
   - Auto-save on blur (in Profile component, not in hook)
   - Keep hook minimal - just load/update, no UI logic

4. **API/Tools** (`server/lib/read-tools.ts` - extend existing)
   - Add `append_coach_note` read tool
   - Simple: append timestamp + text to profile.coachNotes
   - Executed server-side when AI calls it

### UI/UX (Single Page)

**Profile Page** (`client/src/pages/ProfilePage.tsx`)
- Simple form with 5 fields: name, height, weight, notes (textarea), coachNotes (read-only textarea)
- Auto-save each field on blur
- No save button needed
- Accessible via `/profile` route

**Navigation** (in home page menu)
- Add "Profile" option to existing overflow menu alongside Import/Export
- Link to `/profile` route

### AI Integration (Minimal)

**System Prompt** (`server/lib/ai-config.ts` - extend existing)
- Before building workout context, check for profile
- If profile exists and has data, add USER PROFILE section before WORKOUT CONTEXT
- Include: name, height, weight, notes, coachNotes (if any)

**Function Tool** (add to existing tools)
- Add `append_coach_note` to read-tools.ts
- Signature: `{ note: string }`
- Logic: Load profile, append `[timestamp] note` to coachNotes, save

### Data Flow

```
Storage:
  - localStorage['user_profile'] ← UserProfile object
  - localStorage['workout_weeks'] ← Week[] array (unchanged)

Export:
  - Check if profile exists
  - If yes: export { profile, weeks } (object wrapper)
  - If no: export weeks (array, legacy format)
  - Single filename input works for both

Import:
  - Parse JSON
  - Check if Array.isArray(data)
    - If array: load as weeks, keep current profile
    - If object: extract .weeks and .profile
  - Save both to localStorage

AI Context:
  - Load profile from localStorage alongside weeks
  - Include profile data in buildSystemPrompt() if present
  - append_coach_note tool persists changes to localStorage
```

## Success Criteria

- [ ] Profile persists in localStorage separate from weeks
- [ ] Profile page editable with auto-save
- [ ] Export format: object wrapper if profile exists, array if not
- [ ] Import handles both array (legacy) and object formats
- [ ] Profile context included in AI system prompt
- [ ] AI can append coach notes via tool
- [ ] Zero breaking changes to existing workout data/exports

## Implementation Phases (High-Level Order)

1. **Phase 1: Core Storage & State**
   - Add UserProfile type
   - Extend localStorage utils (saveProfile, loadProfile)
   - Create useUserProfile hook

2. **Phase 2: UI & Navigation**
   - Build ProfilePage component with auto-save
   - Add route and menu navigation

3. **Phase 3: Export/Import Compatibility**
   - Update export logic (profile + conditional wrapper)
   - Update import logic (array/object detection + both storage paths)

4. **Phase 4: AI Integration**
   - Extend buildSystemPrompt to include profile
   - Add append_coach_note tool to read-tools.ts
   - Register tool in schemas

5. **Phase 5: Testing & Polish**
   - Test export/import backward compatibility
   - Verify AI receives profile context
   - Verify append_coach_note persists
