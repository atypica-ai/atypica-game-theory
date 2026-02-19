"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "./useReducedMotion";

export function useAutoMotion() {
  const reduced = useReducedMotion();
  const [time, setTime] = useState(0);

  useEffect(() => {
    if (reduced) return;

    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      setTime((now - start) / 1000);
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [reduced]);

  return { time, reducedMotion: reduced };
}
