import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  QuestionnaireData,
  DURATION_OPTIONS,
  SESSIONS_PER_WEEK_OPTIONS,
  GOAL_OPTIONS,
  EXPERIENCE_OPTIONS,
  EQUIPMENT_OPTIONS,
} from '@/types/programBuilder';

interface ProgramBuilderQuestionnaireProps {
  onNext: (data: QuestionnaireData) => void;
  onCancel: () => void;
}

export const ProgramBuilderQuestionnaire: React.FC<ProgramBuilderQuestionnaireProps> = ({
  onNext,
  onCancel,
}) => {
  const [formData, setFormData] = useState<QuestionnaireData>({
    duration: '4',
    sessionsPerWeek: 4,
    goal: 'hypertrophy',
    experience: 'intermediate',
    equipment: 'full-gym',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Duration */}
      <div className="space-y-2">
        <Label htmlFor="duration">Program length</Label>
        <Select
          value={formData.duration}
          onValueChange={(value) => setFormData({ ...formData, duration: value })}
        >
          <SelectTrigger id="duration">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DURATION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-gray-500">
          We'll start with a {formData.duration}-week program. You can always add more weeks later!
        </p>
      </div>

      {/* Sessions per week */}
      <div className="space-y-2">
        <Label htmlFor="sessions">How many days per week can you train?</Label>
        <Select
          value={formData.sessionsPerWeek.toString()}
          onValueChange={(value) =>
            setFormData({ ...formData, sessionsPerWeek: parseInt(value) })
          }
        >
          <SelectTrigger id="sessions">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SESSIONS_PER_WEEK_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value.toString()}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Goal */}
      <div className="space-y-2">
        <Label htmlFor="goal">Training goal</Label>
        <Select
          value={formData.goal}
          onValueChange={(value) => setFormData({ ...formData, goal: value })}
        >
          <SelectTrigger id="goal">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GOAL_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-gray-500">
          {GOAL_OPTIONS.find((opt) => opt.value === formData.goal)?.description}
        </p>
      </div>

      {/* Experience */}
      <div className="space-y-2">
        <Label htmlFor="experience">Experience level</Label>
        <Select
          value={formData.experience}
          onValueChange={(value) => setFormData({ ...formData, experience: value })}
        >
          <SelectTrigger id="experience">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EXPERIENCE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-gray-500">
          {EXPERIENCE_OPTIONS.find((opt) => opt.value === formData.experience)?.description}
        </p>
      </div>

      {/* Equipment */}
      <div className="space-y-2">
        <Label htmlFor="equipment">Available equipment</Label>
        <Select
          value={formData.equipment}
          onValueChange={(value) => setFormData({ ...formData, equipment: value })}
        >
          <SelectTrigger id="equipment">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EQUIPMENT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Anything else we should know?</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Injuries, exercise preferences, time constraints..."
          className="min-h-[80px]"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" className="flex-1">
          Next →
        </Button>
      </div>
    </form>
  );
};
