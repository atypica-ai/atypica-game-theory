"use client";

import { gameTypeRegistry } from "@/app/(game-theory)/gameTypes";
import { GameType } from "@/app/(game-theory)/gameTypes/types";
import type { StatsData } from "@/app/(game-theory)/lib/stats/types";
import { StatsBarChart } from "@/app/(game-theory)/components/stats/StatsBarChart";
import { StatsLeaderboard } from "@/app/(game-theory)/components/stats/StatsLeaderboard";
import Link from "next/link";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-[18px] font-[600] mb-4"
      style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
    >
      {children}
    </h2>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="p-5 sm:p-6"
      style={{
        background: "var(--gt-surface)",
        border: "1px solid var(--gt-border)",
        borderRadius: "0.5rem",
      }}
    >
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      className="flex items-center justify-center py-12"
      style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", fontSize: 11 }}
    >
      {message}
    </div>
  );
}

function getDisplayName(gameType: string): string {
  const gt = (gameTypeRegistry as unknown as Record<string, GameType>)[gameType];
  return gt?.displayName ?? gameType;
}

export function StatsPageView({
  modelWinRate,
  modelComparisons,
  discussionEffects,
  overallLeaderboard,
  personaLeaderboard,
  tagWinRate,
  gameTypes,
  discussionGames,
}: {
  modelWinRate: StatsData | null;
  modelComparisons: Record<string, StatsData>;
  discussionEffects: Record<string, StatsData>;
  overallLeaderboard: StatsData | null;
  personaLeaderboard: StatsData | null;
  tagWinRate: StatsData | null;
  gameTypes: string[];
  discussionGames: string[];
}) {
  const hasAnyData =
    modelWinRate ||
    Object.keys(modelComparisons).length > 0 ||
    Object.keys(discussionEffects).length > 0 ||
    overallLeaderboard ||
    personaLeaderboard ||
    tagWinRate;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--gt-bg)" }}>
      {/* Header */}
      <header
        className="shrink-0 border-b"
        style={{ borderColor: "var(--gt-border)", background: "var(--gt-surface)" }}
      >
        <div
          className="mx-auto flex items-center justify-between h-[60px] px-4 sm:px-8"
          style={{ maxWidth: "1200px" }}
        >
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-[15px] font-[600] hover:opacity-70 transition-opacity"
              style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
            >
              Game Theory Lab
            </Link>
            <span className="w-px h-4" style={{ background: "var(--gt-border-md)" }} />
            <span className="text-[13px]" style={{ color: "var(--gt-t3)" }}>
              Statistics
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 py-8 px-4 sm:py-12 sm:px-8">
        <div className="mx-auto flex flex-col gap-10" style={{ maxWidth: "1200px" }}>

          {!hasAnyData && (
            <EmptyState message="No statistics computed yet. Run POST /api/internal/recompute-stats to generate." />
          )}

          {/* ── Model Win Rate ─────────────────────────────────── */}
          {modelWinRate && (
            <section>
              <SectionTitle>Overall Win Rate by Model</SectionTitle>
              <Card>
                <StatsBarChart
                  data={modelWinRate}
                  title="Cross-game win rate (normalized per game type)"
                  subtitle="Each game type contributes equally to the average"
                />
              </Card>
            </section>
          )}

          {/* ── Model Comparison per Game ──────────────────────── */}
          {Object.keys(modelComparisons).length > 0 && (
            <section>
              <SectionTitle>Model Comparison by Game Type</SectionTitle>
              <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 520px), 1fr))" }}>
                {gameTypes.map((gt) => {
                  const key = `model-comparison:${gt}`;
                  const data = modelComparisons[key];
                  if (!data || data.rows.length === 0) return null;
                  return (
                    <Card key={gt}>
                      <StatsBarChart
                        data={data}
                        title={getDisplayName(gt)}
                        height={240}
                      />
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Discussion Effect ──────────────────────────────── */}
          {Object.keys(discussionEffects).length > 0 && (
            <section>
              <SectionTitle>Discussion Effect (With vs Without)</SectionTitle>
              <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 520px), 1fr))" }}>
                {discussionGames.map((gt) => {
                  const key = `discussion-effect:${gt}`;
                  const data = discussionEffects[key];
                  if (!data || data.rows.length === 0) return null;
                  return (
                    <Card key={gt}>
                      <StatsBarChart
                        data={data}
                        title={getDisplayName(gt)}
                        height={200}
                      />
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Leaderboards ───────────────────────────────────── */}
          {(overallLeaderboard || personaLeaderboard) && (
            <section>
              <SectionTitle>Leaderboards</SectionTitle>
              <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 520px), 1fr))" }}>
                {overallLeaderboard && (
                  <Card>
                    <StatsLeaderboard
                      data={overallLeaderboard}
                      title="Overall Rankings"
                      subtitle="All participants ranked by win rate (min 2 games)"
                    />
                  </Card>
                )}
                {personaLeaderboard && (
                  <Card>
                    <StatsLeaderboard
                      data={personaLeaderboard}
                      title="AI Persona Rankings"
                      subtitle="AI personas only, ranked by win rate"
                    />
                  </Card>
                )}
              </div>
            </section>
          )}

          {/* ── Tag Win Rate ───────────────────────────────────── */}
          {tagWinRate && tagWinRate.rows.length > 0 && (
            <section>
              <SectionTitle>Win Rate by Persona Tag</SectionTitle>
              <Card>
                <StatsBarChart
                  data={tagWinRate}
                  title="Do persona tags correlate with strategic success?"
                  subtitle="Tags with 5+ personas shown"
                />
              </Card>
            </section>
          )}

        </div>
      </main>
    </div>
  );
}
