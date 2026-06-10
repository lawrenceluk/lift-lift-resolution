import React from 'react';
import {
  HelpCircle,
  Search,
  Menu,
  RefreshCw,
  LogOut,
  WifiOff,
  CheckCheck,
  CheckCircle2,
  UploadCloud,
  PlayCircle,
  CircleDashed,
  X,
} from 'lucide-react';
import { useLocation, useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWorkoutProgramContext } from '@/contexts/WorkoutProgramContext';
import { useSecretGate } from '@/components/SecretGate';
import { SessionView } from '@/components/SessionView';
import { useToast } from '@/hooks/use-toast';
import { PrescribedSession, PerformedSession, SessionStatus } from '@/types/workout';
import { todayPT, ptDate } from '@/utils/timeHelpers';

/** The state ladder (D16): planned · in progress · logged (saved/delivered) · ingested. */
const StatusIcon = ({ status }: { status: SessionStatus }) => {
  switch (status) {
    case 'ingested':
      return <CheckCheck className="w-5 h-5 text-blue-600" />;
    case 'delivered':
      return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    case 'departed':
      return <UploadCloud className="w-5 h-5 text-amber-500" />;
    case 'in-progress':
      return <PlayCircle className="w-5 h-5 text-orange-500" />;
    case 'planned':
      return <CircleDashed className="w-5 h-5 text-gray-400" />;
  }
};

const statusText = (status: SessionStatus): string | null => {
  switch (status) {
    case 'ingested':
      return 'Ingested ✓';
    case 'delivered':
      return 'Delivered ✓';
    case 'departed':
      return 'Saved on device';
    case 'in-progress':
      return 'In progress';
    case 'planned':
      return null;
  }
};

/** 'today' / 'yesterday' / 'Sat' for a YYYY-MM-DD calendar date. */
const dayWord = (dateStr: string, weekday: 'short' | 'long' = 'short'): string => {
  const today = todayPT();
  if (dateStr === today) return 'today';
  const noon = new Date(`${dateStr}T12:00:00`);
  const dayMs = 24 * 60 * 60 * 1000;
  if (dateStr === ptDate(new Date(new Date(`${today}T12:00:00`).getTime() - dayMs))) return 'yesterday';
  const diff = new Date(`${today}T12:00:00`).getTime() - noon.getTime();
  if (Math.abs(diff) < 7 * dayMs) {
    return noon.toLocaleDateString('en-US', { weekday });
  }
  return noon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/** "today's" / "yesterday's" / "Monday's" / "your Jun 3" — for prose like "<X> workout". */
const dayPossessive = (dateStr: string): string => {
  const word = dayWord(dateStr, 'long');
  return word === 'today' || word === 'yesterday' || /^[A-Z][a-z]+day$/.test(word)
    ? `${word}'s`
    : `your ${word}`;
};

const themeLabel = (theme: string) =>
  theme ? theme.charAt(0).toUpperCase() + theme.slice(1) : 'Session';

export const WorkoutTrackerApp = (): JSX.Element => {
  const {
    initializing,
    fetchError,
    program,
    lastFetchedAt,
    lastSeenGeneration,
    markGenerationSeen,
    queueView,
    performedRecords,
    getSession,
    statusOf,
    hasUndelivered,
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

  const handleSignOut = () => {
    const ok = window.confirm(
      'Sign out on this device? You will need the access code to get back in.'
    );
    if (ok) forgetCode();
  };

  const handleDepart = async (sessionId: string, note?: string) => {
    const { delivered } = await departSession(sessionId, note);
    setLocation('/');
    if (delivered) {
      // Honest tempo (D12): delivery is real, the brain's reply is async.
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
    const editable = status !== 'ingested' && (!sealed || performedDate === todayPT());

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

  // Freshness (D12): one line, always true, plain words. Quiet is the success
  // state — delivery status appears only when something is actually pending
  // (steady-state "all delivered" is noise; Lawrence's review 2026-06-10).
  const freshnessLine = (() => {
    if (fetchError) {
      const asOf = lastFetchedAt ? dayWord(ptDate(new Date(lastFetchedAt))) : 'an earlier visit';
      return `offline — program as of ${asOf}`;
    }
    const lastBasedOn = program.basedOn[program.basedOn.length - 1];
    const basedDate = lastBasedOn?.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    let line = `Updated ${dayWord(ptDate(new Date(program.generatedAt)))}`;
    if (basedDate) line += ` from ${dayPossessive(basedDate)} workout`;
    if (hasUndelivered) line += ' · a workout is waiting to send';
    return line;
  })();

  // "While you were away" (D3/D5): only when the generation moved under us.
  const showWhileAway =
    lastSeenGeneration !== null && program.generation > lastSeenGeneration;

  // Today / amendable: device-truth records still open for logging today.
  const active = performedRecords.filter(({ session, editable }) => {
    if (!editable) return false;
    const st = statusOf(session.id);
    return (
      st === 'in-progress' ||
      ((st === 'departed' || st === 'delivered') && session.performedDate === todayPT())
    );
  });

  const past = performedRecords.filter(
    ({ session }) => !active.some((a) => a.session.id === session.id)
  );

  // The upcoming lane: next session per theme (the queue is the structure,
  // plannedDate is decoration on it — D15).
  const themes: { theme: string; next: PrescribedSession; later: PrescribedSession[] }[] = [];
  for (const q of queueView) {
    const existing = themes.find((t) => t.theme === q.theme);
    if (existing) existing.later.push(q);
    else themes.push({ theme: q.theme, next: q, later: [] });
  }

  const timelineRow = (
    session: PrescribedSession | PerformedSession,
    status: SessionStatus,
    subtitle: string | null,
    isLast: boolean
  ) => (
    <div
      key={session.id}
      className="relative flex gap-3 cursor-pointer group"
      onClick={() => setLocation(`/${session.id}`)}
    >
      <div className="flex flex-col items-center">
        <div className="pt-0.5 bg-white z-10">
          <StatusIcon status={status} />
        </div>
        {!isLast && <div className="w-px flex-1 bg-gray-200" />}
      </div>
      <div className="flex-1 pb-5 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-medium text-neutral-950 text-base leading-6 truncate group-hover:underline">
            {session.name}
          </h3>
          {statusText(status) && (
            <span className="text-xs text-gray-500 whitespace-nowrap">{statusText(status)}</span>
          )}
        </div>
        {subtitle && <p className="text-sm text-[#717182] leading-5">{subtitle}</p>}
      </div>
    </div>
  );

  const upcomingRows = themes.map(({ theme, next }, i) =>
    timelineRow(
      next,
      'planned',
      [themeLabel(theme), next.plannedDate ? `maybe ${dayWord(next.plannedDate)}` : null]
        .filter(Boolean)
        .join(' · '),
      i === themes.length - 1 && active.length === 0 && past.length === 0
    )
  );

  const activeRows = active.map(({ session }, i) =>
    timelineRow(
      session,
      statusOf(session.id),
      dayWord(session.performedDate),
      i === active.length - 1 && past.length === 0
    )
  );

  const pastRows = past.map(({ session }, i) =>
    timelineRow(session, statusOf(session.id), dayWord(session.performedDate), i === past.length - 1)
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
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-gray-400">Debug</DropdownMenuLabel>
              <DropdownMenuItem onClick={handlePullProgram}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Pull program now
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="text-xs text-[#717182] pb-1">{freshnessLine}</p>
      </header>

      <main className="flex flex-col w-full max-w-2xl items-start pt-5 px-4 pb-8 gap-5">
        {showWhileAway && (
          <Card className="w-full bg-blue-50 border-blue-200 rounded-[14px]">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-blue-900 mb-1">While you were away</h2>
                  <p className="text-sm text-blue-900">{program.changelog}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-blue-400 hover:text-blue-600 flex-shrink-0"
                  onClick={markGenerationSeen}
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <section className="w-full">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Up next
          </h2>
          {themes.length === 0 ? (
            <p className="text-sm text-gray-500">
              Nothing queued — Point One is between programs. Check back after its next pass.
            </p>
          ) : (
            <div>{upcomingRows}</div>
          )}
        </section>

        {(active.length > 0 || past.length > 0) && (
          <section className="w-full">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Logged
            </h2>
            <div>
              {activeRows}
              {pastRows}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
