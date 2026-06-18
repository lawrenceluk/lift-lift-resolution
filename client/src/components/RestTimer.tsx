import React, { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';

interface RestTimerProps {
  /** ISO timestamp of the last finished set — the count-up origin. */
  since: string;
  /** Target rest for this exercise; drives a subtle "ready" cue only. */
  targetSeconds?: number;
}

const formatRest = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

/**
 * An unobtrusive count-up resting clock. Ticks every second from the moment
 * the last set was finished, and tints green once the prescribed rest has
 * elapsed so you know you're good to go.
 */
export const RestTimer: React.FC<RestTimerProps> = ({ since, targetSeconds }) => {
  const sinceMs = new Date(since).getTime();
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - sinceMs) / 1000))
  );

  useEffect(() => {
    const tick = () =>
      setElapsed(Math.max(0, Math.floor((Date.now() - sinceMs) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sinceMs]);

  if (!Number.isFinite(sinceMs)) return null;

  const ready = targetSeconds ? elapsed >= targetSeconds : false;

  return (
    <div
      className={`flex items-center gap-1 text-xs font-mono tabular-nums transition-colors ${
        ready ? 'text-emerald-600' : 'text-gray-400'
      }`}
      title={ready ? 'Rest target reached' : 'Resting since your last set'}
    >
      <Timer className="w-3.5 h-3.5" />
      <span>{formatRest(elapsed)}</span>
    </div>
  );
};
