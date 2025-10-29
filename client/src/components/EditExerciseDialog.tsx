import React, { useState, useEffect } from 'react';
import { Exercise, Week } from '@/types/workout';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface EditExerciseDialogProps {
  exercise: Exercise;
  allWeeks?: Week[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: Partial<Exercise>) => void;
  onSaveAllSessions?: (originalName: string, updates: Partial<Exercise>) => void;
}

export const EditExerciseDialog: React.FC<EditExerciseDialogProps> = ({
  exercise,
  allWeeks,
  open,
  onOpenChange,
  onSave,
  onSaveAllSessions,
}) => {
  const [formData, setFormData] = useState({
    name: exercise.name,
    groupLabel: exercise.groupLabel || '',
    warmupSets: exercise.warmupSets,
    workingSets: exercise.workingSets,
    reps: exercise.reps,
    targetLoad: exercise.targetLoad,
    restSeconds: exercise.restSeconds,
    notes: exercise.notes || '',
  });
  const [showBulkUpdateConfirm, setShowBulkUpdateConfirm] = useState(false);

  // Count how many times this exercise appears across all sessions
  const matchingExercisesCount = allWeeks
    ? allWeeks.reduce((count, week) => {
        return count + week.sessions.reduce((sessionCount, session) => {
          return sessionCount + session.exercises.filter(ex => ex.name === exercise.name).length;
        }, 0);
      }, 0)
    : 0;

  const hasMultipleInstances = matchingExercisesCount > 1;

  // Reset form when exercise changes or dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        name: exercise.name,
        groupLabel: exercise.groupLabel || '',
        warmupSets: exercise.warmupSets,
        workingSets: exercise.workingSets,
        reps: exercise.reps,
        targetLoad: exercise.targetLoad,
        restSeconds: exercise.restSeconds,
        notes: exercise.notes || '',
      });
    }
  }, [exercise, open]);

  const handleSave = () => {
    onSave({
      name: formData.name,
      groupLabel: formData.groupLabel || undefined,
      warmupSets: formData.warmupSets,
      workingSets: formData.workingSets,
      reps: formData.reps,
      targetLoad: formData.targetLoad,
      restSeconds: formData.restSeconds,
      notes: formData.notes || undefined,
    });
    onOpenChange(false);
  };

  const handleBulkUpdate = () => {
    setShowBulkUpdateConfirm(true);
  };

  const handleConfirmBulkUpdate = () => {
    if (onSaveAllSessions) {
      onSaveAllSessions(exercise.name, {
        name: formData.name,
        groupLabel: formData.groupLabel || undefined,
        warmupSets: formData.warmupSets,
        workingSets: formData.workingSets,
        reps: formData.reps,
        targetLoad: formData.targetLoad,
        restSeconds: formData.restSeconds,
        notes: formData.notes || undefined,
      });
    }
    setShowBulkUpdateConfirm(false);
    onOpenChange(false);
  };

  const handleCancelBulkUpdate = () => {
    setShowBulkUpdateConfirm(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Edit Exercise</DialogTitle>
          <DialogDescription>
            Modify the details of this exercise.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 flex-1">
          <div className="space-y-2">
            <Label htmlFor="name">Exercise Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Barbell Squat"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="groupLabel">Group</Label>
              <Input
                id="groupLabel"
                value={formData.groupLabel}
                onChange={(e) => setFormData({ ...formData, groupLabel: e.target.value })}
                placeholder="e.g., A1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="warmupSets">Warmup Sets</Label>
              <Input
                id="warmupSets"
                type="number"
                min="0"
                value={formData.warmupSets}
                onChange={(e) => setFormData({ ...formData, warmupSets: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="workingSets">Working Sets</Label>
              <Input
                id="workingSets"
                type="number"
                min="1"
                value={formData.workingSets}
                onChange={(e) => setFormData({ ...formData, workingSets: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reps">Reps</Label>
              <Input
                id="reps"
                value={formData.reps}
                onChange={(e) => setFormData({ ...formData, reps: e.target.value })}
                placeholder="e.g., 8-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetLoad">Target Load</Label>
              <Input
                id="targetLoad"
                value={formData.targetLoad}
                onChange={(e) => setFormData({ ...formData, targetLoad: e.target.value })}
                placeholder="e.g., 2-3 RIR"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="restSeconds">Rest (sec)</Label>
              <Input
                id="restSeconds"
                type="number"
                min="0"
                value={formData.restSeconds}
                onChange={(e) => setFormData({ ...formData, restSeconds: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Exercise Notes (optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Instructions or coaching notes..."
              className="min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 flex justify-between gap-2 flex-row">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          {hasMultipleInstances && onSaveAllSessions && (
            <Button variant="secondary" onClick={handleBulkUpdate}>
              Update everywhere
            </Button>
          )}
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={showBulkUpdateConfirm} onOpenChange={setShowBulkUpdateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update in all sessions?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update from <strong>{exercise.name}</strong> to <strong>{formData.name}</strong> in {matchingExercisesCount} session{matchingExercisesCount !== 1 ? 's' : ''}.
              {exercise.name !== formData.name && (
                <span className="block mt-2 text-amber-600">
                  Note: The exercise name will be changed across all sessions.
                </span>
              )}
              <span className="block mt-2">
                Are you sure you want to make these changes?
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelBulkUpdate}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmBulkUpdate}>
              Update all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
