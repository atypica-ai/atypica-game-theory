"use client";
import { useEffect, useState } from "react";

/**
 * Custom hook for responsive design using media queries
 * @param query The media query string to match against
 * @returns Boolean indicating whether the media query matches
 */
export function useMediaQuery(breakpoint: "sm" | "md" | "lg" | "xl" | "2xl"): boolean {
  const query = {
    sm: "(width >= 40rem)", // (640px)
    md: "(width >= 48rem)", // (768px)
    lg: "(width >= 64rem)", // (1024px)
    xl: "(width >= 80rem)", // (1280px)
    "2xl": "(width >= 96rem)", // (1536px)
  }[breakpoint];

  const [matches, setMatches] = useState(false);
  useEffect(() => {
    // Initial check (for SSR)
    if (typeof window !== "undefined") {
      setMatches(window.matchMedia(query).matches);
    }

    // Create media query list
    const mediaQueryList = window.matchMedia(query);

    // Define listener function
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add listener
    mediaQueryList.addEventListener("change", listener);

    // Clean up on unmount
    return () => {
      mediaQueryList.removeEventListener("change", listener);
    };
  }, [query]);

  return matches;
}
