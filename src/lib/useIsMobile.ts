"use client";

import { useEffect, useState } from "react";

/**
 * Detects whether the viewport is below a given breakpoint (default 640px = Tailwind `sm`).
 * Re-evaluates on window resize.
 */
export function useIsMobile(breakpoint = 640): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);

  return isMobile;
}
