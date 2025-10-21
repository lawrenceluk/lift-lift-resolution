import React from 'react';
import { WorkoutSession, WorkoutSet } from '@/types/workout';
import { ExerciseView } from './ExerciseView';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SessionViewProps {
  session: WorkoutSession;
  weekNumber: number;
  onSetUpdate: (exerciseId: string, setId: string, updates: Partial<WorkoutSet>) => void;
  onToggleExerciseComplete: (exerciseId: string) => void;
  onBack: () => void;
  onCompleteSession: () => void;
}

export const SessionView: React.FC<SessionViewProps> = ({
  session,
  weekNumber,
  onSetUpdate,
  onToggleExerciseComplete,
  onBack,
  onCompleteSession,
}) => {
  const allExercisesComplete = session.exercises.every((e) => e.completed);
  const completedExercises = session.exercises.filter((e) => e.completed).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white sticky top-0 z-10 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">{session.title}</h1>
            <p className="text-sm text-gray-500">
              Week {weekNumber} • {session.day}
            </p>
          </div>
          {session.completed && (
            <Badge className="bg-green-500">Completed</Badge>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {completedExercises}/{session.exercises.length} exercises
          </span>
          {session.cardio && (
            <span className="text-sm text-gray-600">
              + {session.cardio.duration}min {session.cardio.type || 'cardio'}
            </span>
          )}
        </div>
      </header>

      <main className="px-4 pt-4">
        {session.exercises.map((exercise) => (
          <ExerciseView
            key={exercise.id}
            exercise={exercise}
            onSetUpdate={(setId, updates) => onSetUpdate(exercise.id, setId, updates)}
            onToggleComplete={() => onToggleExerciseComplete(exercise.id)}
          />
        ))}

        {session.cardio && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-blue-900 mb-1">Cardio Session</h3>
            <p className="text-sm text-blue-800">
              {session.cardio.duration} minutes • {session.cardio.type || 'Cardio'}
            </p>
            {session.cardio.notes && (
              <p className="text-sm text-blue-700 mt-2 italic">{session.cardio.notes}</p>
            )}
          </div>
        )}
      </main>

      {!session.completed && allExercisesComplete && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
          <Button
            onClick={onCompleteSession}
            className="w-full h-14 text-base bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Complete Workout
          </Button>
        </div>
      )}
    </div>
  );
};
