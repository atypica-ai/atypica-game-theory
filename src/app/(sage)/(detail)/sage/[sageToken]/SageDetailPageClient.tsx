"use client";
import { SageActivityFeed } from "./components/SageActivityFeed";
import { SageGuide } from "./components/SageGuide";
import { SageStatsOverview } from "./components/SageStatsOverview";

export function SageDetailPageClient() {
  return (
    <div className="space-y-6">
      <SageGuide />
      <SageStatsOverview />
      <SageActivityFeed />
    </div>
  );
}
