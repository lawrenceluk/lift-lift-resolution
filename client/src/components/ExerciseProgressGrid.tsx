import React from 'react';
import { Exercise } from '@/types/workout';

interface ExerciseProgressGridProps {
  exercises: Exercise[];
}

export const ExerciseProgressGrid: React.FC<ExerciseProgressGridProps> = ({ exercises }) => {
  const getExerciseStatus = (exercise: Exercise) => {
    if (exercise.skipped) return 'skipped';
    const completedSets = (exercise.sets || []).filter((s) => s.completed).length;
    const skippedSets = (exercise.sets || []).filter((s) => s.skipped).length;
    if (completedSets === 0 && skippedSets === 0) return 'empty';
    if ((completedSets + skippedSets) >= exercise.workingSets) return 'complete';
    return 'partial';
  };

  const getDotColor = (status: string) => {
    switch (status) {
      case 'empty':
        return 'bg-gray-200';
      case 'partial':
        return 'bg-green-200';
      case 'complete':
        return 'bg-green-600';
      case 'skipped':
        return 'bg-slate-400';
      default:
        return 'bg-gray-200';
    }
  };

  return (
    <div className="flex flex-row gap-1.5">
      {exercises.map((exercise, index) => {
        const status = getExerciseStatus(exercise);
        return (
          <div
            key={exercise.id}
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${getDotColor(status)}`}
            title={`${index + 1}. ${exercise.name}${exercise.skipped ? ' (skipped)' : ''}`}
          />
        );
      })}
    </div>
  );
};
