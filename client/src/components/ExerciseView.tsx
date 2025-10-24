import React from 'react';
import { Exercise, SetResult, Week } from '@/types/workout';
import { SetLogger } from './SetLogger';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CircleSlash2, RotateCw } from 'lucide-react';

interface ExerciseViewProps {
  exercise: Exercise;
  allWeeks?: Week[];
  onAddSet: (set: SetResult) => void;
  onUpdateSet: (setNumber: number, updates: Partial<SetResult>) => void;
  onDeleteSet: (setNumber: number) => void;
  onSkip: () => void;
  onUnskip: () => void;
}

export const ExerciseView: React.FC<ExerciseViewProps> = ({
  exercise,
  allWeeks,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onSkip,
  onUnskip,
}) => {
  const completedSets = exercise.sets.filter((s) => s.completed).length;
  const totalSets = exercise.workingSets;
  const isComplete = completedSets >= totalSets;
  const isSkipped = exercise.skipped;

  const handleToggleSkip = () => {
    if (isSkipped) {
      onUnskip();
    } else {
      onSkip();
    }
  };

  return (
    <Card className={`mb-4 ${isSkipped ? 'opacity-60 border-gray-300' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex flex-col items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {exercise.groupLabel && (
                <Badge variant="outline" className="text-xs font-mono">
                  {exercise.groupLabel}
                </Badge>
              )}
            {isSkipped && (
              <Badge variant="destructive" className="bg-gray-500">Skipped</Badge>
            )}
            {!isSkipped && isComplete && (
              <Badge className="bg-green-500">Complete</Badge>
            )}
            {!isSkipped && !isComplete && <Badge variant="outline" className="text-xs font-mono">
                {totalSets} sets
              </Badge>
            }
          </div>
          <div className="flex-1 w-full">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {exercise.name}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleSkip}
                className={`h-8 w-8 ${isSkipped ? 'text-gray-500 hover:text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}
                title={isSkipped ? 'Unskip exercise' : 'Skip exercise'}
              >
                {isSkipped ? <RotateCw className="w-5 h-5" /> : <CircleSlash2 className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
        {exercise.notes && (
          <p className="text-sm text-gray-600 italic">{exercise.notes}</p>
        )}
      </CardHeader>
      {!isSkipped && (
        <CardContent>
          <SetLogger
            exercise={exercise}
            allWeeks={allWeeks}
            onAddSet={onAddSet}
            onUpdateSet={onUpdateSet}
            onDeleteSet={onDeleteSet}
          />
        </CardContent>
      )}
    </Card>
  );
};
