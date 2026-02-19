"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";

export function useSceneProgress(sceneCount: number) {
  const sceneRefs = useRef<Array<HTMLElement | null>>([]);
  const ratioMap = useRef(new Map<number, number>());
  const [activeScene, setActiveScene] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const idx = sceneRefs.current.indexOf(entry.target as HTMLElement);
          if (idx === -1) continue;

          if (entry.isIntersecting) {
            ratioMap.current.set(idx, entry.intersectionRatio);
          } else {
            ratioMap.current.delete(idx);
          }
        }

        let bestIdx = -1;
        let bestRatio = 0;
        for (const [idx, ratio] of ratioMap.current) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestIdx = idx;
          }
        }

        if (bestIdx >= 0) {
          startTransition(() => setActiveScene(bestIdx));
        }
      },
      {
        // Only observe within the center 30% of the viewport
        rootMargin: "-35% 0px -35% 0px",
        threshold: [0, 0.1, 0.2, 0.3, 0.5, 0.75, 1],
      },
    );

    for (const el of sceneRefs.current) {
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [sceneCount]);

  const registerScene = useCallback(
    (index: number) => (el: HTMLElement | null) => {
      sceneRefs.current[index] = el;
    },
    [],
  );

  return { activeScene, registerScene };
}
