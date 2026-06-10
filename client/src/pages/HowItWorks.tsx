import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/**
 * The mental model, in the app's own words: this is the gym surface of Point
 * One. The program arrives from your trainer (the brain); what you log goes
 * back to it. See POINT-ONE.md §The seam contract for the wiring.
 */
export const HowItWorks = (): JSX.Element => {
  const [, setLocation] = useLocation();

  return (
    <div className="bg-white w-full min-h-screen flex flex-col items-center">
      <header className="flex w-full max-w-2xl items-center gap-3 pt-4 pb-2 px-4 border-b-[0.55px] border-solid border-[#0000001a] sticky top-0 bg-white z-10">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setLocation('/')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <span className="text-xl font-semibold text-gray-900">How it works</span>
      </header>

      <main className="flex flex-col w-full max-w-2xl pt-6 px-4 pb-12 gap-4">
        <Card>
          <CardContent className="pt-6 space-y-3">
            <h2 className="font-semibold text-gray-900">Your program is on tap</h2>
            <p className="text-sm text-gray-700">
              Point One keeps a progressing training block ready, organized by theme (lower, upper,
              cardio). There's no weekly schedule to fall behind on — when you decide to train, pick
              the theme and the next session is ready, pre-filled with what you lifted last time.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <h2 className="font-semibold text-gray-900">Log what happens, not what was planned</h2>
            <p className="text-sm text-gray-700">
              Fill in sets as you go. Skip an exercise with one tap, modify anything, stop whenever —
              what you log is the record, and unlogged sets simply read as not done. When you're
              finished, hit <strong>Done for today</strong> and optionally tell your trainer how it
              went. No per-set bookkeeping at the end.
            </p>
            <p className="text-sm text-gray-700">
              Forget to tap it? The session seals itself at the end of the day and sends on your
              next open. Same-day edits just update the same record.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <h2 className="font-semibold text-gray-900">Saved → Delivered → Ingested</h2>
            <p className="text-sm text-gray-700">
              A finished session is <strong>saved</strong> on this device, <strong>delivered</strong>{' '}
              to Point One the moment it can reach it, and marked <strong>ingested ✓</strong> once
              the brain has read it and built your next program off it. Point One is async — it
              replies with a new program on its next pass, with a note about what changed and why.
            </p>
            <p className="text-sm text-gray-700">
              Corrections after the day has passed go through the Point One chat ("actually that was
              105, not 100") — the fix flows back here on its own.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};
