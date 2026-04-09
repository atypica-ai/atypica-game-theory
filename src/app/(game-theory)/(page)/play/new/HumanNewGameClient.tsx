"use client";

import { createHumanGameSession } from "@/app/(game-theory)/actions";
import { cn } from "@/lib/utils";
import { Info, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GameTypeInfo } from "../../game/new/NewGameClient";
import { GameRulesDisplay } from "@/app/(game-theory)/components/GameRulesDisplay";

export function HumanNewGameClient({
  gameTypes,
  user,
}: {
  gameTypes: GameTypeInfo[];
  user: { id: number; name: string };
}) {
  const router = useRouter();
  const [selectedGameType, setSelectedGameType] = useState(gameTypes[0]?.name ?? "");
  const [discussionRounds, setDiscussionRounds] = useState<number | undefined>(undefined);
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"select" | "prepare">("select");

  const activeGameType = gameTypes.find((g) => g.name === selectedGameType);
  const aiOpponents = (activeGameType?.minPlayers ?? 2) - 1;

  async function handleEnter() {
    if (isLaunching || !selectedGameType) return;
    setIsLaunching(true);
    setError(null);
    const result = await createHumanGameSession(selectedGameType, discussionRounds);
    if (!result.success) {
      setError(result.message);
      setIsLaunching(false);
      return;
    }
    router.push(`/game/${result.token}`);
  }

  // ── Shared header ──────────────────────────────────────────────────────
  const header = (
    <header
      className="shrink-0 border-b"
      style={{ borderColor: "var(--gt-border)", background: "var(--gt-surface)" }}
    >
      <div className="mx-auto flex items-center justify-between h-[60px] px-8" style={{ maxWidth: "960px" }}>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="text-[13px] transition-colors hover:underline"
            style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}
          >
            Game Theory Lab
          </Link>
          <span className="text-[13px]" style={{ color: "var(--gt-t4)" }}>/</span>
          <span
            className="text-[15px] font-[600]"
            style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
          >
            {step === "select" ? "Choose Your Arena" : activeGameType?.displayName ?? "Game Rules"}
          </span>
        </div>

        {/* Player identity */}
        <div className="flex items-center gap-2">
          <span
            className="text-[12px] px-2.5 py-1 border"
            style={{
              borderRadius: "9999px",
              color: "var(--gt-blue)",
              borderColor: "var(--gt-blue-border)",
              background: "var(--gt-blue-bg)",
              fontFamily: "IBMPlexMono, monospace",
              letterSpacing: "0.04em",
            }}
          >
            {user.name}
          </span>
        </div>
      </div>
    </header>
  );

  // ── Discussion toggle (shared between both views) ──────────────────────
  const discussionToggle = (
    <div className="flex items-center gap-3">
      <label
        className="flex items-center gap-2 cursor-pointer select-none"
        style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace", fontSize: "12px" }}
      >
        <input
          type="checkbox"
          checked={discussionRounds !== undefined}
          onChange={(e) => setDiscussionRounds(e.target.checked ? 1 : undefined)}
          style={{ accentColor: "var(--gt-blue)", cursor: "pointer" }}
        />
        discussion
      </label>
      {discussionRounds !== undefined && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDiscussionRounds(Math.max(0, discussionRounds - 1))}
            className="w-5 h-5 flex items-center justify-center hover:opacity-70"
            style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace", fontSize: "14px" }}
          >
            −
          </button>
          <span className="w-4 text-center tabular-nums" style={{ color: "var(--gt-t1)", fontFamily: "IBMPlexMono, monospace", fontSize: "13px" }}>
            {discussionRounds}
          </span>
          <button
            onClick={() => setDiscussionRounds(discussionRounds + 1)}
            className="w-5 h-5 flex items-center justify-center hover:opacity-70"
            style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace", fontSize: "14px" }}
          >
            +
          </button>
        </div>
      )}
    </div>
  );

  // ── SELECT step ────────────────────────────────────────────────────────
  if (step === "select") {
    return (
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: "var(--gt-bg)" }}>
        {header}

        {/* Intro strip */}
        <div
          className="shrink-0 border-b"
          style={{ borderColor: "var(--gt-border)", background: "var(--gt-surface)" }}
        >
          <div className="mx-auto py-6 px-8" style={{ maxWidth: "960px" }}>
            <p
              className="text-[15px] leading-relaxed"
              style={{
                color: "var(--gt-t2)",
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontStyle: "italic",
              }}
            >
              You will play as one of the participants. AI personas will fill the remaining seats.
              Watch how your choices compare — and contrast — with theirs.
            </p>
          </div>
        </div>

        {/* Game type selector */}
        <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="mx-auto" style={{ maxWidth: "960px" }}>
            <div className="px-8 pt-6 pb-3">
              <span
                className="text-[11px] uppercase"
                style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.1em" }}
              >
                Select a game
              </span>
            </div>

            {gameTypes.map((gt) => {
              const isSelected = selectedGameType === gt.name;
              const aiCount = gt.minPlayers - 1;

              return (
                <div key={gt.name}>
                  <button
                    onClick={() => setSelectedGameType(gt.name)}
                    className={cn(
                      "w-full flex items-start text-left border-b transition-colors",
                      isSelected ? "" : "hover:bg-[var(--gt-row-alt)]",
                    )}
                    style={{
                      borderColor: "var(--gt-border)",
                      borderLeft: isSelected ? "3px solid var(--gt-blue)" : "3px solid transparent",
                      background: isSelected ? "var(--gt-surface)" : "transparent",
                    }}
                  >
                    <div className="flex-1 px-8 py-6">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className="text-[18px] font-[600] leading-tight"
                          style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
                        >
                          {gt.displayName}
                        </span>
                        {/* Player composition badge */}
                        <span
                          className="text-[11px] px-2.5 py-1 border shrink-0"
                          style={{
                            borderRadius: "9999px",
                            color: isSelected ? "var(--gt-blue)" : "var(--gt-t4)",
                            borderColor: isSelected ? "var(--gt-blue-border)" : "var(--gt-border)",
                            background: isSelected ? "var(--gt-blue-bg)" : "transparent",
                            fontFamily: "IBMPlexMono, monospace",
                          }}
                        >
                          You + {aiCount} AI
                        </span>
                      </div>
                      <p className="text-[14px] leading-relaxed mb-3" style={{ color: "var(--gt-t2)" }}>
                        {gt.tagline}
                      </p>
                      <div className="flex items-center gap-3">
                        <span
                          className="text-[12px]"
                          style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}
                        >
                          {gt.horizonLabel}
                        </span>
                        {gt.discussionRounds > 0 && (
                          <>
                            <span className="w-px h-3" style={{ background: "var(--gt-border-md)" }} />
                            <span
                              className="text-[12px]"
                              style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}
                            >
                              {gt.discussionRounds}× discuss
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 w-10 flex items-center justify-center pt-7 pr-4" style={{ color: "var(--gt-t4)" }}>
                      {isSelected ? "▴" : "▾"}
                    </div>
                  </button>
                  {/* Expanded rules */}
                  {isSelected && (
                    <div
                      className="px-8 py-6 border-b"
                      style={{ borderColor: "var(--gt-border)", background: "var(--gt-row-alt)" }}
                    >
                      <GameRulesDisplay gameTypeName={gt.name} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="shrink-0 border-t"
          style={{ borderColor: "var(--gt-border)", background: "var(--gt-surface)" }}
        >
          <div className="mx-auto flex items-center justify-between py-4 px-8" style={{ maxWidth: "960px" }}>
            <div>
              <span className="text-[12px]" style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace" }}>
                {activeGameType
                  ? `You vs ${aiOpponents} AI opponent${aiOpponents !== 1 ? "s" : ""}`
                  : "Select a game to continue"}
              </span>
            </div>

            {discussionToggle}

            <button
              onClick={() => { if (selectedGameType) setStep("prepare"); }}
              disabled={!selectedGameType}
              className="h-9 px-6 text-[13px] font-[500] transition-opacity"
              style={{
                background: selectedGameType ? "var(--gt-blue)" : "var(--gt-row-alt)",
                color: selectedGameType ? "white" : "var(--gt-t4)",
                borderRadius: "0.375rem",
                cursor: selectedGameType ? "pointer" : "not-allowed",
                letterSpacing: "var(--gt-tracking-tight)",
                border: selectedGameType ? "none" : "1px solid var(--gt-border-md)",
              }}
            >
              Enter the game →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── PREPARE step — Briefing card ────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: "var(--gt-bg)" }}
    >
      <div className="w-full max-w-xl">
        <div className="card-lab p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-10 h-10 rounded-md flex items-center justify-center"
              style={{ background: "var(--gt-row-alt)", color: "var(--gt-blue)" }}
            >
              <Info size={20} />
            </div>
            <div>
              <h2
                className="text-xl font-semibold"
                style={{ color: "var(--gt-t1)", letterSpacing: "-0.03em" }}
              >
                {activeGameType?.displayName ?? "Game Rules"}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="text-[11px] px-2 py-0.5 border"
                  style={{
                    borderRadius: "9999px",
                    color: "var(--gt-blue)",
                    borderColor: "var(--gt-blue-border)",
                    background: "var(--gt-blue-bg)",
                    fontFamily: "IBMPlexMono, monospace",
                  }}
                >
                  You + {aiOpponents} AI
                </span>
                <span
                  className="text-xs"
                  style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}
                >
                  {activeGameType?.horizonLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Tagline */}
          <p
            className="text-sm leading-relaxed mb-4"
            style={{
              color: "var(--gt-t2)",
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontStyle: "italic",
            }}
          >
            {activeGameType?.tagline}
          </p>

          {/* Rules */}
          <div
            className="rounded-md border p-4 mb-4 max-h-[340px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ borderColor: "var(--gt-border)", background: "var(--gt-row-alt)" }}
          >
            <GameRulesDisplay gameTypeName={selectedGameType} />
          </div>

          {/* Discussion toggle */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setStep("select")}
              className="text-[12px] transition-colors hover:underline"
              style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}
            >
              ← Change game
            </button>
            {discussionToggle}
          </div>

          {/* Start button */}
          <button
            onClick={() => void handleEnter()}
            disabled={isLaunching}
            className="btn-lab w-full flex items-center justify-center gap-2 group text-lg"
          >
            {isLaunching ? (
              <span
                className="text-[11px] uppercase"
                style={{ fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.1em" }}
              >
                Entering…
              </span>
            ) : (
              <>
                START GAME{" "}
                <ChevronRight
                  size={18}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </>
            )}
          </button>

          {/* Error */}
          {error && (
            <p
              className="text-[12px] text-center mt-3"
              style={{ color: "var(--gt-neg)", fontFamily: "IBMPlexMono, monospace" }}
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
