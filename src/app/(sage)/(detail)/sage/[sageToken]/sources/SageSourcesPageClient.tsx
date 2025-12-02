"use client";

import { SourcesPanel } from "../components/SourcesPanel";

/**
 * Sources page - primarily for mobile view where sources are in a separate tab
 * On desktop, sources are in the left sidebar
 */
export function SageSourcesPageClient() {
  return (
    <div className="lg:hidden">
      <SourcesPanel />
    </div>
  );
}
