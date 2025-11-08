import React, { useState } from 'react';
import { WorkoutSession, SetResult, Week, Exercise } from '@/types/workout';
import { ExerciseView } from './ExerciseView';
import { ExerciseProgressGrid } from './ExerciseProgressGrid';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, MoreVertical, Trash, Pencil, Zap, Timer } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCoachChatContext } from '@/contexts/CoachChatContext';
import { useWorkoutTimerContext } from '@/contexts/WorkoutTimerContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  onUpdateExerciseNotesGlobal?: (weekId: string, sessionId: string, exerciseId: string, notes: string) => void;
  onUpdateExercise: (exerciseId: string, updates: Partial<Exercise>) => void;
  onUpdateExerciseInAllSessions?: (originalName: string, updates: Partial<Exercise>) => void;
  onBack: () => void;
  onCompleteSession: () => void;
  onDeleteSession: () => void;
  onRenameSession: (newName: string) => void;
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
  onUpdateExerciseNotesGlobal,
  onUpdateExercise,
  onUpdateExerciseInAllSessions,
  onBack,
  onCompleteSession,
  onDeleteSession,
  onRenameSession,
}) => {
  const { sendMessage } = useCoachChatContext();
  const { openTimer } = useWorkoutTimerContext();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState(session.name);

  const allExercisesComplete = session.exercises.every((ex) => {
    const completedSets = (ex.sets || []).filter((s) => s.completed).length;
    const skippedSets = (ex.sets || []).filter((s) => s.skipped).length;
    return ex.skipped || (completedSets + skippedSets) >= ex.workingSets;
  });

  const handleDeleteSession = () => {
    setIsDeleteDialogOpen(false);
    onDeleteSession();
  };

  const handleOpenRenameDialog = () => {
    setNewSessionName(session.name);
    setIsRenameDialogOpen(true);
  };

  const handleRenameSession = () => {
    if (newSessionName.trim() && newSessionName !== session.name) {
      onRenameSession(newSessionName.trim());
    }
    setIsRenameDialogOpen(false);
  };

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
            <p className="text-sm text-gray-500 mb-2">Week {weekNumber} • Session {Number(session.id.split('-').pop())}</p>
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
              <DropdownMenuItem onClick={() => sendMessage('What stretches should I do for this workout session?')}>
                <Zap className="w-4 h-4 mr-2" />
                Suggest stretches
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleOpenRenameDialog}>
                <Pencil className="w-4 h-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-red-600">
                <Trash className="w-4 h-4 mr-2" />
                Delete session
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
            onUpdateExerciseNotesGlobal={onUpdateExerciseNotesGlobal}
          />
        ))}
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

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Session</DialogTitle>
            <DialogDescription>
              Enter a new name for this workout session.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            placeholder="Session name"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRenameSession();
              }
            }}
          />
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameSession} disabled={!newSessionName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{session.name}" and all its exercise data? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSession}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
