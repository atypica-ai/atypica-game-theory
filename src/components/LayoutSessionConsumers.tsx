"use client";

import { Embed } from "@/app/(system)/embed/Embed";
import { SegmentAnalytics } from "@/lib/analytics/segment";

/**
 * Renders layout chrome that depends on next-auth SessionProvider.
 * Must be a direct child of AuthProvider so useSession() works in Embed and SegmentAnalytics.
 * In RSC streaming, rendering these inside a single client boundary under SessionProvider
 * avoids "useSession must be wrapped in a <SessionProvider />" on some routes.
 */
export function LayoutSessionConsumers() {
  return (
    <>
      <Embed />
      <SegmentAnalytics />
    </>
  );
}
