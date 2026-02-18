"use client";

import { useEffect, useRef, useState } from "react";

export function useSceneProgress(sceneCount: number) {
  const sceneRefs = useRef<Array<HTMLElement | null>>([]);
  const [activeScene, setActiveScene] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const vh = window.innerHeight;
      let bestIdx = 0;
      let bestDist = Number.POSITIVE_INFINITY;

      for (let i = 0; i < sceneCount; i += 1) {
        const el = sceneRefs.current[i];
        if (!el) continue;

        const rect = el.getBoundingClientRect();
        const dist = Math.abs(rect.top + rect.height * 0.35 - vh * 0.52);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }

      setActiveScene(bestIdx);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [sceneCount]);

  const registerScene = (index: number) => (el: HTMLElement | null) => {
    sceneRefs.current[index] = el;
  };

  return { activeScene, registerScene };
}
