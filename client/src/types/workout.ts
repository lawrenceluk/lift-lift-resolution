/**
 * The seam data model (schema 2 — program-on-tap). Mirrors the contract in
 * POINT-ONE.md §The seam contract; the brain's half is Point One's
 * skills/workout-plan.md. The Week[] shape is retired.
 */

export interface SetResult {
  setNumber: number;
  reps: number;
  weight?: number;
  weightUnit: 'lbs' | 'kg';
  rir?: number;
  completed: boolean;
  skipped?: boolean;
  notes?: string;
}

export interface Exercise {
  id: string; // `<sessionId>-e<n>` — opaque, minted by the brain
  name: string;
  groupLabel?: string;
  warmupSets: number;
  workingSets: number;
  reps: string;
  targetLoad: string;
  restSeconds: number;
  notes?: string;
  userNotes?: string;
  sets: SetResult[];
  skipped?: boolean;
}

/**
 * A prescription on tap. `id` is absolute and opaque (`s-<date>-<slug>`):
 * once published it refers to one prescription forever — never parse it for
 * position; "week 2" style context is brain-derived display (see block).
 */
export interface PrescribedSession {
  id: string;
  theme: string; // 'lower' | 'upper' | 'cardio' | … — brain-owned vocabulary
  name: string;
  plannedDate?: string; // YYYY-MM-DD — an optimistic hint, never a commitment
  warmup?: string[];
  notes?: string;
  exercises: Exercise[];
}

export type SealReason = 'departure' | 'auto' | 'chat';

/**
 * A performed record — a journal of what happened, not a checklist reconciled
 * to zero. Logged sets are facts; unlogged sets are absence. The log filename
 * derives from performedDate: `<performedDate>-<slug>.json`.
 */
export interface PerformedSession extends PrescribedSession {
  performedDate: string; // America/Los_Angeles calendar date of the first logged set
  startedAt?: string;
  departedAt?: string;
  sealed?: SealReason;
  note?: string; // the felt-note from departure
}

export interface ProgramBlock {
  focus: string;
  startedOn?: string;
  note?: string;
}

/** The program envelope the brain writes (program.json). */
export interface ProgramEnvelope {
  schema: number; // 2
  generation: number; // monotonic — all freshness behavior keys off this
  generatedAt: string;
  basedOn: string[]; // log filenames ingested INTO this generation (read receipts)
  changelog: string; // one coach-voiced line for the "while you were away" card
  block?: ProgramBlock;
  queue: PrescribedSession[]; // ordered; first of a theme = next on tap
  history: PerformedSession[]; // ingested records, embedded for history display
}

/**
 * Delivery states for a local record: saved (device only) → delivered (commit
 * confirmed). The third state, ingested, is derived — the record's filename
 * appears in a pulled program's basedOn, at which point git is truth and the
 * local copy is dropped (truth-transfer).
 */
export type DeliveryState = 'saved' | 'delivered';

/** A device-truth session record: the local copy from first logged set until ingestion. */
export interface LocalSession {
  record: PerformedSession;
  delivery: DeliveryState;
  deliveredAs?: string; // server-confirmed log filename (basename), for basedOn matching
}

/** Display status for timeline/list iconography. */
export type SessionStatus = 'planned' | 'in-progress' | 'departed' | 'delivered' | 'ingested';
