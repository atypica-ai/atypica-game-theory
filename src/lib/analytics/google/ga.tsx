"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { useEffect } from "react";

export function GoogleAnalyticsClient({ gaId, gadsId }: { gaId?: string; gadsId?: string }) {
  useEffect(() => {
    if (gadsId && typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("config", gadsId);
    }
  }, [gadsId]);

  return gaId && <GoogleAnalytics gaId={gaId} />;
}
