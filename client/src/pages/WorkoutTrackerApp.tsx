import React from 'react';
import { HelpCircle, Search, Menu, RefreshCw, LogOut, WifiOff } from 'lucide-react';
import { useLocation, useRoute } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWorkoutProgramContext } from '@/contexts/WorkoutProgramContext';
import { useSecretGate } from '@/components/SecretGate';
import { SessionView } from '@/components/SessionView';
import { useToast } from '@/hooks/use-toast';
import { PrescribedSession, PerformedSession, SessionStatus } from '@/types/workout';
import { todayPT } from '@/utils/timeHelpers';

const statusBadge = (status: SessionStatus) => {
  switch (status) {
    case 'ingested':
      return <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-xs">Ingested ✓</Badge>;
    case 'delivered':
      return <Badge className="bg-green-600 hover:bg-green-700 text-white text-xs">Delivered ✓</Badge>;
    case 'departed':
      return (
        <Badge variant="outline" className="border-amber-400 text-amber-700 text-xs">
          Saved on device
        </Badge>
      );
    case 'in-progress':
      return <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-xs">In progress</Badge>;
    case 'planned':
      return (
        <Badge variant="outline" className="border-gray-300 text-gray-600 text-xs">
          On tap
        </Badge>
      );
  }
};

const formatDay = (dateStr: string) => {
  const today = todayPT();
  if (dateStr === today) return 'Today';
  const date = new Date(`${dateStr}T12:00:00`);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const themeLabel = (theme: string) =>
  theme ? theme.charAt(0).toUpperCase() + theme.slice(1) : 'Session';

export const WorkoutTrackerApp = (): JSX.Element => {
  const {
    initializing,
    fetchError,
    program,
    queueView,
    performedRecords,
    getSession,
    statusOf,
    addSet,
    updateSet,
    deleteSet,
    setExerciseSkipped,
    updateExerciseNotes,
    updateExercise,
    departSession,
    pullProgram,
  } = useWorkoutProgramContext();
  const { forgetCode } = useSecretGate();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [matchSession, sessionParams] = useRoute('/:sessionId');

  const handlePullProgram = async () => {
    const result = await pullProgram();
    if (result.ok) {
      toast({ title: 'Program refreshed', description: 'Pulled the latest from Point One.' });
    } else {
      toast({
        title: 'Could not reach Point One',
        description: result.error ?? 'Your current program is unchanged.',
        variant: 'destructive',
      });
    }
  };

  const handleForgetCode = () => {
    const ok = window.confirm(
      'Forget the access code on this device? You will need to re-enter it to use the app.'
    );
    if (ok) forgetCode();
  };

  const handleDepart = async (sessionId: string, note?: string) => {
    const { delivered } = await departSession(sessionId, note);
    setLocation('/');
    if (delivered) {
      toast({
        title: 'Done for today',
        description: 'Delivered ✓ — Point One picks this up on its next pass.',
      });
    } else {
      toast({
        title: 'Done for today',
        description: 'Saved on this device — will deliver when Point One is reachable.',
      });
    }
  };

  // ----- session route -------------------------------------------------------

  if (matchSession && sessionParams?.sessionId && sessionParams.sessionId !== 'how-it-works') {
    const id = sessionParams.sessionId;
    const found = getSession(id);

    if (!found) {
      return (
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="text-center max-w-md">
            <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Workout Not Found</h2>
            <p className="text-gray-600 mb-6">
              This session isn't in the current program. It may have been consumed by a newer
              program, or the link is outdated.
            </p>
            <Button onClick={() => setLocation('/')} className="w-full sm:w-auto">
              Go to Home
            </Button>
          </div>
        </div>
      );
    }

    const { session, status, isLocal } = found;
    const sealed = isLocal && !!(session as PerformedSession).sealed;
    const performedDate = (session as PerformedSession).performedDate;
    // Device-truth sessions are editable until they seal; a sealed session can
    // still amend on its performedDate (D9). Ingested history is read-only —
    // corrections go through the Point One chat.
    const editable =
      status !== 'ingested' && (!sealed || performedDate === todayPT());

    return (
      <SessionView
        session={session}
        status={status}
        editable={editable}
        performedRecords={performedRecords}
        onAddSet={(exerciseId, set) => addSet(id, exerciseId, set)}
        onUpdateSet={(exerciseId, setNumber, updates) => updateSet(id, exerciseId, setNumber, updates)}
        onDeleteSet={(exerciseId, setNumber) => deleteSet(id, exerciseId, setNumber)}
        onSkipExercise={(exerciseId) => setExerciseSkipped(id, exerciseId, true)}
        onUnskipExercise={(exerciseId) => setExerciseSkipped(id, exerciseId, false)}
        onUpdateExerciseNotes={(exerciseId, notes) => updateExerciseNotes(id, exerciseId, notes)}
        onUpdateExerciseNotesById={(sessionId, exerciseId, notes) =>
          updateExerciseNotes(sessionId, exerciseId, notes)
        }
        onUpdateExercise={(exerciseId, updates) => updateExercise(id, exerciseId, updates)}
        onBack={() => setLocation('/')}
        onDepart={(note) => handleDepart(id, note)}
      />
    );
  }

  // ----- home ------------------------------------------------------------------

  if (initializing && !program) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-600">Loading your program…</p>
        </div>
      </div>
    );
  }

  // No sample fallback (D13): a fresh device either hydrates or fails visibly.
  if (!program) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-md">
          <WifiOff className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Can't reach Point One</h2>
          <p className="text-gray-600 mb-2">
            This device has no cached program and the seam is unreachable.
          </p>
          {fetchError && <p className="text-xs text-gray-400 mb-6 break-words">{fetchError}</p>}
          <Button onClick={handlePullProgram} className="w-full sm:w-auto">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  // In progress / amendable today: local records still open for logging.
  const active = performedRecords.filter(({ session, editable }) => {
    if (!editable) return false;
    const st = statusOf(session.id);
    return st === 'in-progress' || ((st === 'departed' || st === 'delivered') && session.performedDate === todayPT());
  });

  const recent = performedRecords.filter(({ session }) => !active.some((a) => a.session.id === session.id));

  // The queue, next-per-theme first.
  const themes: { theme: string; next: PrescribedSession; later: PrescribedSession[] }[] = [];
  for (const q of queueView) {
    const existing = themes.find((t) => t.theme === q.theme);
    if (existing) existing.later.push(q);
    else themes.push({ theme: q.theme, next: q, later: [] });
  }

  const renderSessionRow = (
    session: PrescribedSession | PerformedSession,
    subtitle: string | null,
    status: SessionStatus
  ) => (
    <div
      key={session.id}
      className="flex items-start justify-between pt-4 pb-4 px-4 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors bg-white border-b-[0.55px] border-solid border-[#0000001a] last:border-b-0"
      onClick={() => setLocation(`/${session.id}`)}
    >
      <div className="flex flex-col items-start gap-1 flex-1">
        <div className="flex items-center justify-between w-full gap-2">
          <h3 className="font-normal text-neutral-950 text-base leading-6">{session.name}</h3>
          {statusBadge(status)}
        </div>
        {subtitle && <p className="font-normal text-[#717182] text-sm leading-5">{subtitle}</p>}
        <span className="font-normal text-[#717182] text-xs leading-4">
          {session.exercises.length} {session.exercises.length === 1 ? 'exercise' : 'exercises'}
        </span>
      </div>
    </div>
  );

  return (
    <div className="bg-white w-full min-h-screen flex flex-col items-center">
      <header className="flex flex-col w-full max-w-2xl items-start pt-4 pb-2 px-4 bg-[#fffffff2] border-b-[0.55px] border-solid border-[#0000001a] sticky top-0 z-10">
        <div className="flex h-9 items-center justify-between w-full">
          <span className="text-xl font-semibold text-gray-900">Lift Lift Resolution</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="w-6 h-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLocation('/how-it-works')}>
                <HelpCircle className="w-4 h-4 mr-2" />
                How it works
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handlePullProgram}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Pull latest program
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleForgetCode}>
                <LogOut className="w-4 h-4 mr-2" />
                Forget access code
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="flex flex-col w-full max-w-2xl items-start pt-6 px-4 pb-8 gap-6">
        {active.length > 0 && (
          <section className="w-full">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Today</h2>
            <Card className="w-full bg-white rounded-[14px] border-[0.55px] border-solid border-[#0000001a]">
              <CardContent className="p-0">
                {active.map(({ session }) =>
                  renderSessionRow(session, formatDay(session.performedDate), statusOf(session.id))
                )}
              </CardContent>
            </Card>
          </section>
        )}

        <section className="w-full">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">On tap</h2>
          {themes.length === 0 ? (
            <p className="text-sm text-gray-500 px-1">
              Nothing queued — Point One is between programs. Check back after its next pass.
            </p>
          ) : (
            <Card className="w-full bg-white rounded-[14px] border-[0.55px] border-solid border-[#0000001a]">
              <CardContent className="p-0">
                {themes.map(({ theme, next, later }) => (
                  <React.Fragment key={theme}>
                    {renderSessionRow(
                      next,
                      [
                        themeLabel(theme),
                        next.plannedDate ? `maybe ${formatDay(next.plannedDate)}` : null,
                        later.length > 0 ? `+${later.length} queued after` : null,
                      ]
                        .filter(Boolean)
                        .join(' · '),
                      'planned'
                    )}
                  </React.Fragment>
                ))}
              </CardContent>
            </Card>
          )}
        </section>

        {recent.length > 0 && (
          <section className="w-full">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Logged</h2>
            <Card className="w-full bg-white rounded-[14px] border-[0.55px] border-solid border-[#0000001a]">
              <CardContent className="p-0">
                {recent.map(({ session }) =>
                  renderSessionRow(session, formatDay(session.performedDate), statusOf(session.id))
                )}
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </div>
  );
};
