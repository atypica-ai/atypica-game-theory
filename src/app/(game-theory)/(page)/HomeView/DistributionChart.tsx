"use client";

import type { GameSessionStats } from "@/app/(game-theory)/types";
import { distributionRegistry } from "@/app/(game-theory)/gameTypes/distributionRegistry";

/**
 * Thin wrapper — renders the active game type's distribution view from the registry.
 * To customize what's shown for a game type, edit its DistributionView.tsx file
 * in gameTypes/{name}/DistributionView.tsx.
 */
export function GameDistributionView({
  gameType,
  sessionStats,
}: {
  gameType: string;
  sessionStats?: GameSessionStats;
}) {
  const View = distributionRegistry[gameType];

  if (!View) {
    return (
      <div className="flex items-center justify-center p-16">
        <span className="font-IBMPlexMono text-[9px] tracking-[0.1em] uppercase text-zinc-700">
          No distribution data available for this game type
        </span>
      </div>
    );
  }

  return <View sessionStats={sessionStats} />;
}
