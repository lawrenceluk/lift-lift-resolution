import React, { useState, useEffect, useMemo } from 'react';
import { Exercise, SetResult, Week } from '@/types/workout';
import { SetLogger } from './SetLogger';
import { EditExerciseDialog } from './EditExerciseDialog';
import { ExerciseHistoryDialog } from './ExerciseHistoryDialog';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { CircleSlash2, StickyNote, MoreVertical, Pencil, ChevronDown, ChevronUp, ArrowLeftRight, History } from 'lucide-react';
import { useCoachChatContext } from '@/contexts/CoachChatContext';
import { findExerciseHistory } from '@/utils/exerciseHistory';

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
  onUpdateExerciseNotesById?: (exerciseId: string, notes: string) => void;
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
  onUpdateExerciseNotesById,
}) => {
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [notesText, setNotesText] = useState(exercise.userNotes || '');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const { sendMessage } = useCoachChatContext();

  // Memoize exercise history to avoid recalculating on every render
  const exerciseHistory = useMemo(
    () => findExerciseHistory(allWeeks || null, exercise.name, exercise.id),
    [allWeeks, exercise.name, exercise.id]
  );

  // Check if this exercise has historical data (memoized)
  const hasHistory = useMemo(
    () => exerciseHistory.length > 0,
    [exerciseHistory]
  );


  const completedSets = exercise.sets.filter((s) => s.completed).length;
  const skippedSets = exercise.sets.filter((s) => s.skipped).length;
  const totalSets = exercise.workingSets;
  const isComplete = (completedSets + skippedSets) >= totalSets;
  const isSkipped = exercise.skipped;

  // Auto-collapse when all sets are complete or when skipped
  useEffect(() => {
    if (isComplete || isSkipped) {
      setIsCollapsed(true);
    } else {
      setIsCollapsed(false);
    }
  }, [isComplete, isSkipped]);

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

  // Reusable action buttons component
  const ActionButtons = () => {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleOpenNotesDialog}
          className={`h-8 w-8 hover:text-gray-600 ${exercise.userNotes ? 'text-blue-500' : 'text-gray-400'}`}
        >
          <StickyNote className="w-5 h-5" />
        </Button>
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
            {isSkipped ? (
              <DropdownMenuItem onClick={handleToggleSkip}>
                <CircleSlash2 className="w-4 h-4 mr-2" />
                Unskip
              </DropdownMenuItem>
            ) : !isComplete && (
              <DropdownMenuItem onClick={handleToggleSkip}>
                <CircleSlash2 className="w-4 h-4 mr-2" />
                Skip
              </DropdownMenuItem>
            )}
            {(isComplete || isSkipped) && (
              <>
                <DropdownMenuItem onClick={() => setIsCollapsed(!isCollapsed)}>
                  {isCollapsed ? (
                    <>
                      <ChevronDown className="w-4 h-4 mr-2" />
                      Expand
                    </>
                  ) : (
                    <>
                      <ChevronUp className="w-4 h-4 mr-2" />
                      Collapse
                    </>
                  )}
                </DropdownMenuItem>
              </>
            )}
            {!isComplete && !isSkipped && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Modify
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleReplaceExercise}>
                  <ArrowLeftRight className="w-4 h-4 mr-2" />
                  Replace
                </DropdownMenuItem>
              </>
            )}
            {hasHistory && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsHistoryDialogOpen(true)}>
                  <History className="w-4 h-4 mr-2" />
                  History
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <>
      {isCollapsed && (isComplete || isSkipped) ? (
        // Compact collapsed view for completed or skipped exercises
        <Card className={`mb-4 ${isSkipped ? 'bg-gray-50 border-gray-300' : 'bg-gray-50 border-gray-200'}`}>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                {exercise.groupLabel && (
                  <Badge variant="outline" className="text-xs font-mono">
                    {exercise.groupLabel}
                  </Badge>
                )}
                {isSkipped ? (
                  <Badge variant="destructive" className="bg-gray-500">Skipped</Badge>
                ) : (
                  <Badge className="bg-green-500">Complete</Badge>
                )}
                <div className="flex flex-col">
                  <h3 className="text-sm font-medium text-gray-700">
                    {exercise.name}
                  </h3>
                  {!isSkipped && (
                    <p className="text-xs text-gray-500">
                      {completedSets > 0 && skippedSets > 0
                        ? `${completedSets}/${totalSets} sets completed, ${skippedSets} skipped`
                        : skippedSets > 0
                        ? `${skippedSets}/${totalSets} sets skipped`
                        : `${completedSets}/${totalSets} sets completed`
                      }
                    </p>
                  )}
                </div>
              </div>
              <ActionButtons />
            </div>
          </CardHeader>
        </Card>
      ) : (
        // Expanded view
        <div className="relative">
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
                {!isSkipped && !isComplete && (
                  <Badge variant="outline" className="text-xs font-mono">
                    {totalSets} sets
                  </Badge>
                )}
              </div>
              <div className="flex-1 w-full">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {exercise.name}
                  </h3>
                  <ActionButtons />
                </div>
              </div>
            </div>
            {exercise.userNotes && (
              <div
                className="mt-2 p-2 bg-blue-50 rounded border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors group"
                onClick={handleOpenNotesDialog}
              >
                <div className="flex items-start gap-2">
                  <p className="text-sm text-blue-900 flex-1">{exercise.userNotes}</p>
                  <Pencil className="h-3 w-3 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {exercise.notes && (
              <p className="text-sm text-gray-600 italic">{exercise.notes}</p>
            )}
            {!isSkipped && (
              <SetLogger
                exercise={exercise}
                allWeeks={allWeeks}
                onAddSet={onAddSet}
                onUpdateSet={onUpdateSet}
                onDeleteSet={onDeleteSet}
              />
            )}
          </CardContent>
        </Card>
        </div>
      )}

      {/* Shared dialogs for both views */}
      <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exercise Notes</DialogTitle>
            <DialogDescription>
              Add your notes for this exercise (e.g., variations or reminders).
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

      <ExerciseHistoryDialog
        exerciseName={exercise.name}
        history={exerciseHistory}
        open={isHistoryDialogOpen}
        onOpenChange={setIsHistoryDialogOpen}
        onUpdateNote={onUpdateExerciseNotesById}
      />
    </>
  );
};
