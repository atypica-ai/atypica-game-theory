"use client";

interface RoundProgressProps {
  round: number;
  totalRounds: number | null;
  gameTypeName: string;
}

export function RoundProgress({ round, totalRounds, gameTypeName }: RoundProgressProps) {
  const bars = totalRounds ?? round; // show only known rounds for indefinite games

  return (
    <div className="mt-8 flex flex-col items-center">
      {/* Round bars */}
      <div className="flex items-center gap-2 mb-2">
        {Array.from({ length: bars }, (_, i) => {
          const roundNum = i + 1;
          const isCompleted = roundNum < round;
          const isCurrent = roundNum === round;
          return (
            <div
              key={i}
              className="h-1 rounded-full transition-all duration-500"
              style={{
                width: isCurrent ? "3rem" : "2rem",
                background: isCompleted
                  ? "var(--gt-pos)"
                  : isCurrent
                    ? "var(--gt-ink)"
                    : "var(--gt-border-md)",
              }}
            />
          );
        })}
      </div>

      {/* Metadata */}
      <div
        className="flex items-center gap-4 text-[10px] font-bold uppercase"
        style={{
          letterSpacing: "0.2em",
          color: "var(--gt-t4)",
          fontFamily: "IBMPlexMono, monospace",
        }}
      >
        <span>{formatName(gameTypeName)}</span>
        <span style={{ color: "var(--gt-border-md)" }}>|</span>
        <span style={{ color: "var(--gt-ink)" }}>
          Round {round}{totalRounds ? ` of ${totalRounds}` : ""}
        </span>
      </div>

      {/* Dashed line */}
      <div
        className="w-full mt-6 opacity-50"
        style={{ borderTop: "1px dashed var(--gt-border-md)" }}
      />
    </div>
  );
}

function formatName(key: string): string {
  return key
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}
