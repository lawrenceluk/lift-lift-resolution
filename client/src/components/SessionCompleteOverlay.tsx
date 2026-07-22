import React, { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const VERT_SRC = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

// Celebration field for the departure overlay. Same visual language as the
// SwipeToFinish trail (emerald, shimmer, hash sparkles) but scaled to a full
// screen and slowed way down: a deep emerald ground, three soft aurora
// ribbons undulating across it, faint sparkles drifting upward, a center
// glow behind the checkmark, and a brief swell on entrance.
const FRAG_SRC = `
precision mediump float;
uniform vec2 u_res;
uniform float u_time;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float t = u_time;

  // Deep emerald ground with a soft glow rising behind the center content.
  vec3 deep = vec3(0.008, 0.090, 0.062);
  vec3 mid  = vec3(0.024, 0.240, 0.168);
  float glow = 1.0 - length((uv - vec2(0.5, 0.55)) * vec2(1.15, 1.55));
  vec3 col = mix(deep, mid, clamp(glow, 0.0, 1.0));

  // Aurora ribbons: three soft horizontal bands, each undulating on two
  // frequencies with a slowly breathing width and a shimmer along its length.
  vec3 ribbonCol = mix(vec3(0.063, 0.725, 0.506), vec3(0.176, 0.831, 0.749), uv.x);
  float ribbons = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float yc = 0.24 + 0.24 * fi
             + 0.050 * sin(uv.x * (2.0 + fi) + t * (0.22 + 0.07 * fi) + fi * 2.4)
             + 0.028 * sin(uv.x * 5.0 - t * 0.35 + fi * 1.7);
    float d = uv.y - yc;
    float band = exp(-d * d * (150.0 - 45.0 * sin(t * 0.3 + fi * 2.1)));
    float shimmer = 0.55 + 0.45 * sin(uv.x * 3.0 + t * 0.5 + fi * 2.0);
    ribbons += band * shimmer * (0.34 - 0.07 * fi);
  }
  col += ribbons * ribbonCol * 0.55;

  // Sparse sparkles drifting upward — closer to embers than confetti.
  vec2 p = gl_FragCoord.xy;
  p.y -= t * 26.0;
  vec2 cell = floor(p / 4.0);
  float seed = hash(cell);
  float tw = smoothstep(0.9965, 1.0, fract(seed + t * (0.08 + seed * 0.35)));
  col += tw * vec3(0.70, 1.00, 0.85) * 0.45;

  // Vignette, then a gentle swell in the first moments.
  float vig = smoothstep(1.25, 0.4, length(uv - 0.5) * 1.4);
  col *= mix(0.72, 1.0, vig);
  col *= 1.0 + 0.22 * exp(-t * 2.2);

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
      console.warn('SessionCompleteOverlay shader compile failed:', gl.getShaderInfoLog(shader));
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
    console.warn('SessionCompleteOverlay shader link failed:', gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}

/**
 * Full-screen shader canvas. When WebGL is unavailable or the user prefers
 * reduced motion, it renders nothing and the static CSS gradient behind it
 * carries the overlay.
 */
const CelebrationField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const gl = canvas.getContext('webgl', { antialias: false, depth: false, stencil: false });
    if (!gl) return;
    const program = compileProgram(gl);
    if (!program) return;

    gl.useProgram(program);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, 'u_res');
    const uTime = gl.getUniformLocation(program, 'u_time');

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = () => {
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    size();
    window.addEventListener('resize', size);

    const start = performance.now();
    let raf = 0;
    const draw = (now: number) => {
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', size);
      cancelAnimationFrame(raf);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />;
};

/**
 * Departure celebration (D6). Covers the seal-and-deliver beat that used to
 * play out as dead time on the session screen: it appears the moment the
 * swipe lands, holds while delivery runs behind it, and fades out over the
 * home screen. Mount/unmount it inside an AnimatePresence.
 */
export const SessionCompleteOverlay: React.FC = () => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.45, ease: 'easeIn' } }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950"
    >
      <CelebrationField />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-8">
        <svg viewBox="0 0 52 52" className="h-16 w-16" aria-hidden>
          <motion.circle
            cx="26"
            cy="26"
            r="24"
            fill="none"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="2"
            initial={{ pathLength: reduceMotion ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }}
          />
          <motion.path
            d="M15.5 27l7.5 7.5L36.5 20"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: reduceMotion ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.55 }}
          />
        </svg>
        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.7 }}
          className="text-xl font-medium text-white [text-shadow:0_1px_6px_rgba(2,44,34,0.6)]"
        >
          Done for today
        </motion.p>
      </div>
    </motion.div>
  );
};
