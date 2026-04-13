"use client";

import { gameTypeRegistry } from "@/app/(game-theory)/gameTypes";
import { GameType } from "@/app/(game-theory)/gameTypes/types";
import type { StatsData } from "@/app/(game-theory)/lib/stats/types";
import { StatsBarChart } from "@/app/(game-theory)/components/stats/StatsBarChart";
import { ModelLeaderboard, StatsLeaderboard } from "@/app/(game-theory)/components/stats/StatsLeaderboard";
import { CompactModelGrid } from "@/app/(game-theory)/components/stats/CompactModelGrid";
import { CompactDiscussionGrid } from "@/app/(game-theory)/components/stats/CompactDiscussionGrid";
import Link from "next/link";
import { useEffect, useState } from "react";

const TICK_FONT = "IBMPlexMono, monospace";

function getDisplayName(gameType: string): string {
  const gt = (gameTypeRegistry as unknown as Record<string, GameType>)[gameType];
  return gt?.displayName ?? gameType;
}

/* ── Section Nav (sticky, tab-style per style.md) ────────────────────────────── */

interface NavItem {
  id: string;
  label: string;
}

function SectionNav({ items, activeId }: { items: NavItem[]; activeId: string }) {
  return (
    <nav
      className="sticky top-0 z-10 border-b"
      style={{ background: "var(--gt-surface)", borderColor: "var(--gt-border)" }}
    >
      <div className="mx-auto flex items-center px-4 sm:px-8" style={{ maxWidth: "1200px" }}>
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="relative block px-4 py-3 text-[12px] font-[500]"
              style={{
                color: active ? "var(--gt-blue)" : "var(--gt-t3)",
                letterSpacing: "var(--gt-tracking-tight)",
              }}
            >
              {item.label}
              {active && (
                <span
                  className="absolute bottom-0 left-4 right-4 h-[2px]"
                  style={{ background: "var(--gt-blue)" }}
                />
              )}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

/* ── Reusable pieces ─────────────────────────────────────────────────────────── */

function Card({ children }: { children: React.ReactNode }) {
  return <div className="card-lab p-5 sm:p-6">{children}</div>;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      className="flex items-center justify-center py-16"
      style={{ color: "var(--gt-t4)", fontFamily: TICK_FONT, fontSize: 11 }}
    >
      {message}
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────────────────────────── */

export function StatsPageView({
  modelWinRate,
  modelComparisons,
  discussionEffects,
  leaderboard,
  tagWinRate,
  gameTypes,
  discussionGames,
}: {
  modelWinRate: StatsData | null;
  modelComparisons: Record<string, StatsData>;
  discussionEffects: Record<string, StatsData>;
  leaderboard: StatsData | null;
  tagWinRate: StatsData | null;
  gameTypes: string[];
  discussionGames: string[];
}) {
  /* Which sections have data? */
  const hasModels = !!modelWinRate;
  const hasRankings = !!leaderboard;
  const hasGames = Object.keys(modelComparisons).length > 0;
  const hasDiscussion = Object.keys(discussionEffects).length > 0;
  const hasTags = !!(tagWinRate && tagWinRate.rows.length > 0);
  const hasResearch = hasDiscussion || hasTags;
  const hasAnyData = hasModels || hasRankings || hasGames || hasResearch;

  /* Build nav from available sections */
  const navItems: NavItem[] = [];
  if (hasModels) navItems.push({ id: "models", label: "Model Performance" });
  if (hasRankings) navItems.push({ id: "rankings", label: "Rankings" });
  if (hasGames) navItems.push({ id: "games", label: "Game Analysis" });
  if (hasResearch) navItems.push({ id: "research", label: "Research" });

  /* Track active section via IntersectionObserver */
  const [activeId, setActiveId] = useState(navItems[0]?.id ?? "");

  useEffect(() => {
    const ids: string[] = [];
    if (hasModels) ids.push("models");
    if (hasRankings) ids.push("rankings");
    if (hasGames) ids.push("games");
    if (hasResearch) ids.push("research");

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: "-60px 0px -60% 0px" },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [hasModels, hasRankings, hasGames, hasResearch]);

  /* Derived counts for subtitles */
  const modelCount = modelWinRate?.rows.length ?? 0;
  const personaCount = leaderboard?.rows.filter((r) => !r.meta?.isHuman).length ?? 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--gt-bg)" }}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
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

      {/* ── Sticky section nav ────────────────────────────────────────────── */}
      {navItems.length > 1 && <SectionNav items={navItems} activeId={activeId} />}

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <main className="flex-1 py-8 px-4 sm:py-12 sm:px-8">
        <div className="mx-auto flex flex-col gap-16" style={{ maxWidth: "1200px" }}>
          {!hasAnyData && (
            <EmptyState message="No statistics computed yet. Run POST /api/internal/recompute-stats to generate." />
          )}

          {/* ── 1. MODEL PERFORMANCE (hero) ───────────────────────────────── */}
          {hasModels && (
            <section id="models" className="scroll-mt-28">
              <ModelLeaderboard data={modelWinRate!} />
            </section>
          )}

          {/* ── 2. RANKINGS ───────────────────────────────────────────────── */}
          {hasRankings && leaderboard && (
            <section id="rankings" className="scroll-mt-28">
              <StatsLeaderboard
                data={leaderboard}
                subtitle={`${personaCount} personas tracked · min 2 games per game type`}
                filterable
              />
            </section>
          )}

          {/* ── 3. GAME ANALYSIS ──────────────────────────────────────────── */}
          {hasGames && (
            <section id="games" className="scroll-mt-28">
              <p className="label-caps mb-1">Game Analysis</p>
              <h2
                className="text-[20px] font-[600] mb-1"
                style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
              >
                Model Comparison by Game Type
              </h2>
              <p
                className="text-[12px] mb-6"
                style={{ color: "var(--gt-t4)", fontFamily: TICK_FONT }}
              >
                Key behavioral metric per game, broken down by model
              </p>
              <CompactModelGrid
                modelComparisons={modelComparisons}
                gameTypes={gameTypes}
                getDisplayName={getDisplayName}
              />
            </section>
          )}

          {/* ── 4. RESEARCH ───────────────────────────────────────────────── */}
          {hasResearch && (
            <section id="research" className="scroll-mt-28">
              <p className="label-caps mb-1">Research</p>
              <h2
                className="text-[20px] font-[600] mb-1"
                style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
              >
                Behavioral Insights
              </h2>
              <p
                className="text-[12px] mb-8"
                style={{ color: "var(--gt-t4)", fontFamily: TICK_FONT }}
              >
                Does discussion or persona background affect strategic behavior?
              </p>

              {/* Discussion Effect */}
              {hasDiscussion && (
                <div className="mb-10">
                  <h3
                    className="text-[15px] font-[600] mb-1"
                    style={{
                      color: "var(--gt-t2)",
                      letterSpacing: "var(--gt-tracking-tight)",
                    }}
                  >
                    Discussion Effect
                  </h3>
                  <p
                    className="text-[11px] mb-4"
                    style={{ color: "var(--gt-t4)", fontFamily: TICK_FONT }}
                  >
                    Does pre-decision discussion change behavior?
                  </p>
                  <CompactDiscussionGrid
                    discussionEffects={discussionEffects}
                    discussionGames={discussionGames}
                    getDisplayName={getDisplayName}
                  />
                </div>
              )}

              {/* Tag Win Rate */}
              {hasTags && (
                <div>
                  <h3
                    className="text-[15px] font-[600] mb-1"
                    style={{
                      color: "var(--gt-t2)",
                      letterSpacing: "var(--gt-tracking-tight)",
                    }}
                  >
                    Persona Tag Analysis
                  </h3>
                  <p
                    className="text-[11px] mb-4"
                    style={{ color: "var(--gt-t4)", fontFamily: TICK_FONT }}
                  >
                    Win rate by persona background tag (5+ personas per tag)
                  </p>
                  <Card>
                    <StatsBarChart
                      data={tagWinRate!}
                      title="Win rate by tag"
                      subtitle="Do persona traits correlate with strategic success?"
                    />
                  </Card>
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
