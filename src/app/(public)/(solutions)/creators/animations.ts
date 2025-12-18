// Minimal animation utilities for Creators page
// Simplified from 15+ keyframes to just 2 essential ones

import { useEffect, useRef, useState } from "react";

// Keyframe definitions (use in inline styles)
export const keyframes = {
  orbit: `
    @keyframes orbit {
      0% {
        transform: rotate(0deg) translateX(60px) rotate(0deg);
      }
      100% {
        transform: rotate(360deg) translateX(60px) rotate(-360deg);
      }
    }
  `,
  fadein: `
    @keyframes fadein {
      0%, 100% {
        opacity: 0;
      }
      50% {
        opacity: 1;
      }
    }
  `,
};

// Helper: Generate orbit animation style
export function orbitAnimation(duration: number, delay: number) {
  return {
    animation: `orbit ${duration}s linear infinite`,
    animationDelay: `${delay}s`,
  };
}

// Helper: Generate fadein animation style
export function fadeinAnimation(duration: number, delay: number) {
  return {
    animation: `fadein ${duration}s linear infinite`,
    animationDelay: `${delay}s`,
  };
}

// Hook: Intersection Observer for scroll animations
export function useScrollAnimation(threshold = 0.1) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold },
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

// Hook: Check if user prefers reduced motion
export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}
