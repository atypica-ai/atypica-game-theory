"use client";

interface ClickableRoundProgressProps {
  currentRoundId: number;
  totalRounds: number;
  gameTypeName: string;
  onRoundClick: (roundId: number) => void;
  onSkipToEnd?: () => void;
}

function formatName(key: string): string {
  return key
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

export function ClickableRoundProgress({
  currentRoundId,
  totalRounds,
  gameTypeName,
  onRoundClick,
  onSkipToEnd,
}: ClickableRoundProgressProps) {
  return (
    <div className="flex flex-col items-center w-full max-w-md">
      {/* Round bars + skip to end */}
      <div className="flex items-center gap-2 mb-2">
        {Array.from({ length: totalRounds }, (_, i) => {
          const roundNum = i + 1;
          const isCompleted = roundNum < currentRoundId;
          const isCurrent = roundNum === currentRoundId;
          return (
            <button
              key={i}
              onClick={() => onRoundClick(roundNum)}
              className="h-1 rounded-full transition-all duration-500 cursor-pointer hover:opacity-80 hover:h-1.5"
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
        {onSkipToEnd && (
          <button
            onClick={onSkipToEnd}
            className="ml-1 flex items-center cursor-pointer transition-colors hover:text-[var(--gt-ink)]"
            style={{ color: "var(--gt-t4)" }}
            title="Skip to end"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2.5L8 7L2 11.5V2.5Z" fill="currentColor" />
              <rect x="10" y="2.5" width="2" height="9" rx="0.5" fill="currentColor" />
            </svg>
          </button>
        )}
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
          Round {currentRoundId} of {totalRounds}
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
