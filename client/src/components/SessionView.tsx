import React from 'react';
import { WorkoutSession, SetResult, Week, Exercise } from '@/types/workout';
import { ExerciseView } from './ExerciseView';
import { ExerciseProgressGrid } from './ExerciseProgressGrid';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface SessionViewProps {
  session: WorkoutSession;
  weekNumber: number;
  allWeeks?: Week[];
  onAddSet: (exerciseId: string, set: SetResult) => void;
  onUpdateSet: (exerciseId: string, setNumber: number, updates: Partial<SetResult>) => void;
  onDeleteSet: (exerciseId: string, setNumber: number) => void;
  onSkipExercise: (exerciseId: string) => void;
  onUnskipExercise: (exerciseId: string) => void;
  onUpdateExerciseNotes: (exerciseId: string, notes: string) => void;
  onUpdateExercise: (exerciseId: string, updates: Partial<Exercise>) => void;
  onUpdateExerciseInAllSessions?: (originalName: string, updates: Partial<Exercise>) => void;
  onBack: () => void;
  onCompleteSession: () => void;
}

export const SessionView: React.FC<SessionViewProps> = ({
  session,
  weekNumber,
  allWeeks,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onSkipExercise,
  onUnskipExercise,
  onUpdateExerciseNotes,
  onUpdateExercise,
  onUpdateExerciseInAllSessions,
  onBack,
  onCompleteSession,
}) => {
  const allExercisesComplete = session.exercises.every((ex) => {
    const completedSets = (ex.sets || []).filter((s) => s.completed).length;
    const skippedSets = (ex.sets || []).filter((s) => s.skipped).length;
    return ex.skipped || (completedSets + skippedSets) >= ex.workingSets;
  });

  return (
    <div className="min-h-screen bg-white pb-24 flex flex-col items-center">
      <header className="z-20 bg-white sticky top-0 border-b border-gray-200 px-4 py-4 w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">{session.name}</h1>
            <p className="text-sm text-gray-500">Week {weekNumber} • Session {Number(session.id.split('-').pop())}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <ExerciseProgressGrid exercises={session.exercises} />
            {session.completed && <Badge className="bg-green-500 text-xs">Completed</Badge>}
          </div>
        </div>
      </header>

      {session.notes && (
        <div className="px-4 pt-4 w-full max-w-2xl">
          <Card className="p-4 bg-gray-50 border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">Session Notes</h3>
            <p className="text-sm text-blue-800">{session.notes}</p>
          </Card>
        </div>
      )}

      {session.warmup && session.warmup.length > 0 && (
        <div className="px-4 pt-4 w-full max-w-2xl">
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

      <main className="px-4 pt-4 w-full max-w-2xl">
        {session.exercises.map((exercise) => (
          <ExerciseView
            key={exercise.id}
            exercise={exercise}
            allWeeks={allWeeks}
            onAddSet={(set) => onAddSet(exercise.id, set)}
            onUpdateSet={(setNumber, updates) =>
              onUpdateSet(exercise.id, setNumber, updates)
            }
            onDeleteSet={(setNumber) => onDeleteSet(exercise.id, setNumber)}
            onSkip={() => onSkipExercise(exercise.id)}
            onUnskip={() => onUnskipExercise(exercise.id)}
            onUpdateNotes={(notes) => onUpdateExerciseNotes(exercise.id, notes)}
            onUpdateExercise={(updates) => onUpdateExercise(exercise.id, updates)}
            onUpdateExerciseInAllSessions={onUpdateExerciseInAllSessions}
            onUpdateExerciseNotesById={onUpdateExerciseNotes}
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
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 flex justify-center">
          <Button
            onClick={onCompleteSession}
            className="w-full max-w-2xl h-14 text-base bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Complete Workout
          </Button>
        </div>
      )}
    </div>
  );
};
