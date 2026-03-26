"use client";

import { GameSessionMeta, RoundRecord } from "@/app/(game-theory)/types";
import { PlayerCard } from "./PlayerCard";

interface RoundViewProps {
  round: RoundRecord;
  meta: GameSessionMeta;
  isCurrentRound: boolean;
}

export function RoundView({ round, meta, isCurrentRound }: RoundViewProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
          Round {round.roundId}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {round.system && (
        <p className="text-xs text-muted-foreground text-center italic">{round.system}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {meta.participants.map((participant) => {
          const record = round.players[participant.playerId];
          const payoff = round.payoffs[participant.playerId];
          const isWaiting = isCurrentRound && !record;

          return (
            <PlayerCard
              key={participant.playerId}
              personaId={participant.personaId}
              personaName={participant.name}
              playerId={participant.playerId}
              record={record}
              payoff={payoff}
              isWaiting={isWaiting}
            />
          );
        })}
      </div>

      {Object.keys(round.payoffs).length > 0 && (
        <div className="flex justify-center gap-4 pt-1">
          {meta.participants.map((participant) => {
            const payoff = round.payoffs[participant.playerId];
            if (payoff === undefined) return null;
            return (
              <div key={participant.playerId} className="text-center">
                <div className="text-[10px] text-muted-foreground">{participant.name}</div>
                <div className="text-sm font-mono font-bold">
                  {payoff > 0 ? "+" : ""}
                  {payoff} pts
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
