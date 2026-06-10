import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ProgramEnvelope,
  PrescribedSession,
  PerformedSession,
  LocalSession,
  SetResult,
  Exercise,
  SessionStatus,
} from '@/types/workout';
import { loadState, saveState, StoredState } from '@/utils/localStorage';
import { todayPT, logFileName } from '@/utils/timeHelpers';
import { fetchProgram, postSession } from '@/lib/api';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

/**
 * The client half of the seam (POINT-ONE.md §The seam contract).
 *
 * Truth model (D2): a session is brain-truth while it sits in the queue;
 * device-truth from the first logged set (a LocalSession record) until the
 * brain ingests it; git-truth after — on pull, ingested sessions' local copies
 * are dropped in favor of the program's embedded history records.
 *
 * Delivery (D11): eager. Records deliver on seal (departure or end-of-day
 * auto-seal) and retry on open/focus/online. localStorage is a cache, not the
 * journal of record.
 */
export const useWorkoutProgram = () => {
  const [state, setState] = useState<StoredState>(() => loadState());
  const [initializing, setInitializing] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Mirror for async flows (delivery) that need post-render state.
  const stateRef = useRef(state);
  const inFlight = useRef<Set<string>>(new Set());

  const update = useCallback((fn: (s: StoredState) => StoredState) => {
    setState((prev) => {
      const next = fn(prev);
      if (next !== prev) {
        stateRef.current = next;
        saveState(next);
      }
      return next;
    });
  }, []);

  // ----- delivery (saved → delivered) --------------------------------------

  const deliverSession = useCallback(
    async (sessionId: string): Promise<boolean> => {
      const ls = stateRef.current.local[sessionId];
      if (!ls || !ls.record.sealed || ls.delivery === 'delivered') return ls?.delivery === 'delivered';
      if (inFlight.current.has(sessionId)) return false;
      inFlight.current.add(sessionId);
      try {
        const payload = ls.record;
        const res = await postSession(payload);
        if (!res.ok) return false;
        const deliveredAs = res.path.split('/').pop() ?? logFileName(payload.name, payload.performedDate);
        update((s) => {
          const current = s.local[sessionId];
          // The record may have been amended while the POST was in flight —
          // only mark delivered if it's still the same content we sent.
          if (!current || JSON.stringify(current.record) !== JSON.stringify(payload)) return s;
          return {
            ...s,
            local: { ...s.local, [sessionId]: { ...current, delivery: 'delivered', deliveredAs } },
          };
        });
        return true;
      } catch (err) {
        console.warn('Delivery failed (kept on device, will retry):', err);
        return false;
      } finally {
        inFlight.current.delete(sessionId);
      }
    },
    [update]
  );

  /** Retry path: deliver every sealed-but-undelivered record. */
  const deliverPending = useCallback(async () => {
    const pending = Object.entries(stateRef.current.local).filter(
      ([, ls]) => ls.record.sealed && ls.delivery === 'saved'
    );
    for (const [id] of pending) {
      await deliverSession(id);
    }
  }, [deliverSession]);

  // ----- sealing ------------------------------------------------------------

  /**
   * Auto-seal (D7): a session with logged sets that idled past the end of its
   * local calendar day seals itself; the departure tap improves the record,
   * the data never depends on it. Started-but-empty stale records are
   * discarded — no facts, no record.
   */
  const sealStale = useCallback(() => {
    const today = todayPT();
    update((s) => {
      let changed = false;
      const local = { ...s.local };
      for (const [id, ls] of Object.entries(local)) {
        if (ls.record.sealed || ls.record.performedDate >= today) continue;
        const hasSets = ls.record.exercises.some((ex) => (ex.sets || []).length > 0);
        if (hasSets) {
          local[id] = {
            ...ls,
            record: { ...ls.record, sealed: 'auto', departedAt: new Date().toISOString() },
            delivery: 'saved',
          };
        } else {
          delete local[id];
        }
        changed = true;
      }
      return changed ? { ...s, local } : s;
    });
  }, [update]);

  /** "Done for today" (D6): seal with an optional felt-note, then deliver eagerly. */
  const departSession = useCallback(
    async (sessionId: string, note?: string): Promise<{ delivered: boolean }> => {
      const ls = stateRef.current.local[sessionId];
      if (!ls) return { delivered: false };
      update((s) => {
        const current = s.local[sessionId];
        if (!current) return s;
        const trimmed = note?.trim();
        const record: PerformedSession = {
          ...current.record,
          departedAt: new Date().toISOString(),
          sealed: 'departure',
          ...(trimmed ? { note: trimmed } : {}),
        };
        return { ...s, local: { ...s.local, [sessionId]: { ...current, record, delivery: 'saved' } } };
      });
      const delivered = await deliverSession(sessionId);
      return { delivered };
    },
    [update, deliverSession]
  );

  // ----- the program (pull + truth-transfer) --------------------------------

  const applyEnvelope = useCallback(
    (envelope: ProgramEnvelope) => {
      update((s) => {
        const local = { ...s.local };
        for (const [id, ls] of Object.entries(local)) {
          const fileName = ls.deliveredAs ?? logFileName(ls.record.name, ls.record.performedDate);
          const ingested =
            envelope.basedOn.includes(fileName) ||
            envelope.history.some((h) => h.id === id && h.performedDate === ls.record.performedDate);
          // Truth-transfer (D2): once ingested, git is truth — drop the local
          // copy; the envelope's history record serves display from here on.
          if (ingested) delete local[id];
        }
        return {
          ...s,
          program: envelope,
          local,
          lastFetchedAt: new Date().toISOString(),
          lastSeenGeneration: s.lastSeenGeneration ?? envelope.generation,
        };
      });
    },
    [update]
  );

  const fetchAndApply = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    try {
      const envelope = await fetchProgram();
      if (!envelope || envelope.schema !== 2 || !Array.isArray(envelope.queue)) {
        const error =
          'Point One sent a program this app version does not understand (expected schema 2).';
        setFetchError(error);
        return { ok: false, error };
      }
      applyEnvelope(envelope);
      setFetchError(null);
      return { ok: true };
    } catch (err) {
      const error = (err as Error).message;
      setFetchError(error);
      return { ok: false, error };
    }
  }, [applyEnvelope]);

  /** Manual pull (debug action — D1 demotes it; the sync loop is the real path). */
  const pullProgram = fetchAndApply;

  // ----- init: seal stale days, retry deliveries, hydrate -------------------

  useEffect(() => {
    let cancelled = false;
    (async () => {
      sealStale();
      void deliverPending();
      // No sample fallback (D13): a fresh device hydrates from the seam or
      // fails visibly. A cached program renders immediately; fetch errors on
      // top of a cache are non-blocking staleness, not failures.
      if (!stateRef.current.program) {
        await fetchAndApply();
      }
      if (!cancelled) setInitializing(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- session mutation (device-truth from first logged set) --------------

  /**
   * Route a mutation at a session. Materializes the queue prescription into a
   * device-truth LocalSession on first touch. History (ingested) records are
   * read-only — corrections go through the brain (D9).
   */
  const mutateSession = useCallback(
    (
      sessionId: string,
      fn: (record: PerformedSession) => PerformedSession,
      opts: { unsealing?: boolean } = {}
    ) => {
      update((s) => {
        const existing = s.local[sessionId];
        let base: PerformedSession;
        if (existing) {
          base = existing.record;
        } else {
          const prescription = s.program?.queue.find((q) => q.id === sessionId);
          if (!prescription) return s;
          base = {
            ...clone(prescription),
            performedDate: todayPT(),
            startedAt: new Date().toISOString(),
          };
        }
        let record = fn(clone(base));
        if (opts.unsealing && record.sealed) {
          // Same-day amend (D9): new training activity un-seals; the next
          // departure (or end-of-day auto-seal) re-delivers over the same file.
          const { sealed, departedAt, ...rest } = record;
          record = rest as PerformedSession;
        }
        return {
          ...s,
          local: {
            ...s.local,
            [sessionId]: { record, delivery: 'saved', deliveredAs: existing?.deliveredAs },
          },
        };
      });
    },
    [update]
  );

  const addSet = useCallback(
    (sessionId: string, exerciseId: string, set: SetResult) => {
      mutateSession(
        sessionId,
        (record) => {
          const hadSets = record.exercises.some((ex) => (ex.sets || []).length > 0);
          const next: PerformedSession = {
            ...record,
            // performedDate is the PT date of the FIRST logged set (D8).
            ...(hadSets ? {} : { performedDate: todayPT() }),
            startedAt: record.startedAt || new Date().toISOString(),
            exercises: record.exercises.map((ex) =>
              ex.id === exerciseId ? { ...ex, sets: [...ex.sets, set] } : ex
            ),
          };
          return next;
        },
        { unsealing: true }
      );
    },
    [mutateSession]
  );

  const updateSet = useCallback(
    (sessionId: string, exerciseId: string, setNumber: number, updates: Partial<SetResult>) => {
      mutateSession(
        sessionId,
        (record) => ({
          ...record,
          exercises: record.exercises.map((ex) =>
            ex.id === exerciseId
              ? {
                  ...ex,
                  sets: ex.sets.map((set) => (set.setNumber === setNumber ? { ...set, ...updates } : set)),
                }
              : ex
          ),
        }),
        { unsealing: true }
      );
    },
    [mutateSession]
  );

  const deleteSet = useCallback(
    (sessionId: string, exerciseId: string, setNumber: number) => {
      mutateSession(
        sessionId,
        (record) => ({
          ...record,
          exercises: record.exercises.map((ex) =>
            ex.id === exerciseId
              ? {
                  ...ex,
                  sets: ex.sets
                    .filter((set) => set.setNumber !== setNumber)
                    .map((set, index) => ({ ...set, setNumber: index + 1 })),
                }
              : ex
          ),
        }),
        { unsealing: true }
      );
    },
    [mutateSession]
  );

  const setExerciseSkipped = useCallback(
    (sessionId: string, exerciseId: string, skipped: boolean) => {
      mutateSession(
        sessionId,
        (record) => ({
          ...record,
          exercises: record.exercises.map((ex) => (ex.id === exerciseId ? { ...ex, skipped } : ex)),
        }),
        { unsealing: true }
      );
    },
    [mutateSession]
  );

  const updateExerciseNotes = useCallback(
    (sessionId: string, exerciseId: string, userNotes: string) => {
      mutateSession(sessionId, (record) => ({
        ...record,
        exercises: record.exercises.map((ex) => (ex.id === exerciseId ? { ...ex, userNotes } : ex)),
      }));
    },
    [mutateSession]
  );

  /** Deviate-and-log: in-the-gym modifications to one session's exercise. */
  const updateExercise = useCallback(
    (sessionId: string, exerciseId: string, updates: Partial<Exercise>) => {
      mutateSession(
        sessionId,
        (record) => ({
          ...record,
          exercises: record.exercises.map((ex) => {
            if (ex.id !== exerciseId) return ex;
            const isBodyweight = (load: string) =>
              load.toLowerCase().includes('bodyweight') || load.toLowerCase() === 'bw';
            const nameChanged = !!updates.name && updates.name !== ex.name;
            const loadTypeChanged =
              !!updates.targetLoad && isBodyweight(updates.targetLoad) !== isBodyweight(ex.targetLoad);
            const cleared = nameChanged || loadTypeChanged ? { ...updates, sets: [] } : updates;
            return { ...ex, ...cleared };
          }),
        }),
        { unsealing: true }
      );
    },
    [mutateSession]
  );

  // ----- derived views -------------------------------------------------------

  const program = state.program;
  const local = state.local;

  /** Every performed record visible to the app: ingested history (git truth,
   *  read-only) + device-truth local records (editable). Local wins on id. */
  const performedRecords = useMemo(() => {
    const records: { session: PerformedSession; editable: boolean }[] = [];
    const localIds = new Set(Object.keys(local));
    for (const h of program?.history ?? []) {
      if (!localIds.has(h.id)) records.push({ session: h, editable: false });
    }
    for (const ls of Object.values(local)) {
      records.push({ session: ls.record, editable: true });
    }
    return records.sort((a, b) => b.session.performedDate.localeCompare(a.session.performedDate));
  }, [program, local]);

  const statusOf = useCallback(
    (sessionId: string): SessionStatus => {
      const ls = local[sessionId];
      if (ls) {
        if (!ls.record.sealed) {
          const hasSets = ls.record.exercises.some((ex) => (ex.sets || []).length > 0);
          return hasSets ? 'in-progress' : 'planned';
        }
        return ls.delivery === 'delivered' ? 'delivered' : 'departed';
      }
      if (program?.history.some((h) => h.id === sessionId)) return 'ingested';
      return 'planned';
    },
    [local, program]
  );

  /** Look a session up anywhere: device-truth first, then queue, then history. */
  const getSession = useCallback(
    (sessionId: string): { session: PrescribedSession | PerformedSession; status: SessionStatus; isLocal: boolean } | null => {
      const ls = local[sessionId];
      if (ls) return { session: ls.record, status: statusOf(sessionId), isLocal: true };
      const queued = program?.queue.find((q) => q.id === sessionId);
      if (queued) return { session: queued, status: 'planned', isLocal: false };
      const history = program?.history.find((h) => h.id === sessionId);
      if (history) return { session: history, status: 'ingested', isLocal: false };
      return null;
    },
    [local, program, statusOf]
  );

  /** The queue minus consumed sessions (departed = consumed, D10). */
  const queueView = useMemo(() => {
    const consumed = new Set([
      ...Object.entries(local)
        .filter(([, ls]) => !!ls.record.sealed)
        .map(([id]) => id),
      ...(program?.history ?? []).map((h) => h.id),
    ]);
    return (program?.queue ?? []).filter((q) => !consumed.has(q.id));
  }, [program, local]);

  const hasUndelivered = useMemo(
    () => Object.values(local).some((ls) => ls.delivery === 'saved' && ls.record.sealed),
    [local]
  );

  return {
    initializing,
    fetchError,
    program,
    lastFetchedAt: state.lastFetchedAt,
    queueView,
    performedRecords,
    getSession,
    statusOf,
    // capture
    addSet,
    updateSet,
    deleteSet,
    setExerciseSkipped,
    updateExerciseNotes,
    updateExercise,
    // departure + delivery
    departSession,
    deliverPending,
    hasUndelivered,
    // seam
    pullProgram,
    sealStale,
  };
};

export type WorkoutProgramApi = ReturnType<typeof useWorkoutProgram>;
