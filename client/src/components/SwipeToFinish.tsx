import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate, motion, MotionValue, useMotionValue, useTransform } from 'framer-motion';
import { Check, ChevronsRight, Send } from 'lucide-react';

// Track is h-14 (56px) with a 1px border; the 48px thumb sits 4px from every
// outer edge. Horizontal offsets are measured from the padding box (inside
// the border), hence 3px there.
const THUMB = 48;
const INSET = 3;

const VERT_SRC = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

// Emerald trail shader. u_progress (0..1, how far the swipe has gone) drives
// "energy" quadratically: shimmer bands run faster and brighter, the whole
// fill breathes harder, and sparkles wake up as the thumb nears the end.
// u_flash is a short burst layered on top at the moment of completion.
const FRAG_SRC = `
precision mediump float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_progress;
uniform float u_flash;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec3 emeraldA = vec3(0.204, 0.827, 0.600); // emerald-400
  vec3 emeraldB = vec3(0.063, 0.725, 0.506); // emerald-500
  vec3 col = mix(emeraldA, emeraldB, uv.x);

  float energy = clamp(u_progress, 0.0, 1.0);
  energy *= energy;

  // Broad diagonal shimmer bands sweeping right, faster with energy.
  float band = sin((uv.x * 6.0 - uv.y * 1.5) * 3.14159 - u_time * (1.5 + 7.0 * energy));
  col += smoothstep(0.72, 1.0, band) * (0.03 + 0.13 * energy);

  // Tighter counter-shimmer for depth once things get going.
  float band2 = sin((uv.x * 18.0 + uv.y * 5.0) - u_time * (3.0 + 12.0 * energy) + 1.7);
  col += smoothstep(0.85, 1.0, band2) * 0.09 * energy;

  // Whole-fill pulse that breathes faster and deeper with energy.
  float pulse = 0.5 + 0.5 * sin(u_time * (2.0 + 9.0 * energy));
  col *= 1.0 + pulse * 0.09 * energy;

  // Twinkling sparkles, denser as energy rises.
  vec2 cell = floor(gl_FragCoord.xy / 3.0);
  float seed = hash(cell);
  float twinkle = step(0.996 - 0.006 * energy, fract(seed + u_time * (0.15 + seed * 0.5)));
  col += twinkle * energy * 0.35;

  // Completion burst.
  col += u_flash * 0.18;

  gl_FragColor = vec4(col, 1.0);
}
`;

function compileProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const make = (type: number, src: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn('SwipeToFinish shader compile failed:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };
  const vert = make(gl.VERTEX_SHADER, VERT_SRC);
  const frag = make(gl.FRAGMENT_SHADER, FRAG_SRC);
  if (!vert || !frag) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('SwipeToFinish shader link failed:', gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}

/**
 * WebGL layer over the trail. Sized to the full track and clipped by the
 * fill's animated width, so the shader field is stable while the reveal
 * grows. Renders nothing (leaving the CSS gradient underneath) when WebGL
 * is unavailable or the user prefers reduced motion. The rAF loop only runs
 * while the trail is actually visible.
 */
const ShaderTrail: React.FC<{
  x: MotionValue<number>;
  maxDrag: number;
  trackWidth: number;
  trackHeight: number;
  completed: boolean;
}> = ({ x, maxDrag, trackWidth, trackHeight, completed }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const completedRef = useRef(completed);
  const flashAtRef = useRef<number | null>(null);
  if (completed && !completedRef.current) {
    flashAtRef.current = performance.now();
  }
  completedRef.current = completed;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || trackWidth <= 0 || maxDrag <= 0) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const gl = canvas.getContext('webgl', { antialias: false, depth: false, stencil: false });
    if (!gl) return;
    const program = compileProgram(gl);
    if (!program) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(trackWidth * dpr);
    canvas.height = Math.round(trackHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.useProgram(program);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, 'u_res');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uProgress = gl.getUniformLocation(program, 'u_progress');
    const uFlash = gl.getUniformLocation(program, 'u_flash');
    gl.uniform2f(uRes, canvas.width, canvas.height);

    const start = performance.now();
    let raf = 0;
    let running = false;

    const draw = (now: number) => {
      const progress = completedRef.current ? 1 : Math.min(x.get() / maxDrag, 1);
      const flashAt = flashAtRef.current;
      const flash = flashAt !== null ? Math.max(0, 1 - (now - flashAt) / 450) : 0;
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform1f(uProgress, progress);
      gl.uniform1f(uFlash, flash);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (progress > 0.002 || completedRef.current) {
        raf = requestAnimationFrame(draw);
      } else {
        running = false;
      }
    };
    const ensureRunning = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(draw);
      }
    };
    const unsubscribe = x.on('change', ensureRunning);
    ensureRunning();

    return () => {
      unsubscribe();
      cancelAnimationFrame(raf);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [x, maxDrag, trackWidth, trackHeight]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute left-0 top-0 h-full"
      style={{ width: trackWidth }}
    />
  );
};

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
  const [trackSize, setTrackSize] = useState({ width: 0, height: 0 });
  const [completed, setCompleted] = useState(false);
  const x = useMotionValue(0);

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => {
      setMaxDrag(Math.max(el.clientWidth - THUMB - INSET * 2, 0));
      setTrackSize({ width: el.clientWidth, height: el.clientHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The trail hugs the thumb; it fades in over the first half of the pull so
  // the resting state stays quiet.
  const fillWidth = useTransform(x, (v) => v + THUMB + INSET);
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
        className="absolute inset-y-0 left-0 rounded-full overflow-hidden bg-gradient-to-r from-emerald-400 to-emerald-500"
        style={{ width: completed ? '100%' : fillWidth, opacity: completed ? 1 : fillOpacity }}
      >
        <ShaderTrail
          x={x}
          maxDrag={maxDrag}
          trackWidth={trackSize.width}
          trackHeight={trackSize.height}
          completed={completed}
        />
      </motion.div>

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
          className="absolute inset-0 flex items-center justify-center pr-12 text-[15px] font-medium text-white [text-shadow:0_1px_3px_rgba(4,120,87,0.55)]"
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
        style={{ x, top: '50%', y: '-50%', touchAction: 'none' }}
        className="absolute left-[3px] h-12 w-12 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing"
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
