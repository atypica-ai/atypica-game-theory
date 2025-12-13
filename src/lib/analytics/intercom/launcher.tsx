"use client";

import { useMediaQuery } from "@/hooks/use-media-query";
import { useCallback, useEffect } from "react";

// Custom Help Icon
const HelpIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <circle cx="12" cy="17" r="0.5" fill="currentColor" />
  </svg>
);

export function IntercomLauncher() {
  const gteLG = useMediaQuery("lg");

  const showDefaultLauncher = gteLG && false; // 始终不显示

  const showIntercom = useCallback(() => {
    if (typeof window.Intercom !== "undefined") {
      window.Intercom("show");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).intercomSettings = {
      hide_default_launcher: !showDefaultLauncher,
    };
    if (typeof window.Intercom !== "undefined") {
      window.Intercom("update", {
        hide_default_launcher: !showDefaultLauncher,
      });
    }
  }, [showDefaultLauncher]);

  if (showDefaultLauncher) {
    return null;
  }

  return (
    <button
      onClick={showIntercom}
      className="cursor-pointer flex items-center justify-center w-8 h-8"
      aria-label="Open customer support"
    >
      <HelpIcon className="size-[1.15rem]" />
    </button>
  );
}
