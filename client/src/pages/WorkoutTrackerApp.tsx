import React, { useState, useRef, useEffect } from 'react';
import { CalendarIcon, Anvil, MoreVerticalIcon, Upload, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWorkoutProgram } from '@/hooks/useWorkoutProgram';
import { SessionView } from '@/components/SessionView';
import { exportWeeks, importWeeks, loadCurrentWeekIndex, saveCurrentWeekIndex } from '@/utils/localStorage';
import { useToast } from '@/hooks/use-toast';
import { getWorkoutStatus } from '@/utils/idHelpers';

export const WorkoutTrackerApp = (): JSX.Element => {
  const { weeks, addSet, updateSet, deleteSet, startSession, completeSession, importWeeks: importWeeksHook } =
    useWorkoutProgram();
  const { toast } = useToast();
  const [activeSession, setActiveSession] = useState<{
    weekId: string;
    sessionId: string;
  } | null>(null);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(() => {
    // Load cached week index from localStorage
    return loadCurrentWeekIndex();
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    }
  };

  if (!weeks) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Anvil className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading workout program...</p>
        </div>
      </div>
    );
  }

  const handleStartSession = (weekId: string, sessionId: string) => {
    startSession(weekId, sessionId);
    setActiveSession({ weekId, sessionId });
  };

  const handleExport = () => {
    exportWeeks(weeks);
    toast({
      title: 'Program exported',
      description: 'Your workout program has been downloaded as JSON.',
    });
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedWeeks = await importWeeks(file);
      importWeeksHook(importedWeeks);
      toast({
        title: 'Program imported',
        description: 'Your workout program has been loaded successfully.',
      });
    } catch (error) {
      toast({
        title: 'Import failed',
        description: 'Failed to import workout program. Please check the file.',
        variant: 'destructive',
      });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (activeSession) {
    const week = weeks.find((w) => w.id === activeSession.weekId);
    const session = week?.sessions.find((s) => s.id === activeSession.sessionId);

    if (!week || !session) {
      setActiveSession(null);
      return <div>Session not found</div>;
    }

    return (
      <SessionView
        session={session}
        weekNumber={week.weekNumber}
        onAddSet={(exerciseId, set) => addSet(week.id, session.id, exerciseId, set)}
        onUpdateSet={(exerciseId, setNumber, updates) =>
          updateSet(week.id, session.id, exerciseId, setNumber, updates)
        }
        onDeleteSet={(exerciseId, setNumber) =>
          deleteSet(week.id, session.id, exerciseId, setNumber)
        }
        onBack={() => setActiveSession(null)}
        onCompleteSession={() => {
          completeSession(week.id, session.id);
          setActiveSession(null);
        }}
      />
    );
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
            <span className="[font-family:'Inter',Helvetica] font-medium text-white text-xs tracking-[0] leading-4">
              Completed
            </span>
          </Badge>
        );
      case 'in-progress':
        return (
          <Badge className="bg-orange-500 hover:bg-orange-600">
            <span className="[font-family:'Inter',Helvetica] font-medium text-white text-xs tracking-[0] leading-4">
              In Progress
            </span>
          </Badge>
        );
      case 'planned':
        return (
          <Badge variant="outline" className="border-gray-300">
            <span className="[font-family:'Inter',Helvetica] font-medium text-gray-600 text-xs tracking-[0] leading-4">
              Planned
            </span>
          </Badge>
        );
    }
  };

  return (
    <div className="bg-white w-full min-h-screen">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handleImport}
        className="hidden"
      />

      <header className="flex flex-col w-full items-start pt-4 pb-2 px-4 bg-[#fffffff2] border-b-[0.55px] border-solid border-[#0000001a] sticky top-0 z-10">
        <div className="flex h-9 items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <Anvil className="w-6 h-6" />
            <h1 className="[font-family:'Inter',Helvetica] font-bold text-neutral-950 text-base tracking-[-0.31px] leading-6 whitespace-nowrap">
              Resolution
            </h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreVerticalIcon className="w-6 h-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export Program
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Import Program
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="flex flex-col w-full items-start pt-[23.54px] px-4 pb-8">
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
                        <span className="[font-family:'Inter',Helvetica] font-normal text-neutral-950 text-base tracking-[-0.31px] leading-6">
                          Week {week.weekNumber}
                        </span>
                        <Badge
                          variant="outline"
                          className="h-[21.08px] px-2 py-0.5 rounded-lg border-[0.55px] border-solid border-[#0000001a]"
                        >
                          <span className="[font-family:'Inter',Helvetica] font-medium text-neutral-950 text-xs tracking-[0] leading-4">
                            {week.phase}
                          </span>
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        <span className="[font-family:'Inter',Helvetica] font-normal text-[#717182] text-sm tracking-[-0.15px] leading-5">
                          {formatDateRange(week.startDate, week.endDate)}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className="h-[21.08px] px-2 py-0.5 bg-[#eceef2] rounded-lg border-[0.55px] border-solid border-transparent"
                    >
                      <span className="[font-family:'Inter',Helvetica] font-medium text-[#030213] text-xs tracking-[0] leading-4">
                        {completedSessions}/{totalSessions}
                      </span>
                    </Badge>
                  </div>
                  {week.description && (
                    <p className="[font-family:'Inter',Helvetica] font-normal text-[#717182] text-sm tracking-[-0.15px] leading-5 pb-4">
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
                      ex.sets.some((set) => set.completed)
                    );

                    return (
                      <div
                        key={session.id}
                        onClick={() => handleStartSession(week.id, session.id)}
                        className="flex items-start justify-between pt-4 pb-4 px-4 border-b-[0.55px] border-solid border-[#0000001a] last:border-b-0 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                      >
                        <div className="flex flex-col items-start gap-[3.99px] flex-1">
                          <div className="flex items-center justify-between w-full gap-[7.99px]">
                            <h3 className="[font-family:'Inter',Helvetica] font-normal text-neutral-950 text-base tracking-[-0.31px] leading-6">
                              {session.name}
                            </h3>
                            {getStatusBadge(status)}
                          </div>
                          {((session.startedAt && hasCompletedSets) || session.completedDate) && (
                            <p className="[font-family:'Inter',Helvetica] font-normal text-[#717182] text-sm tracking-[-0.15px] leading-5">
                              {session.completedDate
                                ? `Completed ${formatDateTime(session.completedDate)}`
                                : `Started ${formatDateTime(session.startedAt!)}`
                              }
                            </p>
                          )}
                          {(totalExercises > 0 || cardioText) && (
                            <div className="flex items-center gap-2">
                              {totalExercises > 0 && (
                                <span className="[font-family:'Inter',Helvetica] font-normal text-[#717182] text-xs tracking-[0] leading-4">
                                  {totalExercises} {totalExercises === 1 ? 'exercise' : 'exercises'}
                                </span>
                              )}
                              {cardioText && (
                                <span className="[font-family:'Inter',Helvetica] font-normal text-[#717182] text-xs tracking-[0] leading-4">
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
    </div>
  );
};
