import React from 'react';
import { WorkoutSession, SetResult } from '@/types/workout';
import { ExerciseView } from './ExerciseView';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface SessionViewProps {
  session: WorkoutSession;
  weekNumber: number;
  onAddSet: (exerciseId: string, set: SetResult) => void;
  onUpdateSet: (exerciseId: string, setNumber: number, updates: Partial<SetResult>) => void;
  onDeleteSet: (exerciseId: string, setNumber: number) => void;
  onBack: () => void;
  onCompleteSession: () => void;
}

export const SessionView: React.FC<SessionViewProps> = ({
  session,
  weekNumber,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onBack,
  onCompleteSession,
}) => {
  const allExercisesComplete = session.exercises.every(
    (ex) => ex.sets.filter((s) => s.completed).length >= ex.workingSets
  );
  const completedExercises = session.exercises.filter(
    (ex) => ex.sets.filter((s) => s.completed).length >= ex.workingSets
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white sticky top-0 z-10 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">{session.name}</h1>
            <p className="text-sm text-gray-500">Week {weekNumber}</p>
          </div>
          {session.completed && <Badge className="bg-green-500">Completed</Badge>}
          {!session.completed && session.startedAt && <Badge className="bg-orange-500">In Progress</Badge>}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {completedExercises}/{session.exercises.length} exercises
          </span>
          {session.cardio && (
            <span className="text-sm text-gray-600">
              + {session.cardio.duration}min {session.cardio.modality || 'cardio'}
            </span>
          )}
        </div>
      </header>

      {session.warmup && session.warmup.length > 0 && (
        <div className="px-4 pt-4">
          <Card className="p-4 bg-orange-50 border-orange-200">
            <h3 className="font-semibold text-orange-900 mb-2">Warmup</h3>
            <ul className="space-y-1">
              {session.warmup.map((item, index) => (
                <li key={index} className="text-sm text-orange-800">
                  • {item}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      <main className="px-4 pt-4">
        {session.exercises.map((exercise) => (
          <ExerciseView
            key={exercise.id}
            exercise={exercise}
            onAddSet={(set) => onAddSet(exercise.id, set)}
            onUpdateSet={(setNumber, updates) =>
              onUpdateSet(exercise.id, setNumber, updates)
            }
            onDeleteSet={(setNumber) => onDeleteSet(exercise.id, setNumber)}
          />
        ))}

        {session.cardio && (
          <Card className="p-4 bg-blue-50 border-blue-200 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-blue-900">Cardio Session</h3>
              {session.cardio.completed && (
                <Badge className="bg-blue-600">Done</Badge>
              )}
            </div>
            <p className="text-sm text-blue-800">
              {session.cardio.duration} minutes • {session.cardio.type} •{' '}
              {session.cardio.modality || 'Any cardio'}
            </p>
            {session.cardio.instructions && (
              <p className="text-sm text-blue-700 mt-2 italic">
                {session.cardio.instructions}
              </p>
            )}
          </Card>
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
