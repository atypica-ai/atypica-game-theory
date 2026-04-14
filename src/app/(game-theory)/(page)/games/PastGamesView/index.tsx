"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SessionListItem } from "@/app/(game-theory)/actions";
import { gameTypeRegistry } from "@/app/(game-theory)/gameTypes";
import { GameType } from "@/app/(game-theory)/gameTypes/types";
import { GameSessionParticipant } from "@/app/(game-theory)/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { useIsMobile } from "@/lib/useIsMobile";
import { NavBar } from "../../components/NavBar";
import {
  computeOutcome,
  classifySpread,
  formatRelativeTime,
  type SpreadCategory,
} from "./utils";

const GAME_TYPES = Object.values(gameTypeRegistry) as unknown as GameType[];

// ── Spread config ─────────────────────────────────────────────────────────────

const SPREAD_BARS: Record<SpreadCategory, Array<{ h: number; opacity: number }>> = {
  dominant: [
    { h: 3, opacity: 0.30 },
    { h: 4, opacity: 0.35 },
    { h: 3, opacity: 0.30 },
    { h: 5, opacity: 0.40 },
    { h: 20, opacity: 1.0 },
  ],
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
  even:     { bar: "#185FA5", label: "var(--gt-t3)" },
};

// ── Grid: 5 columns matching reference layout ────────────────────────────────

const COLS = "1.2fr 1.5fr 0.8fr 1fr 1fr";

// ── Precomputed row data ─────────────────────────────────────────────────────

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

// ── Cell components ──────────────────────────────────────────────────────────

function GameCell({ display, createdAt }: { display: string; createdAt: string }) {
  return (
    <div>
      <div style={{ fontWeight: 500, fontSize: "13px", color: "var(--gt-t1)" }}>
        {display}
      </div>
      <div style={{ fontSize: "11px", color: "var(--gt-t4)", marginTop: "1px" }}>
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
        width: "20px",
        height: "20px",
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        ...(overlap
          ? { marginLeft: "-6px", boxShadow: "0 0 0 1.5px var(--gt-surface)" }
          : {}),
      }}
    >
      <HippyGhostAvatar seed={participant.personaId} className="size-full" />
    </div>
  );
}

function ParticipantsCell({
  status,
  winners,
  isFullTie,
  participants,
}: {
  status: string;
  winners: GameSessionParticipant[];
  isFullTie: boolean;
  participants: GameSessionParticipant[];
}) {
  // Live / not completed — no avatar, just text
  if (status !== "completed") {
    const first = participants[0]?.name ?? "—";
    const rest = participants.length - 1;
    return (
      <span style={{ fontSize: "12px", color: "var(--gt-t4)" }}>
        {first}{rest > 0 && ` & ${rest} others`}
      </span>
    );
  }

  // Full tie
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
        <span style={{ fontSize: "13px", color: "var(--gt-t1)" }}>Full tie</span>
        {rest > 0 && (
          <span style={{ fontSize: "11px", color: "var(--gt-t4)" }}>
            &amp; {rest} others
          </span>
        )}
      </div>
    );
  }

  // No winners determined
  if (winners.length === 0) {
    const first = participants[0]?.name ?? "—";
    const rest = participants.length - 1;
    return (
      <span style={{ fontSize: "12px", color: "var(--gt-t4)" }}>
        {first}{rest > 0 && ` & ${rest} others`}
      </span>
    );
  }

  // Winner(s)
  const otherCount = participants.length - winners.length;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <div style={{ display: "flex" }}>
        {winners.map((p, i) => (
          <Avatar key={p.personaId} participant={p} overlap={i > 0} />
        ))}
      </div>
      <span style={{ fontSize: "13px", color: "var(--gt-t1)" }}>
        {winners.length === 1 ? winners[0].name : `${winners.length}-way tie`}
      </span>
      {otherCount > 0 && (
        <span style={{ fontSize: "11px", color: "var(--gt-t4)" }}>
          &amp; {otherCount} other{otherCount !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}

function TopScoreCell({ score }: { score: number | null }) {
  if (score === null)
    return <span style={{ color: "var(--gt-t4)", fontSize: "13px" }}>—</span>;
  return (
    <span style={{ fontWeight: 500, fontSize: "13px", color: "var(--gt-t1)" }}>
      {score} pts
    </span>
  );
}

function SpreadCell({ category }: { category: SpreadCategory | null }) {
  if (!category)
    return <span style={{ color: "var(--gt-t4)", fontSize: "13px" }}>—</span>;

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

function StatusActionCell({ status, token }: { status: string; token: string }) {
  if (status === "running") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "3px",
            fontSize: "11px",
            fontWeight: 500,
            padding: "2px 7px",
            borderRadius: "10px",
            background: "var(--gt-neg-bg)",
            color: "var(--gt-neg)",
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
        <Link
          href={`/game/${token}`}
          style={{ fontSize: "12px", color: "var(--gt-blue)", cursor: "pointer" }}
        >
          View →
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
      <span style={{ fontSize: "11px", color: "var(--gt-pos)" }}>Done</span>
      <Link
        href={`/game/${token}`}
        style={{ fontSize: "12px", color: "var(--gt-blue)", cursor: "pointer" }}
      >
        View →
      </Link>
    </div>
  );
}

// ── Filters ──────────────────────────────────────────────────────────────────

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
        borderBottom: "0.5px solid var(--gt-border)",
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
        style={{ ...selectStyle, flex: 1, minWidth: "120px", color: "var(--gt-t1)" }}
      />
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function PastGamesView({ sessions }: { sessions: SessionListItem[] }) {
  const rows = useMemo(() => buildRows(sessions), [sessions]);

  const [gameTypeFilter, setGameTypeFilter]     = useState("all");
  const [statusFilter, setStatusFilter]         = useState("all");
  const [participantSearch, setParticipantSearch] = useState("");
  const isMobile = useIsMobile();
  const [expandedToken, setExpandedToken]       = useState<string | null>(null);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (gameTypeFilter !== "all" && r.gameType !== gameTypeFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (participantSearch && !r.participantNames.toLowerCase().includes(participantSearch.toLowerCase()))
        return false;
      return true;
    });
  }, [rows, gameTypeFilter, statusFilter, participantSearch]);

  const rowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr auto" : COLS,
    alignItems: "center",
    columnGap: "12px",
    padding: "10px 16px",
    borderBottom: "0.5px solid var(--gt-border)",
    fontSize: "13px",
    color: "var(--gt-t1)",
  };

  const headerStyle: React.CSSProperties = {
    ...rowStyle,
    padding: "0 16px 6px",
    borderBottom: "0.5px solid var(--gt-border-md)",
    marginTop: "8px",
    fontSize: "10px",
    fontWeight: 500,
    color: "var(--gt-t4)",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--gt-bg)" }}>

      <NavBar />

      {/* Content */}
      <main className="flex-1 py-10 px-4 sm:px-8">
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
          <div style={headerStyle}>
            <span>Game</span>
            {!isMobile && <span>Winner &amp; participants</span>}
            {!isMobile && <span>Top score</span>}
            {!isMobile && <span>Reward spread</span>}
            {!isMobile && <span style={{ textAlign: "right" }}></span>}
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
            filtered.map((row) => {
              if (isMobile) {
                const isExpanded = expandedToken === row.token;
                return (
                  <div key={row.token} style={{ borderBottom: "0.5px solid var(--gt-border)" }}>
                    {/* Tappable summary row */}
                    <button
                      onClick={() => setExpandedToken(isExpanded ? null : row.token)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        padding: "10px 16px",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <GameCell display={row.gameTypeDisplay} createdAt={row.createdAt} />
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {row.status === "running" && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              fontSize: "11px",
                              fontWeight: 500,
                              padding: "2px 7px",
                              borderRadius: "10px",
                              background: "var(--gt-neg-bg)",
                              color: "var(--gt-neg)",
                            }}
                          >
                            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
                            Live
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: "13px",
                            color: "var(--gt-t4)",
                            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                            transition: "transform 0.15s",
                            display: "inline-block",
                          }}
                        >
                          ›
                        </span>
                      </div>
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div
                        style={{
                          padding: "0 16px 12px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: "10px", color: "var(--gt-t4)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em" }}>Winner</span>
                          <span style={{ fontSize: "13px" }}>
                            <ParticipantsCell status={row.status} winners={row.winners} isFullTie={row.isFullTie} participants={row.participants} />
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: "10px", color: "var(--gt-t4)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em" }}>Top score</span>
                          <TopScoreCell score={row.topScore} />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: "10px", color: "var(--gt-t4)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em" }}>Spread</span>
                          <SpreadCell category={row.spreadCategory} />
                        </div>
                        <div style={{ marginTop: "4px" }}>
                          <Link
                            href={`/game/${row.token}`}
                            style={{ fontSize: "12px", color: "var(--gt-blue)" }}
                          >
                            View game →
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div key={row.token} style={rowStyle}>
                  <GameCell display={row.gameTypeDisplay} createdAt={row.createdAt} />
                  <ParticipantsCell
                    status={row.status}
                    winners={row.winners}
                    isFullTie={row.isFullTie}
                    participants={row.participants}
                  />
                  <TopScoreCell score={row.topScore} />
                  <SpreadCell category={row.spreadCategory} />
                  <StatusActionCell status={row.status} token={row.token} />
                </div>
              );
            })
          )}

          {filtered.length > 0 && (
            <div style={{ padding: "10px 16px" }}>
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
