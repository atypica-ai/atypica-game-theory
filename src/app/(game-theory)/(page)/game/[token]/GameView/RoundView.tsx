"use client";

import { GameSessionMeta, RoundRecord } from "@/app/(game-theory)/types";
import { PlayerCardCompact } from "./PlayerCard";

interface RoundViewProps {
  round: RoundRecord;
  meta: GameSessionMeta;
}

export function RoundView({ round, meta }: RoundViewProps) {
  const totalPayoff = Object.values(round.payoffs).reduce((acc, v) => acc + v, 0);

  return (
    <div className="flex items-stretch gap-px bg-[rgba(255,255,255,0.015)]">
      {/* Round label */}
      <div className="flex flex-col items-center justify-center w-12 shrink-0 gap-0.5 bg-[#09090b] py-2">
        <span className="font-IBMPlexMono text-[8px] tracking-[0.22em] uppercase text-zinc-700">
          R
        </span>
        <span className="font-EuclidCircularA text-base font-light text-zinc-600 leading-none">
          {round.roundId}
        </span>
      </div>

      {/* Player compact cards — one per participant */}
      <div className="flex flex-1 gap-px min-w-0">
        {meta.participants.map((participant, idx) => {
          const record = round.players[participant.playerId];
          const payoff = round.payoffs[participant.playerId];
          return (
            <PlayerCardCompact
              key={participant.playerId}
              personaId={participant.personaId}
              personaName={participant.name}
              playerIndex={idx}
              record={record}
              payoff={payoff}
            />
          );
        })}
      </div>

      {/* Combined payoff — rightmost column */}
      <div className="flex items-center justify-center w-16 shrink-0 bg-[#09090b] px-3">
        <span className="font-IBMPlexMono text-[9px] text-zinc-700 tabular-nums">
          Σ{totalPayoff}
        </span>
      </div>
    </div>
  );
}
