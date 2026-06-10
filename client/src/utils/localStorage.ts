import { ProgramEnvelope, LocalSession } from '@/types/workout';

/**
 * Device cache (schema 2). localStorage is a cache of truth already in git,
 * not the journal of record — iOS Safari can evict it for sites untouched
 * ~7 days, which is why delivery is eager (D11). Everything here is
 * reconstructible from the seam except un-delivered local sessions, which is
 * exactly why those deliver eagerly.
 */

const STORAGE_KEY = 'po_workout_v2';

/** Keys from the retired Week[] model — purged on load. */
const LEGACY_KEYS = ['workout_weeks', 'current_week_index'];

export interface StoredState {
  program: ProgramEnvelope | null;
  /** Device-truth records keyed by session id, from first logged set until ingestion. */
  local: Record<string, LocalSession>;
  lastFetchedAt: string | null;
  /** Last generation surfaced to the user — drives the "while you were away" card. */
  lastSeenGeneration: number | null;
}

export const emptyState = (): StoredState => ({
  program: null,
  local: {},
  lastFetchedAt: null,
  lastSeenGeneration: null,
});

export function loadState(): StoredState {
  try {
    for (const key of LEGACY_KEYS) {
      localStorage.removeItem(key);
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as StoredState;
    if (!parsed || typeof parsed !== 'object') return emptyState();
    return {
      program: parsed.program ?? null,
      local: parsed.local ?? {},
      lastFetchedAt: parsed.lastFetchedAt ?? null,
      lastSeenGeneration: parsed.lastSeenGeneration ?? null,
    };
  } catch (error) {
    console.error('Error loading workout state:', error);
    return emptyState();
  }
}

export function saveState(state: StoredState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error saving workout state:', error);
  }
}
