import React, { useState } from 'react';
import { PrescribedSession, PerformedSession, SetResult, Exercise, SessionStatus } from '@/types/workout';
import { ExerciseView } from './ExerciseView';
import { ExerciseProgressGrid } from './ExerciseProgressGrid';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, MoreVertical, Timer, Send } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useWorkoutTimerContext } from '@/contexts/WorkoutTimerContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface SessionViewProps {
  session: PrescribedSession | PerformedSession;
  status: SessionStatus;
  /** False for ingested history and past sealed sessions — view-only journal. */
  editable: boolean;
  /** All performed records (for last-time placeholders + exercise history). */
  performedRecords: { session: PerformedSession; editable: boolean }[];
  onAddSet: (exerciseId: string, set: SetResult) => void;
  onUpdateSet: (exerciseId: string, setNumber: number, updates: Partial<SetResult>) => void;
  onDeleteSet: (exerciseId: string, setNumber: number) => void;
  onSkipExercise: (exerciseId: string) => void;
  onUnskipExercise: (exerciseId: string) => void;
  onUpdateExerciseNotes: (exerciseId: string, notes: string) => void;
  /** Cross-session note editing from the history dialog (device-truth records only). */
  onUpdateExerciseNotesById: (sessionId: string, exerciseId: string, notes: string) => void;
  onUpdateExercise: (exerciseId: string, updates: Partial<Exercise>) => void;
  onBack: () => void;
  /** "Done for today" — seal with an optional felt-note; delivery is eager. */
  onDepart: (note?: string) => void;
}

export const SessionView: React.FC<SessionViewProps> = ({
  session,
  status,
  editable,
  performedRecords,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onSkipExercise,
  onUnskipExercise,
  onUpdateExerciseNotes,
  onUpdateExerciseNotesById,
  onUpdateExercise,
  onBack,
  onDepart,
}) => {
  const { openTimer } = useWorkoutTimerContext();
  const [isDepartDialogOpen, setIsDepartDialogOpen] = useState(false);
  const [departNote, setDepartNote] = useState('');

  const performed = session as PerformedSession;
  const hasLoggedSets = session.exercises.some((ex) => (ex.sets || []).length > 0);
  const sealed = !!performed.sealed;

  const handleDepart = () => {
    setIsDepartDialogOpen(false);
    onDepart(departNote);
    setDepartNote('');
  };

  const statusLine = (() => {
    switch (status) {
      case 'ingested':
        return `Ingested ✓ · trained ${performed.performedDate}`;
      case 'delivered':
        return `Delivered ✓ — Point One picks this up on its next pass`;
      case 'departed':
        return `Saved on this device — will deliver when Point One is reachable`;
      case 'in-progress':
        return null;
      case 'planned':
        return null;
    }
  })();

  // Sort exercises by group label (A1, A2, B1, C1, C2, etc.)
  const sortedExercises = [...session.exercises].sort((a, b) => {
    const labelA = a.groupLabel?.trim();
    const labelB = b.groupLabel?.trim();

    // Exercises without labels go last, maintaining original order
    if (!labelA && !labelB) return 0;
    if (!labelA) return 1;
    if (!labelB) return -1;

    // Parse label into letter and number (e.g., "A1" -> ["A", 1])
    const parseLabel = (label: string) => {
      const match = label.match(/^([A-Za-z]+)(\d+)$/);
      if (!match) return { letter: label, number: 0 };
      return { letter: match[1].toUpperCase(), number: parseInt(match[2], 10) };
    };

    const parsedA = parseLabel(labelA);
    const parsedB = parseLabel(labelB);

    // Sort by letter first, then by number
    if (parsedA.letter !== parsedB.letter) {
      return parsedA.letter.localeCompare(parsedB.letter);
    }
    return parsedA.number - parsedB.number;
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
            {statusLine && <p className="text-sm text-gray-500 mb-2">{statusLine}</p>}
            <ExerciseProgressGrid exercises={session.exercises} />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-gray-600">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={openTimer}>
                <Timer className="w-4 h-4 mr-2" />
                Timer
              </DropdownMenuItem>
              {editable && hasLoggedSets && (
                <DropdownMenuItem onClick={() => setIsDepartDialogOpen(true)}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Done for today
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {performed.note && (
        <div className="px-4 pt-4 w-full max-w-2xl">
          <Card className="p-4 bg-amber-50 border-amber-200">
            <p className="text-sm text-amber-900 italic">“{performed.note}”</p>
          </Card>
        </div>
      )}

      {session.notes && (
        <div className="px-4 pt-4 w-full max-w-2xl">
          <Card className="p-4 bg-gray-50 border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">Session Notes</h3>
            <p className="text-sm text-blue-800">{session.notes}</p>
          </Card>
        </div>
      )}

      {session.warmup && session.warmup.length > 0 && !sealed && (
        <div className="px-4 pt-4 w-full max-w-2xl">
          <Card className="p-4 border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">Warmup</h3>
            <ul className="space-y-1">
              {session.warmup.map((item, index) => (
                <li key={index} className="text-sm text-gray-800">
                  • {item}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      <main className="px-4 pt-4 w-full max-w-2xl">
        {sortedExercises.map((exercise) => (
          <ExerciseView
            key={exercise.id}
            exercise={exercise}
            readOnly={!editable}
            currentSessionId={session.id}
            performedRecords={performedRecords}
            onAddSet={(set) => onAddSet(exercise.id, set)}
            onUpdateSet={(setNumber, updates) => onUpdateSet(exercise.id, setNumber, updates)}
            onDeleteSet={(setNumber) => onDeleteSet(exercise.id, setNumber)}
            onSkip={() => onSkipExercise(exercise.id)}
            onUnskip={() => onUnskipExercise(exercise.id)}
            onUpdateNotes={(notes) => onUpdateExerciseNotes(exercise.id, notes)}
            onUpdateExercise={(updates) => onUpdateExercise(exercise.id, updates)}
            onUpdateExerciseNotesById={onUpdateExerciseNotesById}
          />
        ))}
      </main>

      {/* Departure (D6): always reachable once there's anything to record — no
          per-set resolution, no certification. The record is a journal. */}
      {editable && hasLoggedSets && !sealed && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 flex justify-center">
          <Button
            onClick={() => setIsDepartDialogOpen(true)}
            className="w-full max-w-2xl h-14 text-base bg-gray-900 hover:bg-gray-800"
          >
            <Send className="w-5 h-5 mr-2" />
            Done for today
          </Button>
        </div>
      )}

      <Dialog open={isDepartDialogOpen} onOpenChange={setIsDepartDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Done for today</DialogTitle>
            <DialogDescription>
              What you logged is the record — unlogged sets just read as not done. Anything to tell
              your trainer? (optional)
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={departNote}
            onChange={(e) => setDepartNote(e.target.value)}
            placeholder="e.g., felt strong, cut it short — knee twinge on lunges"
            className="min-h-[80px]"
          />
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsDepartDialogOpen(false)}>
              Keep training
            </Button>
            <Button onClick={handleDepart} className="bg-gray-900 hover:bg-gray-800">
              <Send className="w-4 h-4 mr-2" />
              Done for today
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
