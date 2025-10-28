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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Exercise</DialogTitle>
          <DialogDescription>
            Modify the details of this exercise.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Exercise Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Barbell Squat"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="groupLabel">Group Label (optional)</Label>
            <Input
              id="groupLabel"
              value={formData.groupLabel}
              onChange={(e) => setFormData({ ...formData, groupLabel: e.target.value })}
              placeholder="e.g., A1, B2 (for supersets)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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

          <div className="space-y-2">
            <Label htmlFor="reps">Reps</Label>
            <Input
              id="reps"
              value={formData.reps}
              onChange={(e) => setFormData({ ...formData, reps: e.target.value })}
              placeholder="e.g., 8-10 or 5"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetLoad">Target Load</Label>
            <Input
              id="targetLoad"
              value={formData.targetLoad}
              onChange={(e) => setFormData({ ...formData, targetLoad: e.target.value })}
              placeholder="e.g., 2-3 RIR, 70% 1RM, bodyweight"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="restSeconds">Rest Time (seconds)</Label>
            <Input
              id="restSeconds"
              type="number"
              min="0"
              value={formData.restSeconds}
              onChange={(e) => setFormData({ ...formData, restSeconds: parseInt(e.target.value) || 0 })}
            />
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

        <DialogFooter>
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
