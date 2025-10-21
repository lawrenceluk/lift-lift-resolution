import React, { useState, useRef } from 'react';
import { CalendarIcon, DumbbellIcon, MoreVerticalIcon, Upload, Download } from 'lucide-react';
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
import { exportWeeks, importWeeks } from '@/utils/localStorage';
import { useToast } from '@/hooks/use-toast';

export const WorkoutTrackerApp = (): JSX.Element => {
  const { weeks, addSet, updateSet, deleteSet, startSession, completeSession, importWeeks: importWeeksHook } =
    useWorkoutProgram();
  const { toast } = useToast();
  const [activeSession, setActiveSession] = useState<{
    weekId: string;
    sessionId: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!weeks) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <DumbbellIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading workout program...</p>
        </div>
      </div>
    );
  }

  const currentWeek = weeks[0];

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

  const completedSessions = currentWeek.sessions.filter((s) => s.completed).length;
  const totalSessions = currentWeek.sessions.length;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateRange = (start: string, end: string) => {
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
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

      <header className="flex flex-col w-full items-start pt-4 pb-[0.55px] px-4 bg-[#fffffff2] border-b-[0.55px] border-solid border-[#0000001a] sticky top-0 z-10">
        <div className="flex h-9 items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <DumbbellIcon className="w-8 h-8" />
            <h1 className="[font-family:'Inter',Helvetica] font-normal text-neutral-950 text-base tracking-[-0.31px] leading-6 whitespace-nowrap">
              Workout Program
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
        <Card className="w-full bg-white rounded-[14px] border-[0.55px] border-solid border-[#0000001a]">
          <CardContent className="p-0">
            <div className="flex flex-col w-full bg-[#ececf080] pt-4 pb-0 px-4 gap-[7.99px]">
              <div className="flex items-start justify-between w-full">
                <div className="flex flex-col items-start gap-[3.99px]">
                  <div className="flex items-center gap-[7.99px]">
                    <span className="[font-family:'Inter',Helvetica] font-normal text-neutral-950 text-base tracking-[-0.31px] leading-6">
                      Week {currentWeek.weekNumber}
                    </span>
                    <Badge
                      variant="outline"
                      className="h-[21.08px] px-2 py-0.5 rounded-lg border-[0.55px] border-solid border-[#0000001a]"
                    >
                      <span className="[font-family:'Inter',Helvetica] font-medium text-neutral-950 text-xs tracking-[0] leading-4">
                        {currentWeek.phase}
                      </span>
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    <span className="[font-family:'Inter',Helvetica] font-normal text-[#717182] text-sm tracking-[-0.15px] leading-5">
                      {formatDateRange(currentWeek.startDate, currentWeek.endDate)}
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
              {currentWeek.description && (
                <p className="[font-family:'Inter',Helvetica] font-normal text-[#717182] text-sm tracking-[-0.15px] leading-5 pb-4">
                  {currentWeek.description}
                </p>
              )}
            </div>

            <div className="flex flex-col">
              {currentWeek.sessions.map((session) => {
                const totalExercises = session.exercises.length;
                const cardioText = session.cardio
                  ? `${session.cardio.duration} min ${session.cardio.modality || 'cardio'}`
                  : null;

                return (
                  <div
                    key={session.id}
                    className="flex items-start justify-between pt-4 pb-4 px-4 border-b-[0.55px] border-solid border-[#0000001a] last:border-b-0"
                  >
                    <div className="flex flex-col items-start gap-[3.99px] flex-1">
                      <div className="flex items-center gap-[7.99px]">
                        <h3 className="[font-family:'Inter',Helvetica] font-normal text-neutral-950 text-base tracking-[-0.31px] leading-6">
                          {session.name}
                        </h3>
                        {session.completed && (
                          <Badge
                            variant="outline"
                            className="h-[21.08px] px-2 py-0.5 rounded-lg border-[0.55px] border-solid border-green-500 bg-green-50"
                          >
                            <span className="[font-family:'Inter',Helvetica] font-medium text-green-700 text-xs tracking-[0] leading-4">
                              Completed
                            </span>
                          </Badge>
                        )}
                      </div>
                      <p className="[font-family:'Inter',Helvetica] font-normal text-[#717182] text-sm tracking-[-0.15px] leading-5">
                        {session.dayOfWeek && `${session.dayOfWeek} • `}
                        {session.scheduledDate && formatDate(session.scheduledDate)}
                      </p>
                      <div className="flex flex-col gap-0">
                        <div className="flex items-center gap-2">
                          <span className="[font-family:'Inter',Helvetica] font-normal text-[#717182] text-xs tracking-[0] leading-4">
                            {totalExercises} {totalExercises === 1 ? 'exercise' : 'exercises'}
                          </span>
                          {cardioText && (
                            <span className="[font-family:'Inter',Helvetica] font-normal text-[#717182] text-xs tracking-[0] leading-4">
                              • {cardioText}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleStartSession(currentWeek.id, session.id)}
                      className="h-12 px-6 py-2 bg-[#030213] rounded-lg touch-manipulation active:scale-95 transition-transform"
                    >
                      <span className="[font-family:'Inter',Helvetica] font-medium text-white text-sm tracking-[-0.15px] leading-5">
                        Start
                      </span>
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};
