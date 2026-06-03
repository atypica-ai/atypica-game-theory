"use client";

import { GoogleAnalytics } from "@next/third-parties/google";

export function GoogleAnalyticsClient({ gaId }: { gaId?: string }) {
  return gaId ? <GoogleAnalytics gaId={gaId} /> : null;
}
