import React, { useState, useEffect } from 'react';
import { SetResult, Exercise } from '@/types/workout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CheckCircle2, X, Check, CircleSlash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RestTimer } from './RestTimer';
import { motion } from 'framer-motion';

interface SetLoggerProps {
  exercise: Exercise;
  /** The most recent compatible performance of this movement (placeholder source). */
  lastSet?: SetResult | null;
  /** View-only journal mode — render logged sets, no inputs. */
  readOnly?: boolean;
  onAddSet: (set: SetResult) => void;
  onUpdateSet: (setNumber: number, updates: Partial<SetResult>) => void;
  onDeleteSet: (setNumber: number) => void;
}

export const SetLogger: React.FC<SetLoggerProps> = ({
  exercise,
  lastSet,
  readOnly = false,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
}) => {
  const [newSetData, setNewSetData] = useState<{
    reps: string;
    weight: string;
    rir: string;
  }>({
    reps: '',
    weight: '',
    rir: '',
  });

  const [placeholderData, setPlaceholderData] = useState<{
    reps: string;
    weight: string;
    rir: string;
  }>({
    reps: '',
    weight: '',
    rir: '',
  });

  const [isCompleted, setIsCompleted] = useState(false);

  // Pre-fill from this session's most recent set; otherwise show last time's
  // numbers (from the performed records) as placeholders only.
  useEffect(() => {
    if (exercise.sets.length > 0) {
      const last = exercise.sets[exercise.sets.length - 1];

      const isBodyweight =
        exercise.targetLoad.toLowerCase().includes('bodyweight') ||
        exercise.targetLoad.toLowerCase() === 'bw';
      const setHasWeight = last.weight && last.weight > 0;

      if (!(isBodyweight && setHasWeight)) {
        const filled = {
          reps: last.reps ? last.reps.toString() : '',
          weight: last.weight ? last.weight.toString() : '',
          rir: last.rir !== undefined ? last.rir.toString() : '',
        };
        setNewSetData(filled);
        setPlaceholderData(filled);
        return;
      }
    }

    if (lastSet) {
      setPlaceholderData({
        reps: lastSet.reps ? lastSet.reps.toString() : '',
        weight: lastSet.weight ? lastSet.weight.toString() : '',
        rir: lastSet.rir !== undefined ? lastSet.rir.toString() : '',
      });
      return;
    }

    setPlaceholderData({ reps: '', weight: '', rir: '' });
  }, [exercise.sets, exercise.name, exercise.targetLoad, lastSet]);

  // Validation: a logged set is a fact — it needs real reps. Input wins,
  // placeholder backs it up; zero/empty/garbage doesn't make a set.
  const effectiveReps =
    newSetData.reps.trim() !== '' ? newSetData.reps.trim() : placeholderData.reps.trim();
  const parsedReps = parseInt(effectiveReps, 10);
  const repsValid = Number.isFinite(parsedReps) && parsedReps > 0;
  const weightTrim = newSetData.weight.trim() !== '' ? newSetData.weight.trim() : placeholderData.weight.trim();
  const parsedWeight = weightTrim !== '' ? parseFloat(weightTrim) : undefined;
  const weightValid = parsedWeight === undefined || (Number.isFinite(parsedWeight) && parsedWeight >= 0);
  const canFinishSet = repsValid && weightValid;

  // The most recent set actually logged this session — the rest-timer origin.
  const lastFinishedSet = [...exercise.sets]
    .reverse()
    .find((s) => s.completed && s.loggedAt);

  const handleAddSet = () => {
    if (!canFinishSet) return;
    const setNumber = exercise.sets.length + 1;

    const rirTrim = newSetData.rir.trim() !== '' ? newSetData.rir.trim() : placeholderData.rir.trim();
    const parsedRir = rirTrim !== '' ? parseInt(rirTrim, 10) : undefined;

    const newSet: SetResult = {
      setNumber,
      reps: parsedReps,
      weight: parsedWeight && parsedWeight > 0 ? parsedWeight : undefined,
      weightUnit: 'lbs',
      rir: Number.isFinite(parsedRir as number) ? parsedRir : undefined,
      completed: true,
      loggedAt: new Date().toISOString(),
    };

    // Trigger animation
    setIsCompleted(true);

    // Add the set after animation completes
    setTimeout(() => {
      onAddSet(newSet);
    }, 500);

    // Reset animation state
    setTimeout(() => {
      setIsCompleted(false);
    }, 750);
  };

  const handleSkipSet = () => {
    const setNumber = exercise.sets.length + 1;

    const newSet: SetResult = {
      setNumber,
      reps: 0,
      weightUnit: 'lbs',
      completed: false,
      skipped: true,
    };

    onAddSet(newSet);
  };

  const targetReps = exercise.reps.includes('-')
    ? exercise.reps
    : `${exercise.reps} reps`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm text-gray-500">
            Target: {targetReps} @ {exercise.targetLoad}
          </p>
          <p className="text-sm text-gray-500">Rest: {exercise.restSeconds}s</p>
          {exercise.warmupSets > 0 && (
            <p className="text-sm text-gray-500">
              Warmup: {exercise.warmupSets} {exercise.warmupSets === 1 ? 'set' : 'sets'}
            </p>
          )}
        </div>
      </div>

      {exercise.sets.map((set) => (
        <Card key={set.setNumber} className={set.skipped ? "p-3 bg-gray-50 border-gray-300" : "p-3 bg-green-50 border-green-200"}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {set.completed ?
                <CheckCircle2 className={"w-5 h-5 text-green-600"} /> :
                <CircleSlash2 className={"w-5 h-5 text-gray-400"} />}
              <span className="text-sm font-semibold">Set {set.setNumber}</span>
            </div>
            {!readOnly && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDeleteSet(set.setNumber)}
                className="h-7 w-7"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          {!set.skipped ? (
            <>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-xs text-gray-600">Reps:</span>
                  <p className="font-semibold">{set.reps === 0 ? '-' : set.reps}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-600">Weight:</span>
                  <p className="font-semibold">
                    {set.weight ? `${set.weight} ${set.weightUnit}` : 'BW'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-600">RIR:</span>
                  <p className="font-semibold">{set.rir ?? '-'}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-gray-500 mt-2">This set was skipped.</p>
          )}
        </Card>
      ))}

      {!readOnly && exercise.sets.length < exercise.workingSets && (
        <Card className="p-4 border-2 border-dashed border-gray-300 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold">
                Set {exercise.sets.length + 1} of {exercise.workingSets}
              </p>
              {lastFinishedSet?.loggedAt && (
                <RestTimer
                  since={lastFinishedSet.loggedAt}
                  targetSeconds={exercise.restSeconds}
                />
              )}
            </div>
            <button
              onClick={handleSkipSet}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Skip
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div>
              <label className="text-xs text-gray-600 block mb-1">Reps</label>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                value={newSetData.reps}
                onChange={(e) =>
                  setNewSetData({ ...newSetData, reps: e.target.value })
                }
                onClick={(e) => e.currentTarget.select()}
                placeholder={placeholderData.reps || (() => {
                  // Extract numeric portion from strings like "10-15 per leg" or "90 seconds"
                  const match = exercise.reps.match(/^[\d\s-]+/);
                  return match ? match[0].trim() : '';
                })()}
                className="h-12 text-base"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Weight</label>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                value={newSetData.weight}
                onChange={(e) =>
                  setNewSetData({ ...newSetData, weight: e.target.value })
                }
                onClick={(e) => e.currentTarget.select()}
                placeholder={placeholderData.weight || 'lbs'}
                className="h-12 text-base"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">RIR</label>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={newSetData.rir}
                onChange={(e) =>
                  setNewSetData({ ...newSetData, rir: e.target.value })
                }
                onClick={(e) => e.currentTarget.select()}
                placeholder={placeholderData.rir || (() => {
                  // Extract RIR from targetLoad (e.g., "2-3 RIR" -> "2-3")
                  const match = exercise.targetLoad.match(/(\d+(?:-\d+)?)\s*RIR/i);
                  return match ? match[1] : '0-10';
                })()}
                className="h-12 text-base"
              />
            </div>
          </div>
          {!canFinishSet && (
            <p className="text-xs text-gray-500 mb-2">
              {repsValid ? 'Check the weight — it doesn’t parse.' : 'Enter reps to log this set.'}
            </p>
          )}
          <motion.button
            onClick={handleAddSet}
            disabled={!canFinishSet}
            className={`w-full h-12 rounded-xl px-6 py-4 flex items-center justify-between relative overflow-hidden ${
              canFinishSet ? 'bg-gray-900 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            whileHover={canFinishSet ? { scale: 1.02 } : undefined}
            whileTap={canFinishSet ? { scale: 0.98 } : undefined}
          >
            {/* Progress fill */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600"
              initial={{ x: "-100%" }}
              animate={isCompleted ? { x: 0 } : { x: "-100%" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            />

            {/* Sparkle effect */}
            <motion.div
              className="absolute inset-0 opacity-50"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
              }}
              initial={{ x: "-100%" }}
              animate={isCompleted ? { x: "100%" } : { x: "-100%" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            />

            <motion.span
              className="relative z-10"
              animate={{
                scale: isCompleted ? [1, 1.05, 1] : 1,
              }}
              transition={{ duration: 0.15, delay: 0.1 }}
            >
              {isCompleted ? "Nice work!" : "Finish Set"}
            </motion.span>

            <motion.div
              className="relative z-10"
              animate={
                isCompleted
                  ? {
                      rotate: [0, -10, 10, -10, 0],
                      scale: [1, 1.2, 1],
                    }
                  : {}
              }
              transition={{ duration: 0.2, delay: 0.075 }}
            >
              <Check className="w-5 h-5" />
            </motion.div>
          </motion.button>
        </Card>
      )}
    </div>
  );
};
