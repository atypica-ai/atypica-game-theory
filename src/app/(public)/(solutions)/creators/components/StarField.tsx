"use client";

import { useEffect, useRef, useState } from "react";
import type { StarPosition } from "../types";
import { fadeinAnimation, keyframes, usePrefersReducedMotion } from "../animations";

const STAR_COUNT = 40; // Reduced from 100 (60% reduction)
const STAR_SIZE = 5; // px

export function StarField() {
  const [stars, setStars] = useState<StarPosition[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const generateStars = () => {
      // Use percentage positioning (0-100%) instead of pixels
      // This eliminates the need for window size calculations
      const newStars: StarPosition[] = Array.from({ length: STAR_COUNT }, () => ({
        x: Math.random() * 100, // 0-100% instead of pixel width
        y: Math.random() * 100, // 0-100% instead of scrollHeight
        delay: Math.random() * 3,
      }));
      setStars(newStars);
    };

    generateStars();

    // Debounced resize handler (500ms throttle)
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(generateStars, 500);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  // Don't render stars if user prefers reduced motion
  if (prefersReducedMotion) {
    return null;
  }

  return (
    <>
      <style>{keyframes.fadein}</style>
      <div
        ref={containerRef}
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 9999 }}
        aria-hidden="true"
      >
        {stars.map((star, index) => (
          <div
            key={index}
            className="absolute rounded-full bg-brand-green"
            style={{
              width: `${STAR_SIZE}px`,
              height: `${STAR_SIZE}px`,
              left: `${star.x}%`,
              top: `${star.y}%`,
              mixBlendMode: "screen",
              ...fadeinAnimation(3, star.delay),
            }}
          />
        ))}
      </div>
    </>
  );
}
