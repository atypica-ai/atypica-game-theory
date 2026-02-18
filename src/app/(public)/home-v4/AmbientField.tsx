"use client";

import { useEffect, useRef } from "react";

type Dot = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
};

function createDots(width: number, height: number) {
  const count = Math.max(36, Math.min(90, Math.floor((width * height) / 26000)));
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.25,
    vy: (Math.random() - 0.5) * 0.25,
    r: Math.random() * 1.6 + 0.4,
  })) as Dot[];
}

export function AmbientField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let dots: Dot[] = [];
    let rafId = 0;
    let lastTs = 0;
    let scrollY = window.scrollY;
    const pointer = { x: -9999, y: -9999 };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = createDots(width, height);
    };

    const onMove = (e: MouseEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    };

    const onLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
    };

    const onScroll = () => {
      scrollY = window.scrollY;
    };

    const tick = (ts: number) => {
      const dt = lastTs ? Math.min((ts - lastTs) / 16.67, 2) : 1;
      lastTs = ts;

      ctx.clearRect(0, 0, width, height);

      const drift = Math.sin(scrollY * 0.0015) * 0.2;

      for (let i = 0; i < dots.length; i += 1) {
        const dot = dots[i];

        if (!prefersReduced) {
          const dx = pointer.x - dot.x;
          const dy = pointer.y - dot.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 140 && dist > 0.001) {
            const push = (1 - dist / 140) * 0.8;
            dot.vx -= (dx / dist) * push * 0.04;
            dot.vy -= (dy / dist) * push * 0.04;
          }

          dot.vx += Math.sin((dot.y + scrollY * 0.25) * 0.002) * 0.002 + drift * 0.002;
          dot.vy += Math.cos((dot.x - scrollY * 0.2) * 0.002) * 0.002;
          dot.vx *= 0.98;
          dot.vy *= 0.98;
          dot.x += dot.vx * dt;
          dot.y += dot.vy * dt;
        }

        if (dot.x < -20) dot.x = width + 20;
        if (dot.x > width + 20) dot.x = -20;
        if (dot.y < -20) dot.y = height + 20;
        if (dot.y > height + 20) dot.y = -20;
      }

      ctx.strokeStyle = "rgba(74, 222, 128, 0.12)";
      for (let i = 0; i < dots.length; i += 1) {
        const a = dots[i];
        for (let j = i + 1; j < dots.length; j += 1) {
          const b = dots[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          if (distSq > 6400) continue;
          const alpha = (1 - distSq / 6400) * 0.4;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      for (let i = 0; i < dots.length; i += 1) {
        const dot = dots[i];
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = "#4ade80";
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      rafId = window.requestAnimationFrame(tick);
    };

    resize();
    rafId = window.requestAnimationFrame(tick);

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseout", onLeave, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[5]">
      <canvas ref={canvasRef} className="h-full w-full opacity-70" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(74,222,128,0.04),transparent_52%)]" />
    </div>
  );
}
