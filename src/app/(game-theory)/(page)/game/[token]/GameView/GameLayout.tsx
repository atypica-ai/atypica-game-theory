"use client";

import { useState } from "react";
import Link from "next/link";
import { RoundPill } from "./RoundView";
import { getRoundPayoffSum, RoundData } from "./index";
import { formatGameTypeName } from "./index";
import { GameRulesDisplay } from "@/app/(game-theory)/components/GameRulesDisplay";

// ── Types ────────────────────────────────────────────────────────────────────

export interface GameLayoutProps {
  token: string;
  gameType: string;
  isCompleted: boolean;
  isPending: boolean;
  currentRoundNumber: number;
  bannerData: { text: string; color: string } | null;
  navRounds: { roundId: number; isLive: boolean }[];
  rounds: RoundData[];
  manualRoundId: number | null;
  showResults: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  effectiveIdx: number;
  onSelectRound: (roundId: number | null) => void;
  children: React.ReactNode;
}

// ── Shared layout shell ──────────────────────────────────────────────────────

/**
 * Shared outer layout for AIGameView and HumanGameView.
 * Renders the header, result banner, round navigation bar, and a content slot.
 * Navigation actions are abstracted via `onSelectRound` so callers can use
 * either useState or useReducer internally.
 */
export function GameLayout({
  token,
  gameType,
  isCompleted,
  isPending,
  currentRoundNumber,
  bannerData,
  navRounds,
  rounds,
  manualRoundId,
  showResults,
  canGoPrev,
  canGoNext,
  effectiveIdx,
  onSelectRound,
  children,
}: GameLayoutProps) {
  const [rulesOpen, setRulesOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "var(--gt-bg)" }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header
        className="shrink-0 border-b z-10 overflow-visible"
        style={{ borderColor: "var(--gt-border)", background: "var(--gt-surface)" }}
      >
        <div className="mx-auto flex items-center justify-between h-[60px] px-4 sm:px-8" style={{ maxWidth: "1200px" }}>
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href="/"
              className="text-[13px] transition-colors hover:underline shrink-0 hidden sm:block"
              style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}
            >
              Game Theory Lab
            </Link>
            <span className="text-[13px] hidden sm:block" style={{ color: "var(--gt-t4)" }}>/</span>
            <span
              className="text-[15px] font-[600] truncate"
              style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
            >
              {formatGameTypeName(gameType)}
            </span>
            <button
              onClick={() => setRulesOpen(true)}
              className="group relative w-5 h-5 flex items-center justify-center rounded-full border cursor-pointer transition-colors text-[var(--gt-t4)] border-[var(--gt-border-md)] hover:text-[var(--gt-blue)] hover:border-[var(--gt-blue-border)] hover:bg-[var(--gt-blue-bg)] active:scale-90"
              style={{
                fontSize: "11px",
                fontFamily: "IBMPlexMono, monospace",
                fontWeight: 500,
                lineHeight: 1,
              }}
            >
              ?
              <span
                className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-50 whitespace-nowrap px-2 py-1 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: "var(--gt-t1)",
                  color: "var(--gt-surface)",
                  borderRadius: "0.25rem",
                  fontFamily: "IBMPlexMono, monospace",
                  letterSpacing: "0.02em",
                }}
              >
                Game rules
              </span>
            </button>
            {!isPending && currentRoundNumber > 0 && (
              <>
                <span className="text-[13px]" style={{ color: "var(--gt-t4)" }}>/</span>
                <span
                  className="inline-flex items-center px-2.5 py-0.5 text-[12px] font-[500] border"
                  style={{
                    borderRadius: "9999px",
                    color: "var(--gt-t2)",
                    borderColor: "var(--gt-border-md)",
                    fontFamily: "IBMPlexMono, monospace",
                  }}
                >
                  R{currentRoundNumber}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            {isCompleted && (
              <button
                onClick={() => {
                  if (typeof window !== "undefined") {
                    void navigator.clipboard.writeText(`${window.location.origin}/game/${token}/replay`);
                  }
                }}
                className="text-[13px] transition-colors hover:underline"
                style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}
              >
                Share Replay
              </button>
            )}
            <div
              className="flex items-center gap-2 px-2.5 py-1 border"
              style={{
                borderRadius: "9999px",
                borderColor: isCompleted ? "var(--gt-border-md)" : "var(--gt-blue-border)",
                background: isCompleted ? "transparent" : "var(--gt-blue-bg)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: isCompleted ? "var(--gt-t4)" : isPending ? "var(--gt-t4)" : "var(--gt-blue)",
                  animation: !isCompleted && !isPending ? "pulse 2s infinite" : undefined,
                }}
              />
              <span
                className="text-[12px] font-[500]"
                style={{
                  color: isCompleted ? "var(--gt-t3)" : isPending ? "var(--gt-t3)" : "var(--gt-blue)",
                  fontFamily: "IBMPlexMono, monospace",
                  letterSpacing: "0.06em",
                }}
              >
                {isCompleted ? "Complete" : isPending ? "Pending" : "Live"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Result banner ───────────────────────────────────────────────────── */}
      {bannerData && (
        <div
          className="shrink-0 h-8 flex items-center justify-center gap-4 border-b"
          style={{ borderColor: "var(--gt-border)", background: `${bannerData.color}0d` }}
        >
          <div className="flex-1 h-px max-w-16" style={{ backgroundColor: `${bannerData.color}30` }} />
          <span
            className="text-[12px] font-[600]"
            style={{ color: bannerData.color, letterSpacing: "var(--gt-tracking-tight)" }}
          >
            {bannerData.text}
          </span>
          <div className="flex-1 h-px max-w-16" style={{ backgroundColor: `${bannerData.color}30` }} />
        </div>
      )}

      {/* ── Round navigation bar ─────────────────────────────────────────────── */}
      {navRounds.length > 0 && (
        <div
          className="shrink-0 h-11 border-b flex items-stretch"
          style={{ borderColor: "var(--gt-border)", background: "var(--gt-surface)" }}
        >
          {/* Prev arrow */}
          <button
            onClick={() => {
              if (!canGoPrev) return;
              if (showResults) {
                const last = navRounds.at(-1)?.roundId;
                if (last !== undefined) onSelectRound(last);
              } else {
                onSelectRound(navRounds[effectiveIdx - 1].roundId);
              }
            }}
            disabled={!canGoPrev}
            className="shrink-0 px-4 h-full flex items-center text-[13px] transition-colors border-r"
            style={{
              color: canGoPrev ? "var(--gt-t2)" : "var(--gt-border-md)",
              borderColor: "var(--gt-border)",
              fontFamily: "IBMPlexMono, monospace",
              cursor: canGoPrev ? "pointer" : "default",
            }}
          >
            ←
          </button>

          {/* Round pills — scrollable */}
          <div className="flex-1 flex items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* Live tab */}
            {navRounds.some((r) => r.isLive) && (
              <button
                onClick={() => onSelectRound(null)}
                className="flex items-center gap-1.5 px-5 h-full text-[13px] font-[500] border-b-2 shrink-0 transition-colors"
                style={{
                  borderBottomColor: manualRoundId === null && !isCompleted ? "var(--gt-blue)" : "transparent",
                  color: manualRoundId === null && !isCompleted ? "var(--gt-blue)" : "var(--gt-t3)",
                  fontFamily: "IBMPlexMono, monospace",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "var(--gt-blue)" }} />
                Live
              </button>
            )}

            {navRounds.map(({ roundId, isLive }) => {
              const roundDataItem = rounds.find((r) => r.roundId === roundId);
              const payoffSum = !isLive && roundDataItem ? getRoundPayoffSum(roundDataItem) : null;
              return (
                <RoundPill
                  key={roundId}
                  roundId={roundId}
                  payoffSum={payoffSum}
                  isViewing={manualRoundId === roundId}
                  isLive={isLive}
                  onClick={() => {
                    if (isLive) onSelectRound(null);
                    else onSelectRound(manualRoundId === roundId ? null : roundId);
                  }}
                />
              );
            })}

            {/* Results tab — only when game complete */}
            {isCompleted && (
              <button
                onClick={() => onSelectRound(null)}
                className="flex items-center gap-1.5 px-5 h-full text-[13px] font-[500] border-b-2 shrink-0 transition-colors"
                style={{
                  borderBottomColor: showResults ? "var(--gt-pos)" : "transparent",
                  color: showResults ? "var(--gt-pos)" : "var(--gt-t3)",
                  fontFamily: "IBMPlexMono, monospace",
                }}
              >
                Results
              </button>
            )}

            <div className="flex-1" />
          </div>

          {/* Next arrow */}
          <button
            onClick={() => {
              if (!canGoNext) return;
              if (effectiveIdx === navRounds.length - 1 && isCompleted) {
                onSelectRound(null);
              } else {
                const next = navRounds[effectiveIdx + 1];
                onSelectRound(next.isLive ? null : next.roundId);
              }
            }}
            disabled={!canGoNext}
            className="shrink-0 px-4 h-full flex items-center text-[13px] transition-colors border-l"
            style={{
              color: canGoNext ? "var(--gt-t2)" : "var(--gt-border-md)",
              borderColor: "var(--gt-border)",
              fontFamily: "IBMPlexMono, monospace",
              cursor: canGoNext ? "pointer" : "default",
            }}
          >
            →
          </button>
        </div>
      )}

      {/* ── Content area ─────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {children}
      </div>

      {/* ── Rules dialog ───────────────────────────────────────────────────── */}
      {rulesOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "hsl(24 6% 17% / 0.25)" }}
          onClick={() => setRulesOpen(false)}
        >
          <div
            className="relative w-full mx-4 border overflow-hidden flex flex-col"
            style={{
              maxWidth: "640px",
              maxHeight: "80vh",
              background: "var(--gt-surface)",
              borderColor: "var(--gt-border)",
              borderRadius: "0.5rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dialog header */}
            <div
              className="shrink-0 flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: "var(--gt-border)" }}
            >
              <span
                className="text-[15px] font-[600]"
                style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
              >
                {formatGameTypeName(gameType)}
              </span>
              <button
                onClick={() => setRulesOpen(false)}
                className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-[var(--gt-row-alt)]"
                style={{ color: "var(--gt-t3)", fontSize: "16px", lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {/* Dialog body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <GameRulesDisplay gameTypeName={gameType} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
