# User Profile Data Model Specification

## Overview

This specification defines a simple user profile system that allows users to store personal information relevant to their training program. This data serves dual purposes:
1. **User reference** - Quick reference for body metrics and training considerations
2. **AI context** - Provides the coach AI with essential information for personalized programming and advice

## Goals

- Store minimal, essential user information in a simple format
- Make this data easily editable through a dedicated Profile UI
- Include profile data in the export/import workflow for data portability
- Provide free-form context to the AI coach for better personalization
- Allow the AI coach to append notes to the profile
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

Use separate localStorage keys:

```typescript
const STORAGE_KEY_WEEKS = 'workout_weeks'; // existing
const STORAGE_KEY_PROFILE = 'user_profile'; // new
```

**Rationale:**
- Maintains backward compatibility - existing `workout_weeks` data unchanged
- Profile is logically separate from workout planning data
- Export/import combines both into single JSON

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

### Providing Context to AI

When user interacts with coach AI, the system prompt includes profile data:

```typescript
// Pseudo-code for building AI context
const buildCoachContext = (profile: UserProfile | null, weeks: Week[]) => {
  let context = `Current Training Program:\n${summarizeWeeks(weeks)}\n\n`;

  if (profile && Object.keys(profile).length > 0) {
    context += `User Profile:\n`;
    if (profile.name) context += `Name: ${profile.name}\n`;
    if (profile.height) context += `Height: ${profile.height}\n`;
    if (profile.weight) context += `Weight: ${profile.weight}\n`;
    if (profile.notes) context += `\n${profile.notes}\n`;
    if (profile.coachNotes) context += `\nPrevious Coach Notes:\n${profile.coachNotes}\n`;
  }

  return context;
};
```

### AI Writing to Profile

The AI coach can call a function to append to coach notes:

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

**Example AI Interaction:**

```
User: "I have access to a home gym with barbell and dumbbells up to 50lbs"

AI: [Calls append_coach_note: "Home gym setup with barbell and dumbbells to 50lbs"]

    "Got it! I'll keep that in mind when suggesting exercises..."
```

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

## Implementation Notes

### Storage
- Add new localStorage key `user_profile`
- Keep existing `workout_weeks` unchanged for backward compatibility
- Export combines both into single JSON object

### UI Components
- New Profile page at `/profile` route
- Add "Profile" option to home overflow menu
- Simple form with 4 fields (name, height, weight, notes) + read-only coach notes
- Auto-save on blur

### AI Integration
- Include profile in AI system prompt when present
- Single function tool `append_coach_note` for AI to write observations
- Coach notes are append-only (timestamped entries)

### Import/Export
- Export: `{ profile?, weeks }`
- Import: Handle both array (legacy) and object (new) formats
- No user prompt needed - just replace profile if present in import

## Success Criteria

- [ ] Profile page accessible from home menu
- [ ] Profile persists in localStorage
- [ ] Profile included in export/import
- [ ] AI receives profile context
- [ ] AI can append coach notes
- [ ] Backward compatible with existing data

## Implementation Steps

1. Add `UserProfile` type in `client/src/types/profile.ts`
2. Add profile storage functions in `client/src/utils/localStorage.ts`
3. Create `useUserProfile` hook in `client/src/hooks/useUserProfile.ts`
4. Build Profile page component
5. Add route and menu navigation
6. Update export/import to include profile
7. Update AI coach integration to use profile context
8. Add `append_coach_note` function tool for AI
