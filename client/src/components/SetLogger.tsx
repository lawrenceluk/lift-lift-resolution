import React, { useState } from 'react';
import { SetResult, Exercise } from '@/types/workout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SetLoggerProps {
  exercise: Exercise;
  onAddSet: (set: SetResult) => void;
  onUpdateSet: (setNumber: number, updates: Partial<SetResult>) => void;
  onDeleteSet: (setNumber: number) => void;
}

export const SetLogger: React.FC<SetLoggerProps> = ({
  exercise,
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
    onAddSet(newSet);
    setNewSetData({ reps: '', weight: '', rir: '' });
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
        </div>
      </div>

      {exercise.sets.map((set) => (
        <Card key={set.setNumber} className="p-3 bg-green-50 border-green-200">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm font-semibold">Set {set.setNumber}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDeleteSet(set.setNumber)}
              className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
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
            Log Set {exercise.sets.length + 1}/{exercise.workingSets}
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
                placeholder={exercise.reps}
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
                placeholder="lbs"
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
                placeholder="0-10"
                className="h-12 text-base"
              />
            </div>
          </div>
          <Button
            onClick={handleAddSet}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700"
          >
            <Circle className="w-5 h-5 mr-2" />
            Complete Set
          </Button>
        </Card>
      )}
    </div>
  );
};
