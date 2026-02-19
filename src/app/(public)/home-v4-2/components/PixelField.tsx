"use client";

import { useEffect, useRef } from "react";
import styles from "../HomeV42.module.css";

type Pixel = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
};

const PIXEL_COUNT = 200;

function buildPixels(width: number, height: number): Pixel[] {
  return Array.from({ length: PIXEL_COUNT }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.7,
    vy: (Math.random() - 0.5) * 0.7,
    size: 1 + Math.random() * 3,
    phase: Math.random() * Math.PI * 2,
  }));
}

export default function PixelField({ activeScene }: { activeScene: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pixelsRef = useRef<Pixel[]>([]);
  const sceneRef = useRef(activeScene);
  sceneRef.current = activeScene;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * ratio);
      canvas.height = Math.floor(h * ratio);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      pixelsRef.current = buildPixels(w, h);
    };

    resize();
    window.addEventListener("resize", resize);

    const render = (t: number) => {
      const time = t * 0.001;
      ctx.clearRect(0, 0, w, h);

      const cx = w * 0.58;
      const cy = h * 0.52;
      const pixels = pixelsRef.current;

      const scene = sceneRef.current;

      for (let i = 0; i < pixels.length; i += 1) {
        const p = pixels[i];
        p.phase += 0.011;

        let tx = p.x + p.vx;
        let ty = p.y + p.vy;

        if (scene === 0) {
          tx += Math.sin(time + p.phase) * 0.55;
          ty += Math.cos(time * 0.8 + p.phase) * 0.45;
        } else if (scene === 1) {
          const lane = i % 2 === 0 ? -1 : 1;
          tx += lane * 1.1;
          ty += Math.sin(time * 2.1 + i * 0.03) * 0.4;
        } else if (scene === 2) {
          tx += Math.cos(time * 2 + i * 0.07) * 1.1;
          ty += Math.sin(time * 1.2 + i * 0.05) * 0.8;
        } else if (scene === 3) {
          const ring = 70 + (i % 80) * 2;
          tx += (cx + Math.cos(time + i * 0.14) * ring - p.x) * 0.03;
          ty += (cy + Math.sin(time * 1.5 + i * 0.14) * ring * 0.4 - p.y) * 0.03;
        } else if (scene === 4) {
          // Horizontal structured flow for operating modes
          tx += Math.cos(time * 0.8 + i * 0.04) * 1.4;
          ty += (cy + Math.sin(i * 0.15) * h * 0.35 - p.y) * 0.02;
        } else if (scene === 5) {
          // Expanding web for understanding stack
          const angle = (i / pixels.length) * Math.PI * 2 + time * 0.3;
          const radius = 60 + (i % 60) * 3;
          tx += (cx + Math.cos(angle) * radius - p.x) * 0.02;
          ty += (cy + Math.sin(angle) * radius * 0.6 - p.y) * 0.02;
        } else if (scene === 6) {
          // Grid settle for use cases
          const col = i % 9;
          const row = Math.floor(i / 9) % 6;
          const gx = w * 0.15 + col * (w * 0.08);
          const gy = h * 0.2 + row * (h * 0.1);
          tx += (gx - p.x) * 0.02 + Math.sin(time + i) * 0.3;
          ty += (gy - p.y) * 0.02 + Math.cos(time * 0.7 + i) * 0.3;
        } else {
          // Convergence for closing
          tx += (cx - p.x) * 0.03;
          ty += (cy - p.y) * 0.03;
        }

        p.x = tx;
        p.y = ty;

        if (p.x < -30) p.x = w + 30;
        if (p.x > w + 30) p.x = -30;
        if (p.y < -30) p.y = h + 30;
        if (p.y > h + 30) p.y = -30;
      }

      // Connection lines
      for (let i = 0; i < pixels.length; i += 8) {
        const p1 = pixels[i];
        const p2 = pixels[(i + 17) % pixels.length];
        const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        if (d < 120) {
          ctx.strokeStyle = `rgba(0,0,0,${0.08 - d / 2000})`;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }

      // Pixels
      for (const p of pixels) {
        ctx.fillStyle = `rgba(0,0,0,${0.35 + Math.sin(time * 2 + p.phase) * 0.2})`;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }

      raf = window.requestAnimationFrame(render);
    };

    raf = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- activeScene read via sceneRef to avoid teardown/rebuild
  }, []);

  return <canvas ref={canvasRef} className={styles.pixelField} aria-hidden="true" />;
}
