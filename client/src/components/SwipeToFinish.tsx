import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { Check, ChevronsRight, Send } from 'lucide-react';

// Track is h-14 (56px); thumb + 4px inset on each side fills it exactly.
const THUMB = 48;
const PAD = 4;

interface SwipeToFinishProps {
  /** Fires once, after the thumb settles at the end of the track. */
  onComplete: () => void;
  label?: string;
}

/**
 * Slide-to-act control for sealing the session (D6 departure). Deliberately
 * unlike the solid "Finish Set" buttons: a light pill track with a draggable
 * thumb, an emerald trail that grows behind it, and a settle-then-deliver
 * beat at the end. The drag distance is the confirmation — no dialog.
 */
export const SwipeToFinish: React.FC<SwipeToFinishProps> = ({
  onComplete,
  label = 'Swipe to finish',
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [maxDrag, setMaxDrag] = useState(0);
  const [completed, setCompleted] = useState(false);
  const x = useMotionValue(0);

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => setMaxDrag(Math.max(el.clientWidth - THUMB - PAD * 2, 0));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The trail hugs the thumb; it fades in over the first half of the pull so
  // the resting state stays quiet.
  const fillWidth = useTransform(x, (v) => v + THUMB + PAD);
  const fillOpacity = useTransform(x, [0, Math.max(maxDrag * 0.5, 1)], [0, 1]);
  const labelOpacity = useTransform(x, [0, Math.max(maxDrag * 0.6, 1)], [1, 0]);

  const finish = useCallback(() => {
    setCompleted((was) => {
      if (was) return was;
      animate(x, Math.max(maxDrag, 0), { type: 'spring', stiffness: 400, damping: 40 });
      navigator.vibrate?.(30);
      // Let the checkmark land before the view moves on.
      window.setTimeout(onComplete, 550);
      return true;
    });
  }, [maxDrag, onComplete, x]);

  const handleDragEnd = () => {
    if (maxDrag > 0 && x.get() >= maxDrag * 0.85) {
      finish();
    } else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
    }
  };

  return (
    <div
      ref={trackRef}
      role="button"
      tabIndex={0}
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          finish();
        }
      }}
      className="relative w-full h-14 rounded-full bg-gray-100 border border-gray-200 overflow-hidden select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
    >
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
        style={{ width: fillWidth, opacity: completed ? 1 : fillOpacity }}
      />

      <motion.span
        className="absolute inset-0 flex items-center justify-center gap-1.5 text-[15px] font-medium text-gray-500"
        style={{ opacity: labelOpacity }}
      >
        <motion.span
          animate={{ x: [0, 4, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          className="text-gray-400"
        >
          <ChevronsRight className="w-4 h-4" />
        </motion.span>
        {label}
      </motion.span>

      {completed && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center pr-12 text-[15px] font-medium text-white"
        >
          Done for today
        </motion.span>
      )}

      <motion.div
        drag={completed ? false : 'x'}
        dragConstraints={{ left: 0, right: maxDrag }}
        dragElastic={0}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{ x, touchAction: 'none' }}
        className="absolute top-1 left-1 h-12 w-12 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        {completed ? (
          <motion.span
            initial={{ scale: 0.5 }}
            animate={{ scale: [0.5, 1.15, 1] }}
            transition={{ duration: 0.25 }}
          >
            <Check className="w-5 h-5 text-emerald-600" />
          </motion.span>
        ) : (
          <Send className="w-5 h-5 text-gray-700" />
        )}
      </motion.div>
    </div>
  );
};
