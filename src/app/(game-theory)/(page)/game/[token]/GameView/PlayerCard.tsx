"use client";

import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { PlayerRecord } from "@/app/(game-theory)/types";

interface PlayerCardProps {
  personaId: number;
  personaName: string;
  playerId: string;
  record: PlayerRecord | undefined;
  payoff: number | undefined;
  isWaiting?: boolean;
}

export function PlayerCard({
  personaId,
  personaName,
  playerId,
  record,
  payoff,
  isWaiting,
}: PlayerCardProps) {
  const hasActed = !!record && record.actions.length > 0;

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2.5">
        <HippyGhostAvatar seed={personaId} className="size-8 shrink-0" />
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-medium truncate">{personaName}</span>
          <span className="text-[10px] text-muted-foreground">{playerId}</span>
        </div>
        {payoff !== undefined && (
          <span
            className={cn(
              "text-sm font-mono font-bold",
              payoff > 0 ? "text-green-500" : payoff < 0 ? "text-red-500" : "text-muted-foreground",
            )}
          >
            {payoff > 0 ? "+" : ""}
            {payoff}
          </span>
        )}
      </div>

      {isWaiting && !hasActed ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          <span>Deciding...</span>
        </div>
      ) : hasActed ? (
        <div className="space-y-1">
          {record.words && (
            <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3">{record.words}</p>
          )}
          <div className="flex flex-wrap gap-1">
            {record.actions.map((action, i) => (
              <div key={i} className="flex flex-wrap gap-1">
                {Object.entries(action).map(([k, v]) => (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-muted border border-border"
                  >
                    <span className="text-muted-foreground">{k}:</span>
                    <span className="font-medium">{String(v)}</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
