import React, { useState } from 'react';
import { Exercise, SetResult, Week } from '@/types/workout';
import { SetLogger } from './SetLogger';
import { EditExerciseDialog } from './EditExerciseDialog';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CircleSlash2, RotateCw, StickyNote, MoreVertical, Pencil, ArrowLeftRight } from 'lucide-react';
import { useCoachChatContext } from '@/contexts/CoachChatContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';

interface ExerciseViewProps {
  exercise: Exercise;
  allWeeks?: Week[];
  onAddSet: (set: SetResult) => void;
  onUpdateSet: (setNumber: number, updates: Partial<SetResult>) => void;
  onDeleteSet: (setNumber: number) => void;
  onSkip: () => void;
  onUnskip: () => void;
  onUpdateNotes: (notes: string) => void;
  onUpdateExercise: (updates: Partial<Exercise>) => void;
  onUpdateExerciseInAllSessions?: (originalName: string, updates: Partial<Exercise>) => void;
}

export const ExerciseView: React.FC<ExerciseViewProps> = ({
  exercise,
  allWeeks,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onSkip,
  onUnskip,
  onUpdateNotes,
  onUpdateExercise,
  onUpdateExerciseInAllSessions,
}) => {
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [notesText, setNotesText] = useState(exercise.userNotes || '');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { sendMessage } = useCoachChatContext();

  const completedSets = exercise.sets.filter((s) => s.completed).length;
  const skippedSets = exercise.sets.filter((s) => s.skipped).length;
  const totalSets = exercise.workingSets;
  const isComplete = (completedSets + skippedSets) >= totalSets;
  const isSkipped = exercise.skipped;

  const handleToggleSkip = () => {
    if (isSkipped) {
      onUnskip();
    } else {
      onSkip();
    }
  };

  const handleOpenNotesDialog = () => {
    setNotesText(exercise.userNotes || '');
    setIsNotesDialogOpen(true);
  };

  const handleSaveNotes = () => {
    onUpdateNotes(notesText);
    setIsNotesDialogOpen(false);
  };

  const handleCancelNotes = () => {
    setNotesText(exercise.userNotes || '');
    setIsNotesDialogOpen(false);
  };

  const handleReplaceExercise = () => {
    sendMessage(`I want to replace ${exercise.name} in this workout`);
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-gray-600"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleReplaceExercise}>
                    <ArrowLeftRight className="w-4 h-4 mr-2" />
                    Replace
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleOpenNotesDialog}>
                    <StickyNote className={`w-4 h-4 mr-2`} />
                    {exercise.userNotes ? 'Edit note' : 'Add note'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleToggleSkip}>
                    {isSkipped ? (
                      <>
                        <RotateCw className="w-4 h-4 mr-2" />
                        Unskip
                      </>
                    ) : (
                      <>
                        <CircleSlash2 className="w-4 h-4 mr-2" />
                        Skip
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                    <Pencil className="w-4 h-4 mr-2" />
                     Modify
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        {exercise.notes && (
          <p className="text-sm text-gray-600 italic">{exercise.notes}</p>
        )}
        {exercise.userNotes && (
          <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
            <p className="text-sm text-blue-900">{exercise.userNotes}</p>
          </div>
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

      <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exercise Notes</DialogTitle>
            <DialogDescription>
              Add personal notes for this exercise (e.g., equipment used, variations, or reminders).
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            placeholder="e.g., Used dumbbells instead of barbell..."
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelNotes}>
              Cancel
            </Button>
            <Button onClick={handleSaveNotes}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditExerciseDialog
        exercise={exercise}
        allWeeks={allWeeks}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={onUpdateExercise}
        onSaveAllSessions={onUpdateExerciseInAllSessions}
      />
    </Card>
  );
};
