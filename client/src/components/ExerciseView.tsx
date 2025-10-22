import React from 'react';
import { Exercise, SetResult, Week } from '@/types/workout';
import { SetLogger } from './SetLogger';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';

interface ExerciseViewProps {
  exercise: Exercise;
  allWeeks?: Week[];
  onAddSet: (set: SetResult) => void;
  onUpdateSet: (setNumber: number, updates: Partial<SetResult>) => void;
  onDeleteSet: (setNumber: number) => void;
}

export const ExerciseView: React.FC<ExerciseViewProps> = ({
  exercise,
  allWeeks,
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
        <div className="flex flex-col items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {exercise.groupLabel && (
                <Badge variant="outline" className="text-xs font-mono">
                  {exercise.groupLabel}
                </Badge>
              )}
            {isComplete && (
              <Badge className="bg-green-500">Complete</Badge>
            )}
            {!isComplete && <Badge variant="outline" className="text-xs font-mono">
                {totalSets} sets
              </Badge>
            }
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {exercise.name}
              </h3>
            </div>
          </div>
        </div>
        {exercise.notes && (
          <p className="text-sm text-gray-600 italic">{exercise.notes}</p>
        )}
      </CardHeader>
      <CardContent>
        <SetLogger
          exercise={exercise}
          allWeeks={allWeeks}
          onAddSet={onAddSet}
          onUpdateSet={onUpdateSet}
          onDeleteSet={onDeleteSet}
        />
      </CardContent>
    </Card>
  );
};
