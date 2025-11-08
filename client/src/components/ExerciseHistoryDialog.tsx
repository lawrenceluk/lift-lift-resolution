import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ExerciseHistoryEntry } from '@/utils/exerciseHistory';
import { createWeekId, createSessionId } from '@/utils/idHelpers';
import { MessageSquare, Pencil } from 'lucide-react';

interface ExerciseHistoryDialogProps {
  exerciseName: string;
  history: ExerciseHistoryEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateNote?: (weekId: string, sessionId: string, exerciseId: string, notes: string) => void;
}

export const ExerciseHistoryDialog: React.FC<ExerciseHistoryDialogProps> = ({
  exerciseName,
  history,
  open,
  onOpenChange,
  onUpdateNote,
}) => {
  // Sort history by date descending (most recent first)
  const sortedHistory = [...history].sort((a, b) => {
    if (!a.date || !b.date) return 0;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Track which entry is currently displayed in the callout
  const [selectedEntry, setSelectedEntry] = useState<ExerciseHistoryEntry | null>(
    sortedHistory[0] || null
  );

  // Track note editing state
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editedNote, setEditedNote] = useState('');

  // Reset selected entry when dialog opens or history changes
  React.useEffect(() => {
    if (open) {
      setSelectedEntry(sortedHistory[0] || null);
      setIsEditingNote(false);
    }
  }, [open, history]);

  const handleStartEditNote = () => {
    if (!selectedEntry) return;
    setEditedNote(selectedEntry.exercise.userNotes || '');
    setIsEditingNote(true);
  };

  const handleSaveNote = () => {
    if (!selectedEntry || !onUpdateNote) return;
    const weekId = createWeekId(selectedEntry.weekNumber);
    const sessionId = createSessionId(selectedEntry.weekNumber, selectedEntry.sessionNumber);
    onUpdateNote(weekId, sessionId, selectedEntry.exercise.id, editedNote);
    setIsEditingNote(false);
  };

  const handleCancelNote = () => {
    setIsEditingNote(false);
    setEditedNote('');
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const formatDateWithWeek = (entry: ExerciseHistoryEntry): string => {
    const dateStr = formatDate(entry.date);
    return `${dateStr} (W${entry.weekNumber})`;
  };

  const calculateVolume = (entry: ExerciseHistoryEntry): string => {
    const completedSets = entry.sets.filter((s) => s.completed);
    let totalVolume = 0;
    let hasBodyweight = false;

    completedSets.forEach((set) => {
      if (set.weight) {
        totalVolume += set.reps * set.weight;
      } else {
        hasBodyweight = true;
      }
    });

    if (totalVolume === 0 && hasBodyweight) {
      return 'BW only';
    }

    if (totalVolume === 0) {
      return '-';
    }

    // Get the unit from the first set with weight
    const firstSetWithWeight = completedSets.find((s) => s.weight);
    const unit = firstSetWithWeight?.weightUnit || 'kg';

    return `${totalVolume.toLocaleString()} ${unit}`;
  };

  const renderSets = (entry: ExerciseHistoryEntry): JSX.Element | null => {
    const completedSets = entry.sets.filter((s) => s.completed);

    if (completedSets.length === 0) {
      return null;
    }

    return (
      <div className="flex flex-col gap-1.5">
        {completedSets.map((set, idx) => {
          const weight = set.weight ? `${set.weight}${set.weightUnit}` : 'BW';
          const rirText = set.rir !== undefined ? ` @${set.rir}` : '';
          return (
            <Badge key={idx} variant="secondary" className="justify-start font-mono text-xs w-fit">
              <span className="font-semibold">{set.reps}</span>
              <span className="mx-1">×</span>
              <span className="font-semibold">{weight}</span>
              {rirText && <span className="text-gray-500 ml-1">{rirText}</span>}
            </Badge>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl py-8 max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Exercise History: {exerciseName}</DialogTitle>
          <DialogDescription>
            Previous sessions where you performed this exercise
          </DialogDescription>
        </DialogHeader>

        {sortedHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No history found for this exercise
          </div>
        ) : (
          <div className="flex flex-col gap-4 min-h-0">
            {/* Performance Callout - Always Visible */}
            {selectedEntry && (
              <div className="border rounded-lg p-4 bg-gray-50 flex-shrink-0">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-sm text-gray-700">
                      {selectedEntry.sessionName}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDateWithWeek(selectedEntry)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Total Volume</p>
                    <p className="font-semibold text-sm">{calculateVolume(selectedEntry)}</p>
                  </div>
                </div>
                <div className="mt-2">
                  {renderSets(selectedEntry)}
                </div>

                {/* Note section */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  {isEditingNote ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editedNote}
                        onChange={(e) => setEditedNote(e.target.value)}
                        placeholder="Add a note about this performance..."
                        className="text-xs min-h-[60px]"
                        autoFocus
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelNote}
                          className="h-7 text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveNote}
                          className="h-7 text-xs"
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : selectedEntry.exercise.userNotes ? (
                    <div
                      className="group cursor-pointer hover:bg-gray-100 -mx-2 px-2 py-1 rounded transition-colors"
                      onClick={handleStartEditNote}
                    >
                      <div className="flex items-start gap-2">
                        <p className="text-xs text-gray-600 italic flex-1">
                          {selectedEntry.exercise.userNotes}
                        </p>
                        <Pencil className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                      </div>
                    </div>
                  ) : onUpdateNote ? (
                    <button
                      onClick={handleStartEditNote}
                      className="text-xs text-gray-400 hover:text-gray-600 italic flex items-center gap-1"
                    >
                      <Pencil className="h-3 w-3" />
                      Add a note...
                    </button>
                  ) : null}
                </div>
              </div>
            )}

            {/* History Table - Scrollable */}
            {sortedHistory.length > 1 && (
              <div className="flex flex-col min-h-0">
                <h3 className="font-semibold text-sm text-gray-700 mb-3 flex-shrink-0">Session Log</h3>
                <div className="overflow-y-auto flex-1 -mx-6 md:mx-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-6 md:pl-4">Date</TableHead>
                        <TableHead>Session</TableHead>
                        <TableHead className="pr-6 md:pr-4">Volume</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedHistory.map((entry, index) => {
                        const isSelected = selectedEntry === entry;
                        const hasNote = !!entry.exercise.userNotes;
                        return (
                          <TableRow
                            key={index}
                            onClick={() => setSelectedEntry(entry)}
                            className={`cursor-pointer transition-colors py-3 ${
                              isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                            }`}
                          >
                            <TableCell className="font-medium text-sm pl-6 md:pl-4">
                              {formatDateWithWeek(entry)}
                            </TableCell>
                            <TableCell className="text-sm">
                              <span className="inline-flex items-center gap-1">
                                {entry.sessionName}
                                {hasNote && (
                                  <MessageSquare className="h-3 w-3 text-gray-400 inline-block" />
                                )}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm font-medium pr-6 md:pr-4">
                              {calculateVolume(entry)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
