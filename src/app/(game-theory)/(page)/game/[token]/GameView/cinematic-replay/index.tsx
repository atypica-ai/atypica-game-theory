"use client";

import { GameSessionDetail } from "@/app/(game-theory)/actions";
import { getGameType } from "@/app/(game-theory)/gameTypes";
import { GameSessionParticipant } from "@/app/(game-theory)/types";
import { GameRulesDisplay } from "@/app/(game-theory)/components/GameRulesDisplay";
import { AnimatePresence } from "motion/react";
import { useCallback, useMemo } from "react";
import { deriveGameState } from "../index";
import { RulesPopover } from "../human/RulesPopover";
import { useIsMobile } from "@/lib/useIsMobile";
import { Info, ChevronRight } from "lucide-react";

import { useCinematicReplay } from "./useCinematicReplay";
import { ReplayDiscussionCard } from "./ReplayDiscussionCard";
import { ReplayAnalyzeCard } from "./ReplayAnalyzeCard";
import { ReplayFinalResultsCard } from "./ReplayFinalResultsCard";
import { ClickablePhaseProgress } from "./ClickablePhaseProgress";
import { ClickableRoundProgress } from "./ClickableRoundProgress";

// ── CinematicReplayView ─────────────────────────────────────────────────────

export function CinematicReplayView({ initialData }: { initialData: GameSessionDetail }) {
  const participants: GameSessionParticipant[] = useMemo(
    () => initialData.extra?.participants ?? [],
    [initialData.extra?.participants],
  );
  const gameTypeName = initialData.gameType;
  const gameType = useMemo(() => getGameType(gameTypeName), [gameTypeName]);
  const discussionRounds = initialData.extra?.discussionRounds ?? gameType.discussionRounds;
  const hasDiscussion = discussionRounds > 0;
  const horizonLabel = gameType.horizon.type === "fixed"
    ? `${gameType.horizon.rounds} round${gameType.horizon.rounds !== 1 ? "s" : ""}`
    : gameType.horizon.type === "indefinite"
      ? "Indefinite"
      : "Conditional";

  const {
    displayState,
    started,
    startReplay,
    proceed,
    goToRound,
    goToPhase,
    restart,
    skipToEnd,
  } = useCinematicReplay(initialData.events, participants, discussionRounds);

  const {
    currentRoundId,
    phase,
    visibleDiscussions,
    typingSpeakerId,
    allDiscussionsDone,
    visibleDecisions,
    roundResult,
    allDecisionsDone,
    allRounds,
    isComplete,
    isFinalRound,
  } = displayState;

  const totalRounds = allRounds.length;

  // For FinalResultsCard: compute winners from full game state
  const finalScores = useMemo(() => {
    if (!isComplete) return {};
    return deriveGameState(initialData.events, true).scores;
  }, [isComplete, initialData.events]);

  const winners = useMemo(() => {
    if (!isComplete || participants.length === 0) return [] as GameSessionParticipant[];
    const maxScore = Math.max(...participants.map((p) => finalScores[p.personaId] ?? 0));
    const leaders = participants.filter((p) => (finalScores[p.personaId] ?? 0) === maxScore);
    if (leaders.length === participants.length) return [] as GameSessionParticipant[];
    return leaders;
  }, [isComplete, participants, finalScores]);

  const isFullTie = isComplete && participants.length > 0 && winners.length === 0;

  const handlePhaseClick = useCallback(
    (targetPhase: "discussion" | "analyze") => {
      goToPhase(currentRoundId, targetPhase);
    },
    [goToPhase, currentRoundId],
  );

  const showChrome = !isComplete;
  const isMobile = useIsMobile();
  const chromeHeight = isMobile ? "8vh" : "15vh";

  // ── Briefing card (before replay starts) ────────────────────────────────
  if (!started) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ background: "var(--gt-bg)" }}
      >
        <div className="w-full max-w-xl">
          <div className="card-lab p-5 sm:p-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-md flex items-center justify-center"
                style={{ background: "var(--gt-row-alt)", color: "var(--gt-ink)" }}
              >
                <Info size={20} />
              </div>
              <div>
                <h2
                  className="text-xl font-semibold"
                  style={{ color: "var(--gt-t1)", letterSpacing: "-0.03em" }}
                >
                  {gameType.displayName}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className="text-[11px] px-2 py-0.5 border"
                    style={{
                      borderRadius: "9999px",
                      color: "var(--gt-ink)",
                      borderColor: "hsl(210 20% 15% / 0.2)",
                      background: "hsl(210 20% 15% / 0.06)",
                      fontFamily: "IBMPlexMono, monospace",
                    }}
                  >
                    {participants.length} participants
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}
                  >
                    {horizonLabel}
                  </span>
                  {hasDiscussion && (
                    <>
                      <span className="w-px h-3" style={{ background: "var(--gt-border-md)" }} />
                      <span
                        className="text-xs"
                        style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}
                      >
                        {discussionRounds}× discuss
                      </span>
                    </>
                  )}
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
              {gameType.punchline}
            </p>

            {/* Rules */}
            <div
              className="rounded-md border p-4 mb-6 max-h-[340px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ borderColor: "var(--gt-border)", background: "var(--gt-row-alt)" }}
            >
              <GameRulesDisplay gameTypeName={gameTypeName} />
            </div>

            {/* Start button */}
            <button
              onClick={startReplay}
              className="btn-lab w-full flex items-center justify-center gap-2 group text-lg"
            >
              START REPLAY{" "}
              <ChevronRight
                size={18}
                className="group-hover:translate-x-1 transition-transform"
              />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Replay view ─────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col" style={{ background: "var(--gt-bg)" }}>
      <RulesPopover gameTypeName={gameTypeName} gameDisplayName={gameType.displayName} />

      {/* ── Top zone: clickable phase progress ───────────────────────── */}
      {showChrome && (
        <div className="shrink-0 flex items-end justify-center" style={{ height: chromeHeight, paddingBottom: "1rem" }}>
          <ClickablePhaseProgress
            phase={phase}
            hasDiscussion={hasDiscussion}
            onPhaseClick={handlePhaseClick}
          />
        </div>
      )}

      {/* ── Middle zone: card area ────────────────────────────────────── */}
      <div
        className="flex-1 min-h-0 flex items-center justify-center overflow-y-auto px-6"
        style={{ paddingTop: showChrome ? "0" : undefined }}
      >
        <div className="w-full max-w-xl py-4">
          <AnimatePresence mode="wait">
            {phase === "discussion" && (
              <ReplayDiscussionCard
                key={`disc-${currentRoundId}`}
                discussions={visibleDiscussions}
                participants={participants}
                typingSpeakerId={typingSpeakerId}
                allDone={allDiscussionsDone}
                onProceed={proceed}
              />
            )}
            {phase === "analyze" && (
              <ReplayAnalyzeCard
                key={`analyze-${currentRoundId}`}
                roundId={currentRoundId}
                participants={participants}
                visibleDecisions={visibleDecisions}
                roundResult={roundResult}
                isFinalRound={isFinalRound}
                allDone={allDecisionsDone}
                onProceed={proceed}
              />
            )}
            {isComplete && (
              <ReplayFinalResultsCard
                key="results"
                participants={participants}
                cumulativeScores={finalScores}
                winners={winners}
                isFullTie={isFullTie}
                onRestart={restart}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Bottom zone: clickable round progress + skip to end ────── */}
      {showChrome && (
        <div className="shrink-0 flex items-start justify-center" style={{ height: chromeHeight, paddingTop: "1rem" }}>
          <ClickableRoundProgress
            currentRoundId={currentRoundId}
            totalRounds={totalRounds}
            gameTypeName={gameTypeName}
            onRoundClick={goToRound}
            onSkipToEnd={skipToEnd}
          />
        </div>
      )}
    </div>
  );
}
