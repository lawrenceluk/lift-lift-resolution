import React from 'react';
import { Exercise, SetResult } from '@/types/workout';
import { SetLogger } from './SetLogger';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ExerciseViewProps {
  exercise: Exercise;
  onAddSet: (set: SetResult) => void;
  onUpdateSet: (setNumber: number, updates: Partial<SetResult>) => void;
  onDeleteSet: (setNumber: number) => void;
}

export const ExerciseView: React.FC<ExerciseViewProps> = ({
  exercise,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
}) => {
  const completedSets = exercise.sets.filter((s) => s.completed).length;
  const totalSets = exercise.workingSets;
  const isComplete = completedSets >= totalSets;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {exercise.groupLabel && (
                <Badge variant="outline" className="text-xs font-mono">
                  {exercise.groupLabel}
                </Badge>
              )}
              <h3 className="text-lg font-semibold text-gray-900">
                {exercise.name}
              </h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {completedSets}/{totalSets} sets completed
            </p>
          </div>
          {isComplete && (
            <Badge className="bg-green-500">Complete</Badge>
          )}
        </div>
        {exercise.notes && (
          <p className="text-sm text-gray-600 mt-2 italic">{exercise.notes}</p>
        )}
      </CardHeader>
      <CardContent>
        <SetLogger
          exercise={exercise}
          onAddSet={onAddSet}
          onUpdateSet={onUpdateSet}
          onDeleteSet={onDeleteSet}
        />
      </CardContent>
    </Card>
  );
};
