"use client";

import { useEffect, useState } from "react";

/**
 * Custom hook for responsive design using media queries
 * @param query The media query string to match against
 * @returns Boolean indicating whether the media query matches
 */
export function useMediaQuery(query: string): boolean {
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
