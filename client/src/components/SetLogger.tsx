import React, { useState, useEffect } from 'react';
import { SetResult, Exercise, Week } from '@/types/workout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CheckCircle2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface SetLoggerProps {
  exercise: Exercise;
  allWeeks?: Week[];
  onAddSet: (set: SetResult) => void;
  onUpdateSet: (setNumber: number, updates: Partial<SetResult>) => void;
  onDeleteSet: (setNumber: number) => void;
}

export const SetLogger: React.FC<SetLoggerProps> = ({
  exercise,
  allWeeks,
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

  // Auto-fill from current session, or use historical data for placeholders
  useEffect(() => {
    // First priority: pre-fill with the most recent set from current exercise's session
    if (exercise.sets.length > 0) {
      const lastSet = exercise.sets[exercise.sets.length - 1];
      setNewSetData({
        reps: lastSet.reps.toString(),
        weight: lastSet.weight ? lastSet.weight.toString() : '',
        rir: lastSet.rir ? lastSet.rir.toString() : '',
      });
      // Also set placeholders for visual consistency
      setPlaceholderData({
        reps: lastSet.reps.toString(),
        weight: lastSet.weight ? lastSet.weight.toString() : '',
        rir: lastSet.rir ? lastSet.rir.toString() : '',
      });
      return;
    }

    // Second priority: greedy backwards search for the latest completed set
    // from a previous session (use as placeholder only, don't pre-fill)
    if (!allWeeks) return;

    const currentSessionId = exercise.id.split('-exercise-')[0];

    // Search backwards through weeks and sessions
    for (let i = allWeeks.length - 1; i >= 0; i--) {
      const week = allWeeks[i];
      for (let j = week.sessions.length - 1; j >= 0; j--) {
        const session = week.sessions[j];

        // Skip current session
        if (session.id === currentSessionId) continue;

        // Look for exercises with matching name
        for (const ex of session.exercises) {
          if (ex.name === exercise.name && ex.sets && ex.sets.length > 0) {
            // Find the last completed set
            const completedSets = ex.sets.filter(s => s.completed);
            if (completedSets.length > 0) {
              const lastSet = completedSets[completedSets.length - 1];
              // Only set placeholders, don't pre-fill the form
              setPlaceholderData({
                reps: lastSet.reps.toString(),
                weight: lastSet.weight ? lastSet.weight.toString() : '',
                rir: lastSet.rir ? lastSet.rir.toString() : '',
              });
              return; // Found it, exit early
            }
          }
        }
      }
    }
  }, [exercise.sets, exercise.id, exercise.name, allWeeks]);

  const handleAddSet = () => {
    const setNumber = exercise.sets.length + 1;
    const newSet: SetResult = {
      setNumber,
      reps: parseInt(newSetData.reps) || parseInt(exercise.reps) || 0,
      weight: newSetData.weight ? parseFloat(newSetData.weight) : undefined,
      weightUnit: 'lbs',
      rir: newSetData.rir ? parseInt(newSetData.rir) : undefined,
      completed: true,
    };
    
    // Trigger animation
    setIsCompleted(true);
    
    // Add the set after a brief delay to allow animation to start
    setTimeout(() => {
      onAddSet(newSet);
    }, 100);
    
    // Reset animation state
    setTimeout(() => {
      setIsCompleted(false);
    }, 750);
  };

  const targetReps = exercise.reps.includes('-')
    ? exercise.reps
    : `${exercise.reps} reps`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs text-gray-500">
            Target: {targetReps} @ {exercise.targetLoad}
          </p>
          <p className="text-xs text-gray-500">Rest: {exercise.restSeconds}s</p>
          {exercise.warmupSets > 0 && (
            <p className="text-xs text-gray-500">
              Warmup: {exercise.warmupSets} {exercise.warmupSets === 1 ? 'set' : 'sets'}
            </p>
          )}
        </div>
      </div>

      {exercise.sets.map((set) => (
        <Card key={set.setNumber} className="p-3 bg-green-50 border-green-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm font-semibold">Set {set.setNumber}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDeleteSet(set.setNumber)}
              className="h-7 w-7"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <span className="text-xs text-gray-600">Reps:</span>
              <p className="font-semibold">{set.reps}</p>
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
          {set.notes && (
            <p className="text-xs text-gray-600 mt-2 italic">{set.notes}</p>
          )}
        </Card>
      ))}

      {exercise.sets.length < exercise.workingSets && (
        <Card className="p-4 border-2 border-dashed border-gray-300 bg-gray-50">
          <p className="text-sm font-semibold mb-3">
            Set {exercise.sets.length + 1}/{exercise.workingSets}
          </p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div>
              <label className="text-xs text-gray-600 block mb-1">Reps</label>
              <Input
                type="number"
                inputMode="numeric"
                value={newSetData.reps}
                onChange={(e) =>
                  setNewSetData({ ...newSetData, reps: e.target.value })
                }
                placeholder={placeholderData.reps || (() => {
                  // Extract numeric portion from strings like "10-15 per leg"
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
                value={newSetData.weight}
                onChange={(e) =>
                  setNewSetData({ ...newSetData, weight: e.target.value })
                }
                placeholder={placeholderData.weight || 'lbs'}
                className="h-12 text-base"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">RIR</label>
              <Input
                type="number"
                inputMode="numeric"
                value={newSetData.rir}
                onChange={(e) =>
                  setNewSetData({ ...newSetData, rir: e.target.value })
                }
                placeholder={placeholderData.rir || (() => {
                  // Extract RIR from targetLoad (e.g., "2-3 RIR" -> "2-3")
                  const match = exercise.targetLoad.match(/(\d+(?:-\d+)?)\s*RIR/i);
                  return match ? match[1] : '0-10';
                })()}
                className="h-12 text-base"
              />
            </div>
          </div>
          <motion.button
            onClick={handleAddSet}
            className="w-full h-12 bg-gray-900 text-white rounded-xl px-6 py-4 flex items-center justify-between relative overflow-hidden"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
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
              {isCompleted ? "Set Complete!" : "Finish Set"}
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
