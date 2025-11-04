# Product Vision: Authentication + User Profiles
**One-Page Product Requirements Document**

---

## Executive Summary

Transform the app from a **single-user, browser-local tool** to a **multi-user, cloud-backed platform** that preserves the current guest experience while adding premium features for signed-in users. The goal is to enable cross-device access, program persistence, profile-based personalization, and foundation for future social/sharing features—all while maintaining zero friction for first-time users.

---

## Core Principles

### 1. **Guest-First, Upgrade-Optional**
- Anonymous users can use the full app today (no forced signup)
- All current localStorage features work as-is for guests
- Account creation unlocks premium experience, not core functionality
- Seamless upgrade path: guests can create account and sync their local data

### 2. **User Data is Sacred**
- Users own their workout data completely
- Export/import functionality preserved and enhanced
- Users can have multiple workout programs (not just one)
- Privacy-first: users only see their own data
- Offline capability: guests continue to work without internet

### 3. **Minimal Disruption**
- No redesign of core workout tracking UI
- Authentication layer sits alongside existing features
- No breaking changes to export/import format
- Existing localStorage users migrate invisibly

### 4. **Supabase Foundation**
- Leverage existing PostgreSQL setup (Neon)
- Use Supabase Auth for secure, cost-effective authentication
- Database-level Row Level Security (RLS) enforces data isolation
- Supabase built-in tools: storage, real-time (for future features)

---

## Target User Journeys

### Journey 1: Anonymous User
```
→ Open app
→ Start building workouts (localStorage)
→ Export program anytime (guest feature remains)
→ Close app
✓ All data persists locally, no signup required
```

### Journey 2: Guest Converts to Registered User
```
→ Open app (guest mode)
→ Build several workout programs (localStorage)
→ See "Create Account" prompt (contextual)
→ Sign up with email
→ Programs automatically sync to database
→ Can now access from other devices
→ Edit profile (height, weight, notes) for personalization
```

### Journey 3: Returning Registered User
```
→ Open app
→ Automatically signed in (session persists)
→ Load their cloud programs
→ Switch between multiple programs
→ Export as JSON, or continue cloud-synced
→ Ask coach questions with profile context (coach knows their constraints)
```

---

## Feature Set

### Phase 0: Guest Mode (TODAY)
- [x] Full workout tracking in localStorage
- [x] Export/import JSON programs
- [x] Coach AI integration
- [x] Warmup + exercise logging

### Phase 1: Authentication + Multi-User (MVP)

**Milestone 1.1: Core Auth Infrastructure** ✅ COMPLETE
- [x] Supabase project setup (connection, environment variables)
- [x] Database schema: user_profiles and workout_programs tables
- [x] RLS policies for data isolation
- [x] Supabase client setup in React (`client/src/lib/supabase.ts`)

**Milestone 1.2: Auth UI** ✅ COMPLETE
- [x] Unified login form (email only, passwordless, `LoginForm.tsx`)
- [x] Magic link callback page (handles email verification, `AuthCallbackPage.tsx`)
- [x] Sign-out functionality
- [x] Auth state management (`AuthContext.tsx`, `useAuth.ts` hook)
- [x] Protected routes based on auth state
- [x] Auth menu items in app (Sign In/Profile links)

**Note:** Signup and signin are merged into single form since both use magic links (no password distinction needed)

**Milestone 1.3: User Profile** ✅ COMPLETE
- [x] Profile page component (`ProfilePage.tsx` at `/profile` route)
- [x] Editable fields: name, height, weight, training notes
- [x] Coach notes display with delete capability
- [x] Auto-save on blur (optimistic updates with 1s debounce)
- [x] Menu link to profile (User icon in app menu)
- [x] useUserProfile hook with localStorage-first + background DB sync

**Implementation Details:**
- Profile loads instantly from localStorage (no blocking)
- Changes apply immediately to state and localStorage (optimistic update)
- Background sync to Supabase happens asynchronously (1s debounce)
- Eventual consistency: local changes take precedence over DB values
- Sync failures are logged but don't block user

**Milestone 1.4: Data Persistence Upgrade** ✅ COMPLETE
- [x] Update useWorkoutProgram hook: read from database for logged-in users
- [x] Keep localStorage for guests
- [x] Sync workouts on update (database for users, localStorage for guests)

**Implementation Details:**
- `useWorkoutProgram` now integrated with `useAuth` to detect logged-in users
- localStorage-first loading: data loads instantly from localStorage (no blocking)
- Background sync to database (1s debounce) for authenticated users
- Optimistic updates: all mutations apply immediately, sync happens asynchronously
- Guest experience unchanged: localStorage-only with same API
- All mutation functions (addSet, updateSet, etc.) automatically sync when user is authenticated

**Milestone 1.5: Data Migration** ⏳ PENDING
- [ ] Migration tool: detect guest data and offer to import on signup
- [ ] One-click sync: copy localStorage to user's database
- [ ] Handle conflicts (existing user with local data)

**Milestone 1.6: Export/Import Enhancement** ⏳ PENDING
- [ ] Export: conditional format (array if guest/no profile, object wrapper if user with profile)
- [ ] Import: auto-detect format and handle both
- [ ] Backward compatibility verified

### Phase 2: Enhanced AI Coaching (Post-MVP)
- [ ] Profile context in AI system prompt
- [ ] append_coach_note tool (AI can save observations)
- [ ] Coach understands user constraints (injuries, equipment, goals)

### Phase 3: Multi-Program Support (Future)
- [ ] Users can create/switch between multiple programs
- [ ] Program naming and organization
- [ ] "Create from template" feature (sample programs)

### Phase 4: Social + Sharing (Optionally)
- [ ] Share programs with other users
- [ ] Collaborative program editing
- [ ] Program marketplace/discovery
- [ ] Real-time sync for team training

---

## Key Requirements

### Authentication
- **Provider:** Supabase Auth
- **Method:** Passwordless OTP codes (email only)
  - User enters email → receives 6-digit code in email → enters code → signed in
  - No password to remember, no password reset flow needed
  - Simpler UX, better security, lower support burden
  - Code expires in 1 hour, max 5 incorrect attempts before code refreshes
- **Future:** OAuth (Google, Apple) added post-MVP as alternatives
- **Security:** Database-level RLS, session tokens, HTTPS enforced, email verification built-in
- **Cost:** Free up to 50k MAU (aligns with growth projections)
- **Guest Mode:** Users can use app indefinitely without signup, optionally create account later

### User Profile
- **Fields:** name, height, weight, notes (free-form), coachNotes (user-editable, AI appends to it)
- **Coach Notes Management:** Users can view full history and delete individual notes they disagree with
- **Storage:** Separate localStorage key (`user_profile`) + database column
- **Auto-save:** Changes persist on blur, no explicit save button
- **Visibility:** Profile accessible at `/profile` route, linked from app menu (not in-your-face)

### Data Models
```
Guest Mode:
  └─ localStorage['workout_weeks'] = Week[]  (unchanged)

Registered User:
  └─ database.workout_programs {
       id, user_id, weeks (JSONB), created_at, updated_at
     }
  └─ database.user_profiles {
       id, user_id, name, height, weight, notes, coachNotes, updated_at
     }
```

### Export/Import
- **Guest Export:** Returns `Week[]` array (existing JSON format)
- **User Export:** Returns `{ weeks: Week[], profile?: UserProfile }` if profile exists
- **Smart Import:** Detects array vs object, migrates data appropriately
  - Array format: loads as weeks, preserves existing profile
  - Object format: loads both weeks and profile
- **Result:** Backward compatible, users can move between devices seamlessly

### Coach AI Integration
- **Current session context:** Unchanged (currentSession, currentWeek, fullProgram)
- **Profile context:** Added to system prompt BEFORE workout context when available
- **append_coach_note tool:** New read tool, AI can save observations to profile
- **Benefit:** Coach knows user constraints, gives better suggestions

### Migration Strategy
**For Existing Users:**
1. Users continue as guests indefinitely (no forced signup)
2. When they create account, offer to sync their guest programs
3. One-click migration: copies localStorage data to new user's database
4. Guest data cleared (user opts-in for this)

**For New Users:**
1. Can use as guest immediately (optional signup)
2. Prompted to create account after first export or after N days
3. Can create account anytime without losing data

---

## Non-Goals (Out of Scope)

- ❌ Team/organization features (Phase 4+)
- ❌ Social feed or program discovery (Phase 4+)
- ❌ Workout templates or program marketplace (Phase 3+)
- ❌ Offline-first sync (future investigation)
- ❌ Mobile apps (web-first for now)
- ❌ Video tutorials or exercise library
- ❌ Advanced analytics or reporting

---

## Success Metrics

### User Engagement
- [ ] 70% of guests eventually create accounts
- [ ] Users with profiles have 2x higher retention
- [ ] Cross-device logins enabled

### Data
- [ ] 95%+ successful migrations from localStorage
- [ ] Zero data loss during migration
- [ ] All export/import formats backward compatible

### Coach AI
- [ ] Profile context improves suggestion relevance (qualitative feedback)
- [ ] Coach can save 5+ notes per user (adoption signal)

---

## Decisions Made

1. **Authentication Method:** Passwordless OTP codes (email-only). No password handling, no password reset needed. Users enter email, receive 6-digit code in email, enter code to sign in.
2. **Profile Sync Strategy:** localStorage-first with eventual consistency. Profile loads instantly from localStorage, changes apply immediately to state, background sync to Supabase happens asynchronously (1s debounce). Sync failures don't block user—local data is always safe.
3. **Data Ownership & Deletion:** Users can delete accounts. Data deletion is a post-Phase 1 problem.
4. **Guest Experience:** Guests can use app indefinitely. Signup prompt lives in app menu (optional, not in-your-face).
5. **Program Limits:** No limits for free tier.
6. **Export Format:** Profile included in export JSON when user has one (backward compatible).
7. **Email Verification:** Required for account creation via magic link (Supabase built-in).
8. **Coach Notes:** User-deletable (stored as newline-separated strings, users can delete individual notes they disagree with).
9. **Privacy Policy:** Deferred (handle in production readiness phase).
10. **Auth UI:** Custom forms using shadcn/ui components. Passwordless sign-up/sign-in forms, email-only.

---

## Architecture Overview (High-Level)

```
┌─────────────────────────────────────────────────────┐
│                    REACT FRONTEND                    │
├─────────────────────────────────────────────────────┤
│  Auth Context (useAuth)    │  useWorkoutProgram Hook  │
│  ├─ currentUser            │  ├─ Load from DB/storage │
│  ├─ isLoading              │  ├─ Save mutations       │
│  └─ signUp/signIn/signOut  │  └─ Export/import logic  │
│                                                       │
│  useUserProfile Hook                                 │
│  ├─ Load profile                                     │
│  └─ Update (auto-save)                               │
└─────────────────────────────────────────────────────┘
          ↓ SUPABASE JS CLIENT (secure)
┌─────────────────────────────────────────────────────┐
│                 SUPABASE BACKEND                      │
├─────────────────────────────────────────────────────┤
│  Auth Service          │  PostgreSQL Database         │
│  ├─ Sign up/in/out     │  ├─ auth.users (supabase)  │
│  ├─ Sessions           │  ├─ user_profiles          │
│  ├─ RLS policies       │  ├─ workout_programs       │
│  └─ Password reset     │  └─ RLS policies (enforce) │
│                                                       │
│  Read-Only Tools (AI)  │                             │
│  ├─ get_workout_data   │                             │
│  ├─ get_current_week   │                             │
│  └─ append_coach_note  │ ← NEW                       │
└─────────────────────────────────────────────────────┘
```

---

## Next Steps

1. **Database Design:** Finalize exact schema (JSONB for weeks, columns for profile)
2. **Supabase Setup:** Create project, configure auth, set up RLS policies
3. **Milestone 1.1 Implementation:** Start with auth infrastructure
4. **Milestone-by-Milestone Execution:** Follow the 6 milestones for Phase 1
5. **Testing & Integration:** Verify guest/user flows, export/import compatibility

---

## Appendix A: Pre-Implementation Setup (Outside Codebase)

This section walks through all Supabase console configuration needed before development begins.

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in (or create account)
2. Click "New Project"
3. Choose organization and project name (e.g., "lift-lift-resolution")
4. Choose region closest to you (affects latency)
5. Create a strong database password (will need this)
6. Wait for project to initialize (~2 minutes)

**Result:** You now have a PostgreSQL database provisioned by Supabase.

### Step 2: Obtain API Keys

Once project is created, go to **Settings → API**:

1. **Copy these 4 values** (you'll need them for .env):
   - `VITE_SUPABASE_URL` → "Project URL" (looks like `https://xxxxx.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY` → "anon public" key (safe for frontend, restricted by RLS)
   - `SUPABASE_SERVICE_ROLE_KEY` → "service_role" key (secret, backend-only!)
   - `SUPABASE_DB_PASSWORD` → Your database password from Step 1

2. **Store securely:**
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` → `.env` file (safe, frontend-visible)
   - `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_DB_PASSWORD` → `.env.local` (secret, backend-only)

**File Structure:**
```
.env (git-tracked, safe for frontend keys)
├─ VITE_SUPABASE_URL=https://xxxxx.supabase.co
└─ VITE_SUPABASE_ANON_KEY=eyJhbGc...

.env.local (git-ignored, secret backend keys)
├─ SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
└─ SUPABASE_DB_PASSWORD=your_strong_password
```

### Step 3: Enable Auth Providers

Go to **Authentication → Providers**:

1. **Email** provider (Magic Links)
   - Turn ON "Email" (passwordless magic links)
   - Go to **Settings** and verify:
     - "Confirm email" is toggled ON
     - Email templates are in English (default)
     - Magic link redirect is set (we'll configure this in Step 4)

2. **Disable other providers for now** (turn OFF):
   - Email/Password (we're not using passwords)
   - Google, GitHub, Discord, etc. (enable post-MVP if needed)

**Result:** Users receive magic links via email, click link to sign in (no password needed).

### Step 4: Configure Magic Link Redirect

Go to **Authentication → URL Configuration**:

1. Click "Redirect URLs"
2. Add these redirect URLs:
   - `http://localhost:3000/login/callback` (local development)
   - `http://localhost:5000/login/callback` (npm run dev)
   - Your Replit dev URL (e.g., `https://your-project-name.replit.dev/login/callback`)
   - Your production URL (e.g., `https://yourapp.com/login/callback`) - add this post-MVP

**Why multiple redirects?**
- Supabase whitelists safe redirect URLs for security
- We support multiple environments, each needs its own URL
- The frontend automatically uses `window.location.origin` so it works on any domain
- This means the same Supabase project works across localhost, Replit dev, and production without changing config

**Magic Link Flow:**
1. User requests magic link at `/login` page
2. Supabase sends email with link: `https://[domain]/login/callback?token=...&type=...`
3. User clicks link, browser navigates to `/login/callback`
4. Frontend reads token from URL, Supabase validates it automatically
5. User is automatically signed in
6. Frontend redirects to home page (`/`)

### Step 5: Create Database Tables

Go to **SQL Editor** → create new query:

**Query 1: Create user_profiles table**
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  height TEXT,
  weight TEXT,
  notes TEXT,
  coach_notes TEXT, -- AI appends here, user can delete individual notes
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view/edit their own profile
CREATE POLICY "Users manage their own profile"
  ON user_profiles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create trigger to update updated_at on changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Query 2: Create workout_programs table**
```sql
CREATE TABLE workout_programs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weeks JSONB NOT NULL, -- Stores entire Week[] structure as JSON
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE workout_programs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view/edit their own programs
CREATE POLICY "Users manage their own workout programs"
  ON workout_programs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_workout_programs_updated_at
  BEFORE UPDATE ON workout_programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index for faster lookups by user_id
CREATE INDEX idx_workout_programs_user_id ON workout_programs(user_id);
```

**Execution (if creating table fresh):**
1. Copy Query 1 into SQL Editor
2. Click "Run"
3. Copy Query 2 into SQL Editor
4. Click "Run"
5. Verify both tables appear in **Table Editor** sidebar

**Migration (if table already exists with incorrect schema):**

If you already created `workout_programs` table and need to fix it, run this in SQL Editor:
```sql
-- Drop the old table if it exists
DROP TABLE IF EXISTS workout_programs CASCADE;

-- Create the correct table
CREATE TABLE workout_programs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weeks JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE workout_programs ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users manage their own workout programs"
  ON workout_programs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_workout_programs_updated_at
  BEFORE UPDATE ON workout_programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_workout_programs_user_id ON workout_programs(user_id);
```

**Result:** Two tables created with RLS policies enforced. Only users can access their own data. Each user can have multiple programs with unique IDs.

### Step 6: Verify RLS Policies

Go to **Authentication → Policies**:

1. Click on `user_profiles` table
2. Verify policy "Users manage their own profile" exists
3. Click on `workout_programs` table
4. Verify policy "Users manage their own workout programs" exists

**If policies are missing**, create them manually:
- Go to **SQL Editor** and paste the CREATE POLICY statements from above

**Result:** RLS is active. Database enforces user isolation at the SQL level.

### Step 7: Test Connection (Optional but Recommended)

Go to **SQL Editor** and run:
```sql
SELECT * FROM auth.users;
```

If you get a "permission denied" error, RLS is working correctly (anon key can't see auth.users). This is expected and good.

### Step 8: Document Your Secrets

Create a `.env.example` file in your repo (to share with team):
```
# Supabase (public, safe for frontend)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# Supabase (secret, backend only)
# SUPABASE_SERVICE_ROLE_KEY=<ask in 1password/vault>
# SUPABASE_DB_PASSWORD=<ask in 1password/vault>
```

**DO NOT** commit `.env` or `.env.local` to git. Ensure `.gitignore` includes:
```
.env
.env.local
.env*.local
```

**But DO commit `.env.example`** so team members know what keys to create locally.

---

## Appendix B: Implementation Status & File Locations

### Milestone 1.1-1.3 Complete Files

**Auth Infrastructure:**
- `client/src/lib/supabase.ts` - Supabase client singleton
- `client/src/types/auth.ts` - AuthState, UserProfile, AuthContextType
- `client/src/contexts/AuthContext.tsx` - Auth state management & operations
- `client/src/hooks/useAuth.ts` - useAuth hook for accessing auth context
- `.env` & `.env.example` - Environment variables for Supabase keys

**Auth UI:**
- `client/src/pages/AuthPage.tsx` - Main auth page at `/login`
- `client/src/components/LoginForm.tsx` - Email input form (Step 1: enters email, sends OTP code)
- `client/src/components/OtpVerificationForm.tsx` - OTP verification form (Step 2: enters 6-digit code)
- Removed: `AuthCallbackPage.tsx` (no longer needed with OTP-based auth)

**User Profile:**
- `client/src/pages/ProfilePage.tsx` - Profile management at `/profile`
- `client/src/hooks/useUserProfile.ts` - Profile state + localStorage-first sync
- `client/src/types/auth.ts` - UserProfile type definition

**Workout Data Persistence:**
- `client/src/hooks/useWorkoutProgram.ts` - Enhanced with useAuth integration + cloud sync
- Maintains localStorage for guests, syncs to database for logged-in users
- All mutation functions (addSet, updateSet, etc.) automatically handle both

**App Integration:**
- `client/src/App.tsx` - AuthProvider wrapper, route setup
- `client/src/pages/WorkoutTrackerApp.tsx` - Auth menu items (Profile, Sign Out)

### Sync Architecture (Unified Pattern)

**Both `useUserProfile` and `useWorkoutProgram` implement identical three-layer persistence:**

```typescript
// Layer 1: React State (instant)
const [data, setData] = useState(initialValue);

// Layer 2: localStorage (sync)
localStorage.setItem(key, JSON.stringify(data));

// Layer 3: Supabase (debounced background)
// Fires after 1 second of inactivity, only if data changed
queueSync() → setTimeout(1000) → syncToDB()
```

**Change Detection (DRY Pattern):**
```typescript
// Hash-based comparison prevents unnecessary syncs
const hash = JSON.stringify(data);
if (hash === lastSyncedHash) {
  console.log('No changes, skip sync');
  return;
}
lastSyncedHash = hash; // Update after successful sync
```

**Key Features:**
- ✅ Instant UI feedback (state updates immediately)
- ✅ Offline safety (localStorage backup)
- ✅ Bandwidth efficient (skip syncs if unchanged)
- ✅ Eventual consistency (local changes always win)
- ✅ Non-blocking (sync failures logged, don't affect UX)
- ✅ Debounced syncing (batches rapid edits)
- ✅ Automatic cleanup (timeout cleared on unmount)

**Applied to:**
1. User profile (name, height, weight, notes, coach_notes)
2. Workout programs (weeks array with all sessions/exercises/sets)

### Pending Implementation (Milestones 1.5-1.6)

**Milestone 1.5: Data Migration**
- Detect guest localStorage data when user signs up
- Offer one-click sync to copy data to new user's database
- Handle conflicts (existing user trying to migrate old data)

**Milestone 1.6: Export/Import Enhancement**
- Export format currently unchanged (Week[] array)
- Next: Add profile wrapper for users with profile
- Auto-detect format on import (array vs object wrapper)
- Ensure backward compatibility with existing exports

---

## Appendix C: Why Supabase?

- ✅ PostgreSQL native (you already have one)
- ✅ 50k free MAUs (vs 10k competitors, covers bootstrapped growth)
- ✅ RLS at database level (security, not just application code)
- ✅ No webhook complexity or sync delays
- ✅ Built-in for real-time (future social features)
- ✅ 2-3 day MVP timeline (existing analysis confirms this)
