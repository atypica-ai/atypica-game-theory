"use client";

import { fetchGameSession, GameSessionDetail } from "@/app/(game-theory)/actions";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import useSWR from "swr";
import { RoundView } from "./RoundView";

interface GameViewProps {
  token: string;
  initialData: GameSessionDetail;
}

export function GameView({ token, initialData }: GameViewProps) {
  const { data } = useSWR(
    ["game-theory:session", token],
    async () => {
      const result = await fetchGameSession(token);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
    {
      fallbackData: initialData,
      // Poll while game is running; stop when completed
      refreshInterval: (data) => (data?.status === "completed" ? 0 : 3000),
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const session = data ?? initialData;
  const timeline = session.timeline;
  const isComplete = session.status === "completed";
  const isRunning = session.status === "running";

  const cumulativePayoffs = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const round of timeline.rounds ?? []) {
      for (const [pid, v] of Object.entries(round.payoffs)) {
        totals[pid] = (totals[pid] ?? 0) + v;
      }
    }
    return totals;
  }, [timeline.rounds]);

  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();

  if (!timeline.meta) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span>Starting game...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-background/60 backdrop-blur-sm">
        <div>
          <h1 className="text-sm font-semibold">{session.gameType}</h1>
          <p className="text-[10px] text-muted-foreground">
            {timeline.meta.participants.map((p) => p.name).join(" · ")}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border/50">
          <div
            className={cn(
              "size-2 rounded-full",
              isComplete
                ? "bg-muted-foreground/30"
                : "bg-ghost-green shadow-[0_0_6px] shadow-ghost-green animate-pulse",
            )}
          />
          <span className="text-xs font-medium text-muted-foreground">
            {isComplete ? "Complete" : isRunning ? "In Progress" : "Pending"}
          </span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main timeline */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-2xl mx-auto px-4 lg:px-6 py-6 space-y-8">
            {/* Game rules */}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Game Rules
              </p>
              <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">
                {timeline.system}
              </p>
            </div>

            {/* Rounds */}
            {(timeline.rounds ?? []).map((round, index) => (
              <RoundView
                key={round.roundId}
                round={round}
                meta={timeline.meta}
                isCurrentRound={isRunning && index === (timeline.rounds?.length ?? 0) - 1}
              />
            ))}

            {isRunning && (timeline.rounds?.length ?? 0) === 0 && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-12">
                <Loader2 className="size-4 animate-spin" />
                <span>Round 1 is starting...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Right sidebar: scores */}
        {Object.keys(cumulativePayoffs).length > 0 && (
          <div className="hidden md:flex flex-col w-48 lg:w-56 border-l border-border py-4 px-4 gap-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Cumulative Score
            </p>
            <div className="space-y-3">
              {timeline.meta.participants.map((participant) => {
                const total = cumulativePayoffs[participant.playerId] ?? 0;
                return (
                  <div key={participant.playerId} className="flex items-center justify-between">
                    <span className="text-xs text-foreground truncate flex-1 mr-2">
                      {participant.name}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-mono font-bold",
                        total > 0
                          ? "text-green-500"
                          : total < 0
                            ? "text-red-500"
                            : "text-muted-foreground",
                      )}
                    >
                      {total > 0 ? "+" : ""}
                      {total}
                    </span>
                  </div>
                );
              })}
            </div>

            {isComplete && (
              <div className="mt-auto pt-3 border-t border-border">
                <p className="text-[10px] text-muted-foreground text-center">Game complete</p>
                <p className="text-[10px] text-muted-foreground text-center">
                  {(timeline.rounds?.length ?? 0)} rounds played
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
