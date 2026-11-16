import React, { useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  dataSaverMode?: boolean;
}

// 7 vivid required colours: Orange, Gold, Red, Pink, Purple, Cyan, Green
const FIREBALL_PALETTE: { name: string; rgb: [number, number, number] }[] = [
  { name: 'orange', rgb: [249, 115, 22] },
  { name: 'gold', rgb: [250, 204, 21] },
  { name: 'red', rgb: [239, 68, 68] },
  { name: 'pink', rgb: [236, 72, 153] },
  { name: 'purple', rgb: [168, 85, 247] },
  { name: 'cyan', rgb: [6, 182, 212] },
  { name: 'green', rgb: [16, 185, 129] },
];

interface Particle3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  baseRadius: number;
  colorIndex: number;
  phase: number;
  isFireball: boolean;
}

function createParticlePool(isLiteDevice: boolean): Particle3D[] {
  const fireballs = isLiteDevice ? 14 : 22;
  const sparks = isLiteDevice ? 26 : 44;
  const total = fireballs + sparks;
  const list: Particle3D[] = [];
  for (let i = 0; i < total; i++) {
    const isFireball = i < fireballs;
    list.push({
      x: (Math.random() - 0.5) * 1600,
      y: (Math.random() - 0.5) * 1000,
      z: Math.random() * 900 + 120,
      vx: (Math.random() - 0.5) * (isFireball ? 0.35 : 0.45),
      vy: (Math.random() - 0.5) * (isFireball ? 0.3 : 0.4) - (isFireball ? 0.08 : 0.14),
      vz: (Math.random() - 0.5) * 0.45,
      baseRadius: isFireball ? 14 + Math.random() * 26 : 2.2 + Math.random() * 4.2,
      colorIndex: i % FIREBALL_PALETTE.length,
      phase: Math.random() * Math.PI * 2,
      isFireball,
    });
  }
  return list;
}

export const AnimatedBackground3D: React.FC<Props> = ({ dataSaverMode = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { isDark, animatedBgEnabled } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !animatedBgEnabled) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const deviceMem = (navigator as any).deviceMemory || 4;
    const isLiteDevice = dataSaverMode || deviceMem <= 4 || window.innerWidth < 768;
    const dpr = Math.min(window.devicePixelRatio || 1, isLiteDevice ? 1.25 : 1.75);

    const particles = createParticlePool(isLiteDevice);

    // Attempt lightweight WebGL point-sprite renderer first; cleanly fall back to 2D Canvas 3D-projection if unavailable
    let gl: WebGLRenderingContext | null = null;
    try {
      gl = canvas.getContext('webgl', {
        alpha: true,
        antialias: false,
        depth: false,
        powerPreference: 'low-power',
      });
    } catch {
      gl = null;
    }

    let rafId = 0;
    let isHidden = document.visibilityState === 'hidden';

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();

    // Shared 3D orbital physics step (moderate rotation + gentle upward drift + depth wrap)
    let angle = 0;
    const stepPhysics = (dtFactor: number) => {
      angle += 0.00055 * dtFactor;
      const cosA = Math.cos(angle * 0.15);
      const sinA = Math.sin(angle * 0.15);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx * dtFactor;
        p.y += p.vy * dtFactor;
        p.z += p.vz * dtFactor;
        p.phase += 0.02 * dtFactor;

        // Subtle 3D orbital swirl
        const rx = p.x * cosA - (p.z - 550) * sinA * 0.002;
        p.x = rx;

        if (p.x < -900) p.x = 900;
        if (p.x > 900) p.x = -900;
        if (p.y < -600) p.y = 600;
        if (p.y > 600) p.y = -600;
        if (p.z < 120) p.z = 1020;
        if (p.z > 1020) p.z = 120;
      }
    };

    // --- WEBGL PATH ---
    let glState: {
      program: WebGLProgram;
      posBuf: WebGLBuffer;
      colBuf: WebGLBuffer;
      sizeBuf: WebGLBuffer;
      aPos: number;
      aColor: number;
      aSize: number;
      positions: Float32Array;
      colors: Float32Array;
      sizes: Float32Array;
    } | null = null;

    if (gl) {
      const vsSource = `
        attribute vec2 aPos;
        attribute vec4 aColor;
        attribute float aSize;
        varying vec4 vColor;
        void main() {
          gl_Position = vec4(aPos, 0.0, 1.0);
          gl_PointSize = aSize;
          vColor = aColor;
        }
      `;
      const fsSource = `
        precision mediump float;
        varying vec4 vColor;
        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float d = length(c) * 2.0;
          if (d > 1.0) discard;
          float core = exp(-d * d * 7.5);
          float halo = pow(max(0.0, 1.0 - d), 2.4) * 0.65;
          float alpha = (core + halo) * vColor.a;
          vec3 hotCore = mix(vColor.rgb, vec3(1.0, 0.98, 0.92), core * 0.72);
          gl_FragColor = vec4(hotCore, alpha);
        }
      `;
      const compile = (type: number, src: string) => {
        const s = gl!.createShader(type);
        if (!s) return null;
        gl!.shaderSource(s, src);
        gl!.compileShader(s);
        if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
          gl!.deleteShader(s);
          return null;
        }
        return s;
      };
      const vs = compile(gl.VERTEX_SHADER, vsSource);
      const fs = compile(gl.FRAGMENT_SHADER, fsSource);
      const program = vs && fs ? gl.createProgram() : null;
      if (program && vs && fs) {
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
          const posBuf = gl.createBuffer()!;
          const colBuf = gl.createBuffer()!;
          const sizeBuf = gl.createBuffer()!;
          gl.useProgram(program);
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, isDark ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
          glState = {
            program,
            posBuf,
            colBuf,
            sizeBuf,
            aPos: gl.getAttribLocation(program, 'aPos'),
            aColor: gl.getAttribLocation(program, 'aColor'),
            aSize: gl.getAttribLocation(program, 'aSize'),
            positions: new Float32Array(particles.length * 2),
            colors: new Float32Array(particles.length * 4),
            sizes: new Float32Array(particles.length),
          };
        }
      }
    }

    // --- 2D CANVAS FALLBACK PATH ---
    const ctx2d = !glState ? canvas.getContext('2d') : null;

    const drawFrame = () => {
      const w = canvas.width;
      const h = canvas.height;
      const cssW = w / dpr;
      const cssH = h / dpr;
      const focal = 480;

      // Sort back-to-front by z so closer fireballs naturally layer in front
      const sorted = [...particles].sort((a, b) => b.z - a.z);

      if (gl && glState) {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        for (let i = 0; i < sorted.length; i++) {
          const p = sorted[i];
          const scale = focal / (focal + p.z);
          const sx = (p.x * scale) / (cssW * 0.5);
          const sy = (-p.y * scale) / (cssH * 0.5);
          const pulse = 1 + Math.sin(p.phase) * 0.12;
          const sizePx = Math.min(120 * dpr, Math.max(3, p.baseRadius * 2.2 * scale * pulse * dpr));

          const [r, g, b] = FIREBALL_PALETTE[p.colorIndex].rgb;
          const depthAlpha = Math.max(0.12, Math.min(0.85, 1.05 - p.z / 1100));
          const baseOpacity = isDark ? (p.isFireball ? 0.42 : 0.52) : p.isFireball ? 0.24 : 0.34;

          glState.positions[i * 2] = sx;
          glState.positions[i * 2 + 1] = sy;
          glState.sizes[i] = sizePx;
          glState.colors[i * 4] = r / 255;
          glState.colors[i * 4 + 1] = g / 255;
          glState.colors[i * 4 + 2] = b / 255;
          glState.colors[i * 4 + 3] = depthAlpha * baseOpacity;
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, glState.posBuf);
        gl.bufferData(gl.ARRAY_BUFFER, glState.positions, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(glState.aPos);
        gl.vertexAttribPointer(glState.aPos, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, glState.colBuf);
        gl.bufferData(gl.ARRAY_BUFFER, glState.colors, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(glState.aColor);
        gl.vertexAttribPointer(glState.aColor, 4, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, glState.sizeBuf);
        gl.bufferData(gl.ARRAY_BUFFER, glState.sizes, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(glState.aSize);
        gl.vertexAttribPointer(glState.aSize, 1, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.POINTS, 0, sorted.length);
        return;
      }

      if (ctx2d) {
        ctx2d.clearRect(0, 0, w, h);
        ctx2d.save();
        ctx2d.scale(dpr, dpr);
        const cx = cssW / 2;
        const cy = cssH / 2;

        for (let i = 0; i < sorted.length; i++) {
          const p = sorted[i];
          const scale = focal / (focal + p.z);
          const x = cx + p.x * scale;
          const y = cy + p.y * scale;
          const pulse = 1 + Math.sin(p.phase) * 0.12;
          const radius = p.baseRadius * scale * pulse;
          if (x + radius < 0 || x - radius > cssW || y + radius < 0 || y - radius > cssH) continue;

          const [r, g, b] = FIREBALL_PALETTE[p.colorIndex].rgb;
          const depthAlpha = Math.max(0.15, Math.min(0.85, 1.05 - p.z / 1100));
          const alpha = depthAlpha * (isDark ? (p.isFireball ? 0.36 : 0.48) : p.isFireball ? 0.2 : 0.3);

          const grad = ctx2d.createRadialGradient(x, y, 0, x, y, radius);
          grad.addColorStop(0, `rgba(255, 250, 235, ${Math.min(0.9, alpha * 1.45)})`);
          grad.addColorStop(0.28, `rgba(${r}, ${g}, ${b}, ${alpha})`);
          grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

          ctx2d.fillStyle = grad;
          ctx2d.beginPath();
          ctx2d.arc(x, y, radius, 0, Math.PI * 2);
          ctx2d.fill();
        }
        ctx2d.restore();
      }
    };

    let lastTime = performance.now();
    const loop = (now: number) => {
      if (isHidden) return;
      const elapsed = Math.min(50, Math.max(8, now - lastTime));
      lastTime = now;
      stepPhysics(elapsed / 16.67);
      drawFrame();
      rafId = requestAnimationFrame(loop);
    };

    const handleVisibility = () => {
      isHidden = document.visibilityState === 'hidden';
      if (isHidden) {
        cancelAnimationFrame(rafId);
      } else if (!prefersReducedMotion) {
        lastTime = performance.now();
        rafId = requestAnimationFrame(loop);
      }
    };

    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', handleVisibility);

    // Draw initial frame immediately; animate only if not reduced motion & page visible
    drawFrame();
    if (!prefersReducedMotion && !isHidden) {
      rafId = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (gl && glState) {
        gl.deleteBuffer(glState.posBuf);
        gl.deleteBuffer(glState.colBuf);
        gl.deleteBuffer(glState.sizeBuf);
        gl.deleteProgram(glState.program);
      }
    };
  }, [isDark, animatedBgEnabled, dataSaverMode]);

  if (!animatedBgEnabled) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none select-none print:hidden"
    />
  );
};
