"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SessionListItem } from "@/app/(game-theory)/actions";
import { gameTypeRegistry } from "@/app/(game-theory)/gameTypes";
import { GameType } from "@/app/(game-theory)/gameTypes/types";
import { GameSessionParticipant } from "@/app/(game-theory)/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import {
  computeOutcome,
  classifySpread,
  formatRelativeTime,
  type SpreadCategory,
} from "./utils";

const GAME_TYPES = Object.values(gameTypeRegistry) as unknown as GameType[];

// ── Spread config ─────────────────────────────────────────────────────────────
// Taller bar = more opaque (matching reference HTML pattern)

const SPREAD_BARS: Record<SpreadCategory, Array<{ h: number; opacity: number }>> = {
  // Dominant: last bar very tall → most opaque; short bars → low opacity
  dominant: [
    { h: 3, opacity: 0.30 },
    { h: 4, opacity: 0.35 },
    { h: 3, opacity: 0.30 },
    { h: 5, opacity: 0.40 },
    { h: 20, opacity: 1.0 },
  ],
  // Even: middle bar tallest → most opaque; edges shorter → lower opacity
  even: [
    { h: 7,  opacity: 0.50 },
    { h: 13, opacity: 0.70 },
    { h: 20, opacity: 1.0  },
    { h: 15, opacity: 0.80 },
    { h: 8,  opacity: 0.55 },
  ],
};

const SPREAD_COLOR: Record<SpreadCategory, { bar: string; label: string }> = {
  dominant: { bar: "#E24B4A", label: "#A32D2D" },
  even:     { bar: "#185FA5", label: "var(--color-text-secondary)" },
};

// ── Grid columns ──────────────────────────────────────────────────────────────
// 6 columns — all fr-based so they share space proportionally (no single 1fr hog)
// Desktop: Game | Winner+participants | Top score | Reward spread | Status | View
// Mobile:  Game | View  (others hidden)

const DESKTOP_COLS = "1.5fr 3fr 1fr 2fr 1fr 0.8fr";
const MOBILE_COLS  = "1fr auto";

// ── Precomputed row data ──────────────────────────────────────────────────────

interface SessionRow {
  token: string;
  gameType: string;
  gameTypeDisplay: string;
  status: string;
  createdAt: string;
  participants: GameSessionParticipant[];
  participantNames: string;
  winners: GameSessionParticipant[];
  isFullTie: boolean;
  topScore: number | null;
  spreadCategory: SpreadCategory | null;
}

function buildRows(sessions: SessionListItem[]): SessionRow[] {
  return sessions
    .filter((s) => s.status !== "failed")
    .map((s) => {
      const participants = s.extra.participants ?? [];
      const gt = (gameTypeRegistry as unknown as Record<string, GameType>)[s.gameType];
      const outcome = s.status === "completed" ? computeOutcome(s.events, participants) : null;

      let topScore: number | null = null;
      let spreadCategory: SpreadCategory | null = null;

      if (outcome) {
        const scoreVals = Object.values(outcome.scores);
        topScore = scoreVals.length > 0 ? Math.max(...scoreVals) : null;
        spreadCategory = classifySpread(scoreVals);
      }

      return {
        token: s.token,
        gameType: s.gameType,
        gameTypeDisplay: gt?.displayName ?? s.gameType,
        status: s.status,
        createdAt: s.createdAt,
        participants,
        participantNames: participants.map((p) => p.name).join(" "),
        winners: outcome?.winners ?? [],
        isFullTie: outcome?.isFullTie ?? false,
        topScore,
        spreadCategory,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ── Cell components ───────────────────────────────────────────────────────────

function GameCell({ display, createdAt }: { display: string; createdAt: string }) {
  return (
    <div>
      <div style={{ fontWeight: 500, fontSize: "13px", color: "var(--color-text-primary)" }}>
        {display}
      </div>
      <div style={{ fontSize: "11px", color: "var(--color-text-tertiary)", marginTop: "1px" }}>
        {formatRelativeTime(createdAt)}
      </div>
    </div>
  );
}

function Avatar({
  participant,
  overlap = false,
}: {
  participant: GameSessionParticipant;
  overlap?: boolean;
}) {
  return (
    <div
      style={{
        width: "22px",
        height: "22px",
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        ...(overlap
          ? { marginLeft: "-7px", boxShadow: "0 0 0 1.5px var(--color-background-primary)" }
          : {}),
      }}
    >
      <HippyGhostAvatar seed={participant.personaId} className="size-full" />
    </div>
  );
}

// Shows winner avatar(s) + label — all-participants logic was removed intentionally.
function WinnersCell({
  winners,
  isFullTie,
  participants,
}: {
  winners: GameSessionParticipant[];
  isFullTie: boolean;
  participants: GameSessionParticipant[];
}) {
  if (isFullTie) {
    const shown = participants.slice(0, 2);
    const rest = participants.length - shown.length;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <div style={{ display: "flex" }}>
          {shown.map((p, i) => (
            <Avatar key={p.personaId} participant={p} overlap={i > 0} />
          ))}
        </div>
        <span style={{ fontSize: "13px", color: "var(--color-text-primary)" }}>Full tie</span>
        {rest > 0 && (
          <span style={{ fontSize: "11px", color: "var(--color-text-tertiary)" }}>
            &amp; {rest} others
          </span>
        )}
      </div>
    );
  }

  if (winners.length === 0) {
    return (
      <span style={{ fontSize: "12px", color: "var(--color-text-tertiary)" }}>
        {participants.map((p) => p.name).join(", ")}
      </span>
    );
  }

  const otherCount = participants.length - winners.length;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <div style={{ display: "flex" }}>
        {winners.map((p, i) => (
          <Avatar key={p.personaId} participant={p} overlap={i > 0} />
        ))}
      </div>
      <span style={{ fontSize: "13px", color: "var(--color-text-primary)" }}>
        {winners.length === 1 ? winners[0].name : `${winners.length}-way tie`}
      </span>
      {otherCount > 0 && (
        <span style={{ fontSize: "11px", color: "var(--color-text-tertiary)" }}>
          &amp; {otherCount} other{otherCount !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}

function TopScoreCell({ score }: { score: number | null }) {
  if (score === null)
    return <span style={{ color: "var(--color-text-tertiary)", fontSize: "13px" }}>—</span>;
  return (
    <span style={{ fontWeight: 500, fontSize: "13px", color: "var(--color-text-primary)" }}>
      {score} pts
    </span>
  );
}

function SpreadCell({ category }: { category: SpreadCategory | null }) {
  if (!category)
    return <span style={{ color: "var(--color-text-tertiary)", fontSize: "13px" }}>—</span>;

  const cfg  = SPREAD_COLOR[category];
  const bars = SPREAD_BARS[category];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "22px" }}>
        {bars.map((bar, i) => (
          <div
            key={i}
            style={{
              width: "5px",
              height: `${bar.h}px`,
              background: cfg.bar,
              opacity: bar.opacity,
              borderRadius: "1px",
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: "11px", color: cfg.label }}>{category}</span>
    </div>
  );
}

// Status and View are now separate columns.
function StatusCell({ status }: { status: string }) {
  if (status === "running") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "3px",
          fontSize: "11px",
          fontWeight: 500,
          padding: "2px 7px",
          borderRadius: "10px",
          background: "var(--color-background-danger)",
          color: "var(--color-text-danger)",
        }}
      >
        <span
          style={{
            width: "5px",
            height: "5px",
            borderRadius: "50%",
            background: "currentColor",
            display: "inline-block",
          }}
        />
        Live
      </span>
    );
  }
  return (
    <span style={{ fontSize: "11px", color: "var(--color-text-success)" }}>Done</span>
  );
}

function ViewCell({ token }: { token: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <Link
        href={`/game/${token}`}
        style={{ fontSize: "12px", color: "var(--color-text-info)", cursor: "pointer" }}
      >
        View →
      </Link>
    </div>
  );
}

// ── Header label ──────────────────────────────────────────────────────────────

function HeaderLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: "10px",
        fontWeight: 500,
        color: "var(--color-text-tertiary)",
        textTransform: "uppercase",
        letterSpacing: "0.07em",
      }}
    >
      {children}
    </span>
  );
}

// ── Filters ───────────────────────────────────────────────────────────────────

function FilterBar({
  gameTypeFilter,
  statusFilter,
  participantSearch,
  onGameType,
  onStatus,
  onSearch,
}: {
  gameTypeFilter: string;
  statusFilter: string;
  participantSearch: string;
  onGameType: (v: string) => void;
  onStatus: (v: string) => void;
  onSearch: (v: string) => void;
}) {
  const selectStyle: React.CSSProperties = {
    fontSize: "12px",
    padding: "4px 8px",
    background: "var(--gt-bg)",
    border: "1px solid var(--gt-border)",
    borderRadius: "6px",
    color: "var(--gt-t2)",
    fontFamily: "inherit",
    cursor: "pointer",
    outline: "none",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 16px",
        borderBottom: "0.5px solid var(--color-border-secondary, var(--gt-border))",
        flexWrap: "wrap",
      }}
    >
      <select value={gameTypeFilter} onChange={(e) => onGameType(e.target.value)} style={selectStyle}>
        <option value="all">All games</option>
        {GAME_TYPES.map((gt) => (
          <option key={gt.name} value={gt.name}>
            {gt.displayName}
          </option>
        ))}
      </select>

      <select value={statusFilter} onChange={(e) => onStatus(e.target.value)} style={selectStyle}>
        <option value="all">All status</option>
        <option value="completed">Completed</option>
        <option value="running">Running</option>
      </select>

      <input
        type="text"
        placeholder="Search participants…"
        value={participantSearch}
        onChange={(e) => onSearch(e.target.value)}
        style={{ ...selectStyle, width: "180px", color: "var(--gt-t1)" }}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PastGamesView({ sessions }: { sessions: SessionListItem[] }) {
  const rows = useMemo(() => buildRows(sessions), [sessions]);

  const [gameTypeFilter, setGameTypeFilter]     = useState("all");
  const [statusFilter, setStatusFilter]         = useState("all");
  const [participantSearch, setParticipantSearch] = useState("");
  const [isMobile, setIsMobile]                 = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (gameTypeFilter !== "all" && r.gameType !== gameTypeFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (participantSearch && !r.participantNames.toLowerCase().includes(participantSearch.toLowerCase()))
        return false;
      return true;
    });
  }, [rows, gameTypeFilter, statusFilter, participantSearch]);

  const cols = isMobile ? MOBILE_COLS : DESKTOP_COLS;

  const rowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: cols,
    alignItems: "center",
    columnGap: "12px",
    padding: "10px 16px",
    borderBottom: "0.5px solid var(--color-border-tertiary, var(--gt-border))",
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--gt-bg)" }}>

      {/* Header */}
      <header
        className="shrink-0 border-b"
        style={{ borderColor: "var(--gt-border)", background: "var(--gt-surface)" }}
      >
        <div
          className="mx-auto flex items-center justify-between h-[60px] px-8"
          style={{ maxWidth: "1200px" }}
        >
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-[13px] hover:underline"
              style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}
            >
              Game Theory Lab
            </Link>
            <span style={{ color: "var(--gt-t4)", fontSize: "13px" }}>/</span>
            <span
              className="text-[15px] font-[600]"
              style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
            >
              Past Games
            </span>
          </div>
          <span style={{ color: "var(--gt-t3)", fontSize: "13px", fontFamily: "IBMPlexMono, monospace" }}>
            {filtered.length} sessions
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 py-10 px-8">
        <div
          className="mx-auto"
          style={{
            maxWidth: "1200px",
            background: "var(--gt-surface)",
            border: "1px solid var(--gt-border)",
            borderRadius: "0.5rem",
            overflow: "hidden",
          }}
        >
          <FilterBar
            gameTypeFilter={gameTypeFilter}
            statusFilter={statusFilter}
            participantSearch={participantSearch}
            onGameType={setGameTypeFilter}
            onStatus={setStatusFilter}
            onSearch={setParticipantSearch}
          />

          {/* Table header */}
          <div
            style={{
              ...rowStyle,
              padding: "0 16px 6px",
              borderBottom: "0.5px solid var(--color-border-secondary, var(--gt-border))",
              marginTop: "8px",
            }}
          >
            <HeaderLabel>Game</HeaderLabel>
            {!isMobile && <HeaderLabel>Winner &amp; participants</HeaderLabel>}
            {!isMobile && <HeaderLabel>Top score</HeaderLabel>}
            {!isMobile && <HeaderLabel>Reward spread</HeaderLabel>}
            {!isMobile && <HeaderLabel>Status</HeaderLabel>}
            <span />
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "64px 0",
                textAlign: "center",
                fontSize: "13px",
                color: "var(--gt-t4)",
              }}
            >
              No sessions match the current filters.
            </div>
          ) : (
            filtered.map((row) => (
              <div key={row.token} style={rowStyle}>
                <GameCell display={row.gameTypeDisplay} createdAt={row.createdAt} />
                {!isMobile && (
                  <WinnersCell
                    winners={row.winners}
                    isFullTie={row.isFullTie}
                    participants={row.participants}
                  />
                )}
                {!isMobile && <TopScoreCell score={row.topScore} />}
                {!isMobile && <SpreadCell category={row.spreadCategory} />}
                {!isMobile && <StatusCell status={row.status} />}
                <ViewCell token={row.token} />
              </div>
            ))
          )}

          {filtered.length > 0 && (
            <div
              style={{
                padding: "10px 16px",
                borderTop: "0.5px solid var(--color-border-tertiary, var(--gt-border))",
              }}
            >
              <span
                style={{
                  color: "var(--gt-t4)",
                  fontFamily: "IBMPlexMono, monospace",
                  fontSize: "11px",
                }}
              >
                {filtered.length} of {rows.length} sessions
              </span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
