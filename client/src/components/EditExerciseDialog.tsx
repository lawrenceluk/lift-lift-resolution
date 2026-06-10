import React, { useState, useEffect } from 'react';
import { Exercise } from '@/types/workout';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface EditExerciseDialogProps {
  exercise: Exercise;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: Partial<Exercise>) => void;
}

/**
 * Deviate-and-log: modify this session's exercise in place. Edits are
 * device-truth for this record only — the brain sees the deviation when the
 * session delivers and folds it into the next prescription.
 */
export const EditExerciseDialog: React.FC<EditExerciseDialogProps> = ({
  exercise,
  open,
  onOpenChange,
  onSave,
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
                value={formData.workingSets === 0 ? '' : formData.workingSets}
                onChange={(e) => setFormData({ ...formData, workingSets: parseInt(e.target.value) || 0 })}
                onBlur={(e) => {
                  const value = parseInt(e.target.value);
                  if (!value || value <= 0) {
                    setFormData({ ...formData, workingSets: 1 });
                  }
                }}
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
            <div className="flex items-center justify-between">
              <Label htmlFor="notes">Exercise Notes (optional)</Label>
              {formData.notes && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFormData({ ...formData, notes: '' })}
                  className="h-auto py-0 px-2 text-xs underline"
                >
                  Clear
                </Button>
              )}
            </div>
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
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
