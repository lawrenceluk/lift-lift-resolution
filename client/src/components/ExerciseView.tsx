import React from 'react';
import { Exercise, WorkoutSet } from '@/types/workout';
import { SetLogger } from './SetLogger';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CheckCircle2, Circle } from 'lucide-react';

interface ExerciseViewProps {
  exercise: Exercise;
  onSetUpdate: (setId: string, updates: Partial<WorkoutSet>) => void;
  onToggleComplete: () => void;
}

export const ExerciseView: React.FC<ExerciseViewProps> = ({
  exercise,
  onSetUpdate,
  onToggleComplete,
}) => {
  const completedSets = exercise.sets.filter((s) => s.completed).length;
  const totalSets = exercise.sets.length;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{exercise.name}</h3>
            <p className="text-sm text-gray-500">
              {completedSets}/{totalSets} sets completed
            </p>
          </div>
          <button
            onClick={onToggleComplete}
            className="touch-manipulation active:scale-95 transition-transform ml-2"
          >
            {exercise.completed ? (
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            ) : (
              <Circle className="w-8 h-8 text-gray-400" />
            )}
          </button>
        </div>
        {exercise.notes && (
          <p className="text-sm text-gray-600 mt-2 italic">{exercise.notes}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {exercise.sets.map((set, index) => (
          <SetLogger
            key={set.id}
            set={set}
            setNumber={index + 1}
            onUpdate={(updates) => onSetUpdate(set.id, updates)}
          />
        ))}
      </CardContent>
    </Card>
  );
};
