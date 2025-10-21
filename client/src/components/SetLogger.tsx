import React, { useState } from 'react';
import { WorkoutSet } from '@/types/workout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle } from 'lucide-react';

interface SetLoggerProps {
  set: WorkoutSet;
  setNumber: number;
  onUpdate: (updates: Partial<WorkoutSet>) => void;
}

export const SetLogger: React.FC<SetLoggerProps> = ({ set, setNumber, onUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [actual, setActual] = useState(set.actual);

  const handleComplete = () => {
    if (!set.completed) {
      const updates: Partial<WorkoutSet> = {
        actual: {
          reps: actual.reps ?? set.prescribed.reps,
          weight: actual.weight ?? set.prescribed.weight,
          rir: actual.rir ?? set.prescribed.rir,
          notes: actual.notes,
        },
        completed: true,
      };
      onUpdate(updates);
    } else {
      onUpdate({ completed: false });
    }
    setEditing(false);
  };

  const handleFieldUpdate = (field: keyof typeof actual, value: number | string | undefined) => {
    const updated = { ...actual, [field]: value === '' ? undefined : value };
    setActual(updated);
    onUpdate({ actual: updated });
  };

  const isCompleted = set.completed;

  return (
    <Card
      className={`p-4 border-2 transition-all ${
        isCompleted ? 'border-green-500 bg-green-50' : 'border-gray-200'
      }`}
      onClick={() => !isCompleted && setEditing(true)}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">Set {setNumber}</span>
          {set.prescribed.notes && (
            <span className="text-xs text-gray-500 italic">{set.prescribed.notes}</span>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleComplete();
          }}
          className="touch-manipulation active:scale-95 transition-transform"
        >
          {isCompleted ? (
            <CheckCircle2 className="w-7 h-7 text-green-600" />
          ) : (
            <Circle className="w-7 h-7 text-gray-400" />
          )}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-600 block mb-1">Reps</label>
          <div className="text-sm">
            <div className="text-gray-400">{set.prescribed.reps || '-'}</div>
            {(editing || isCompleted) && (
              <Input
                type="number"
                inputMode="numeric"
                value={actual.reps ?? ''}
                onChange={(e) => handleFieldUpdate('reps', e.target.value ? Number(e.target.value) : undefined)}
                className="h-12 text-base mt-1"
                placeholder={set.prescribed.reps?.toString()}
                disabled={isCompleted}
              />
            )}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-600 block mb-1">Weight</label>
          <div className="text-sm">
            <div className="text-gray-400">{set.prescribed.weight || '-'}</div>
            {(editing || isCompleted) && (
              <Input
                type="number"
                inputMode="decimal"
                value={actual.weight ?? ''}
                onChange={(e) => handleFieldUpdate('weight', e.target.value ? Number(e.target.value) : undefined)}
                className="h-12 text-base mt-1"
                placeholder={set.prescribed.weight?.toString()}
                disabled={isCompleted}
              />
            )}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-600 block mb-1">RIR</label>
          <div className="text-sm">
            <div className="text-gray-400">{set.prescribed.rir ?? '-'}</div>
            {(editing || isCompleted) && (
              <Input
                type="number"
                inputMode="numeric"
                value={actual.rir ?? ''}
                onChange={(e) => handleFieldUpdate('rir', e.target.value ? Number(e.target.value) : undefined)}
                className="h-12 text-base mt-1"
                placeholder={set.prescribed.rir?.toString()}
                disabled={isCompleted}
              />
            )}
          </div>
        </div>
      </div>

      {(editing || isCompleted || actual.notes) && (
        <div className="mt-3">
          <label className="text-xs text-gray-600 block mb-1">Notes</label>
          <Input
            type="text"
            value={actual.notes ?? ''}
            onChange={(e) => handleFieldUpdate('notes', e.target.value)}
            className="h-10 text-sm"
            placeholder="Add notes..."
            disabled={isCompleted}
          />
        </div>
      )}
    </Card>
  );
};
