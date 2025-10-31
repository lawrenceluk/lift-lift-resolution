import React, { useState, useEffect } from 'react';
import { CalendarIcon, MoreVerticalIcon, Upload, Download, HelpCircle, ArrowLeft, Search } from 'lucide-react';
import { useLocation, useRoute } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWorkoutProgramContext } from '@/contexts/WorkoutProgramContext';
import { SessionView } from '@/components/SessionView';
import { ImportModal } from '@/components/ImportModal';
import { ExportModal } from '@/components/ExportModal';
import { loadCurrentWeekIndex, saveCurrentWeekIndex } from '@/utils/localStorage';
import { useToast } from '@/hooks/use-toast';
import { getWorkoutStatus, parseId } from '@/utils/idHelpers';

export const WorkoutTrackerApp = (): JSX.Element => {
  const { weeks, addSet, updateSet, deleteSet, startSession, completeSession, skipExercise, unskipExercise, updateExerciseNotes, updateExercise, updateExerciseInAllSessions, importWeeks: importWeeksHook } =
    useWorkoutProgramContext();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Check if we're on a workout route (either week or session)
  const [matchWorkout, workoutParams] = useRoute('/:id');

  // Modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Determine current week index from URL or localStorage
  const [currentWeekIndex, setCurrentWeekIndex] = useState(() => {
    return loadCurrentWeekIndex();
  });

  // Sync current week index with URL params
  useEffect(() => {
    if (!weeks || !matchWorkout || !workoutParams?.id) return;

    // Parse the ID to determine if it's a week or session
    const parsed = parseId(workoutParams.id);
    if (parsed?.weekNumber) {
      const index = weeks.findIndex(w => w.weekNumber === parsed.weekNumber);
      if (index !== -1 && index !== currentWeekIndex) {
        setCurrentWeekIndex(index);
      }
    }
  }, [weeks, matchWorkout, workoutParams, currentWeekIndex]);

  // Save current week index to localStorage whenever it changes
  useEffect(() => {
    saveCurrentWeekIndex(currentWeekIndex);
  }, [currentWeekIndex]);

  // Ensure current week index is valid when weeks are loaded
  useEffect(() => {
    if (weeks && currentWeekIndex >= weeks.length) {
      setCurrentWeekIndex(0);
    }
  }, [weeks, currentWeekIndex]);

  const updateCurrentWeekIndex = (newIndex: number) => {
    if (weeks && newIndex >= 0 && newIndex < weeks.length) {
      setCurrentWeekIndex(newIndex);
      // Update URL to reflect the new week
      const week = weeks[newIndex];
      setLocation(`/${week.id}`);
    }
  };

  const goToHome = () => {
    setLocation('/');
  };

  if (!weeks) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Search className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading workout program...</p>
        </div>
      </div>
    );
  }

  const handleStartSession = (weekId: string, sessionId: string) => {
    startSession(weekId, sessionId);
    setLocation(`/${sessionId}`);
  };

  const handleImport = (importedWeeks: any[]) => {
    importWeeksHook(importedWeeks);
    toast({
      title: 'Program imported',
      description: 'Your workout program has been loaded successfully.',
    });
  };

  // Handle workout route (either week or session)
  if (matchWorkout && workoutParams?.id) {
    const id = workoutParams.id;
    const parsed = parseId(id);

    // Determine if this is a session ID (has sessionNumber) or week ID
    if (parsed?.sessionNumber) {
      // This is a session
      const week = weeks.find((w) => w.weekNumber === parsed.weekNumber);
      const session = week?.sessions.find((s) => s.id === id);

      if (!week || !session) {
        return (
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="text-center max-w-md">
              <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Workout Not Found</h2>
              <p className="text-gray-600 mb-6">
                The workout session you're looking for doesn't exist in your current program. It may have been removed or the link is outdated.
              </p>
              <Button onClick={goToHome} className="w-full sm:w-auto">
                Go to Home
              </Button>
            </div>
          </div>
        );
      }

      return (
        <SessionView
          session={session}
          weekNumber={week.weekNumber}
          allWeeks={weeks}
          onAddSet={(exerciseId, set) => addSet(week.id, session.id, exerciseId, set)}
          onUpdateSet={(exerciseId, setNumber, updates) =>
            updateSet(week.id, session.id, exerciseId, setNumber, updates)
          }
          onDeleteSet={(exerciseId, setNumber) =>
            deleteSet(week.id, session.id, exerciseId, setNumber)
          }
          onSkipExercise={(exerciseId) => skipExercise(week.id, session.id, exerciseId)}
          onUnskipExercise={(exerciseId) => unskipExercise(week.id, session.id, exerciseId)}
          onUpdateExerciseNotes={(exerciseId, notes) =>
            updateExerciseNotes(week.id, session.id, exerciseId, notes)
          }
          onUpdateExercise={(exerciseId, updates) =>
            updateExercise(week.id, session.id, exerciseId, updates)
          }
          onUpdateExerciseInAllSessions={updateExerciseInAllSessions}
          onBack={() => setLocation(`/${week.id}`)}
          onCompleteSession={() => {
            completeSession(week.id, session.id);
            setLocation(`/${week.id}`);
          }}
        />
      );
    } else if (parsed?.weekNumber) {
      // This is a week
      const week = weeks.find((w) => w.id === id);

      if (!week) {
        return (
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="text-center max-w-md">
              <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Week Not Found</h2>
              <p className="text-gray-600 mb-6">
                The week you're looking for doesn't exist in your current program. It may have been removed or the link is outdated.
              </p>
              <Button onClick={goToHome} className="w-full sm:w-auto">
                Go to Home
              </Button>
            </div>
          </div>
        );
      }
    }
  }


  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateRange = (start: string, end: string) => {
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    if (isToday) {
      return 'Today';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (status: 'planned' | 'in-progress' | 'completed') => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <span className="font-medium text-white text-xs leading-4">
              Completed
            </span>
          </Badge>
        );
      case 'in-progress':
        return (
          <Badge className="bg-orange-500 hover:bg-orange-600">
            <span className="font-medium text-white text-xs leading-4">
              In Progress
            </span>
          </Badge>
        );
      case 'planned':
        return (
          <Badge variant="outline" className="border-gray-300">
            <span className="font-medium text-gray-600 text-xs leading-4">
              Planned
            </span>
          </Badge>
        );
    }
  };

  return (
    <div className="bg-white w-full min-h-screen flex flex-col items-center">
      <header className="flex flex-col w-full max-w-2xl items-start pt-4 pb-2 px-4 bg-[#fffffff2] border-b-[0.55px] border-solid border-[#0000001a] sticky top-0 z-10">
        <div className="flex h-9 items-center justify-between w-full">
          <div className="flex items-center gap-3">
            {matchWorkout && workoutParams?.id && parseId(workoutParams.id)?.sessionNumber && (
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => {
                const parsed = parseId(workoutParams.id);
                if (parsed?.weekNumber) {
                  const week = weeks.find((w) => w.weekNumber === parsed.weekNumber);
                  if (week) {
                    setLocation(`/${week.id}`);
                  }
                }
              }}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <img src="/header-logo.png" alt="Lift Lift Resolution" className="h-8" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreVerticalIcon className="w-6 h-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLocation('/how-it-works')}>
                <HelpCircle className="w-4 h-4 mr-2" />
                How it works
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setExportModalOpen(true)}>
                <Download className="w-4 h-4 mr-2" />
                Export Program
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setImportModalOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Import Program
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="flex flex-col w-full max-w-2xl items-start pt-[23.54px] px-4 pb-8">
        {weeks.length > 1 && (
          <div className="relative flex items-center justify-center w-full mb-4">
            {currentWeekIndex > 0 && (
              <Button
                variant="outline"
                onClick={() => updateCurrentWeekIndex(currentWeekIndex - 1)}
                className="h-9 absolute left-0"
              >
                ← Previous
              </Button>
            )}
            <span className="text-sm text-gray-600">
              Week {currentWeekIndex + 1} of {weeks.length}
            </span>
            {currentWeekIndex < weeks.length - 1 && (
              <Button
                variant="outline"
                onClick={() => updateCurrentWeekIndex(currentWeekIndex + 1)}
                className="h-9 absolute right-0"
              >
                Next →
              </Button>
            )}
          </div>
        )}

        {(() => {
          const week = weeks[currentWeekIndex];
          const completedSessions = week.sessions.filter((s) => s.completed).length;
          const totalSessions = week.sessions.length;

          return (
            <Card className="w-full bg-white rounded-[14px] border-[0.55px] border-solid border-[#0000001a]">
              <CardContent className="p-0">
                <div className="flex flex-col w-full bg-[#ececf080] pt-4 pb-0 px-4 gap-[7.99px]">
                  <div className="flex items-start justify-between w-full">
                    <div className="flex flex-col items-start gap-[3.99px]">
                      <div className="flex items-center gap-[7.99px]">
                        <span className="font-normal text-neutral-950 text-base leading-6">
                          Week {week.weekNumber}
                        </span>
                        <Badge
                          variant="outline"
                          className="h-[21.08px] px-2 py-0.5 rounded-lg border-[0.55px] border-solid border-[#0000001a]"
                        >
                          <span className="font-medium text-neutral-950 text-xs leading-4">
                            {week.phase}
                          </span>
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        <span className="font-normal text-[#717182] text-sm leading-5">
                          {formatDateRange(week.startDate, week.endDate)}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className="h-[21.08px] px-2 py-0.5 bg-[#eceef2] rounded-lg border-[0.55px] border-solid border-transparent"
                    >
                      <span className="font-medium text-[#030213] text-xs leading-4">
                        {completedSessions}/{totalSessions}
                      </span>
                    </Badge>
                  </div>
                  {week.description && (
                    <p className="font-normal text-[#717182] text-sm leading-5 pb-4">
                      {week.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-col">
                  {week.sessions.map((session) => {
                    const totalExercises = session.exercises.length;
                    const cardioText = session.cardio
                      ? `${session.cardio.duration} min ${session.cardio.modality || 'cardio'}`
                      : null;
                    const status = getWorkoutStatus(session);
                    const hasCompletedSets = session.exercises.some((ex) =>
                      ex.sets?.some((set) => set.completed)
                    );

                    return (
                      <div
                        key={session.id}
                        onClick={() => handleStartSession(week.id, session.id)}
                        className="flex items-start justify-between pt-4 pb-4 px-4 border-b-[0.55px] border-solid border-[#0000001a] last:border-b-0 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                      >
                        <div className="flex flex-col items-start gap-[3.99px] flex-1">
                          <div className="flex items-center justify-between w-full gap-[7.99px]">
                            <h3 className="font-normal text-neutral-950 text-base leading-6">
                              {session.name}
                            </h3>
                            {getStatusBadge(status)}
                          </div>
                          {((session.startedAt && hasCompletedSets) || session.completedDate) && (
                            <p className="font-normal text-[#717182] text-sm leading-5">
                              {session.completedDate
                                ? `Completed ${formatDateTime(session.completedDate)}`
                                : `Started ${formatDateTime(session.startedAt!)}`
                              }
                            </p>
                          )}
                          {(totalExercises > 0 || cardioText) && (
                            <div className="flex items-center gap-2">
                              {totalExercises > 0 && (
                                <span className="font-normal text-[#717182] text-xs leading-4">
                                  {totalExercises} {totalExercises === 1 ? 'exercise' : 'exercises'}
                                </span>
                              )}
                              {cardioText && (
                                <span className="font-normal text-[#717182] text-xs leading-4">
                                  {totalExercises > 0 ? '+' : ''}{cardioText}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })()}
      </main>

      {/* Modals */}
      <ImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImport={handleImport}
      />
      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        weeks={weeks}
      />

      {/* Coach Chat is now rendered globally in App.tsx */}
    </div>
  );
};
