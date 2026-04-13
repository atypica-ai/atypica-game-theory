import "server-only";

import { prisma } from "@/prisma/prisma";
import type { GameTimeline, GameSessionExtra, RoundResultEvent } from "../../types";
import type { ParsedSession, WinRecord, PersonaMeta } from "./types";
import type { LLMModelName } from "@/ai/provider";

// ── Data loading ────────────────────────────────────────────────────────────

/**
 * Load all completed sessions, optionally filtered by game type.
 * This is the only module that touches the DB — all stat functions
 * receive ParsedSession[] as input.
 */
export async function loadCompletedSessions(gameType?: string): Promise<ParsedSession[]> {
  const where: Record<string, unknown> = { status: "completed" };
  if (gameType) where.gameType = gameType;

  const sessions = await prisma.gameSession.findMany({
    where,
    select: {
      token: true,
      gameType: true,
      personaIds: true,
      timeline: true,
      extra: true,
    },
  });

  return sessions.map((s) => ({
    token: s.token,
    gameType: s.gameType,
    personaIds: Array.isArray(s.personaIds) ? (s.personaIds as number[]) : [],
    timeline: Array.isArray(s.timeline) ? (s.timeline as GameTimeline) : [],
    extra: (s.extra ?? {}) as GameSessionExtra,
  }));
}

// ── Win record computation ──────────────────────────────────────────────────

/**
 * Determine winner(s) per session and accumulate win/game records per persona.
 * Winner = participant(s) with highest cumulative payoff across all rounds.
 * Ties: all tied participants count as winners.
 */
export function computeWinRecords(sessions: ParsedSession[]): Map<number, WinRecord> {
  const records = new Map<number, WinRecord>();

  for (const session of sessions) {
    const cumulativePayoffs = new Map<number, number>();

    for (const event of session.timeline) {
      if (event.type !== "round-result") continue;
      const rr = event as RoundResultEvent;
      for (const [pidStr, payoff] of Object.entries(rr.payoffs)) {
        const pid = Number(pidStr);
        cumulativePayoffs.set(pid, (cumulativePayoffs.get(pid) ?? 0) + payoff);
      }
    }

    if (cumulativePayoffs.size === 0) continue;

    const maxPayoff = Math.max(...cumulativePayoffs.values());
    const winners = new Set(
      [...cumulativePayoffs.entries()]
        .filter(([, v]) => v === maxPayoff)
        .map(([pid]) => pid),
    );

    // Skip sessions with majority ties (winners > N/2) — not informative
    const playerCount = cumulativePayoffs.size;
    if (winners.size > playerCount / 2) continue;

    for (const pid of cumulativePayoffs.keys()) {
      const existing = records.get(pid) ?? { wins: 0, games: 0 };
      existing.games += 1;
      if (winners.has(pid)) existing.wins += 1;
      records.set(pid, existing);
    }
  }

  return records;
}

// ── Persona metadata loading ────────────────────────────────────────────────

/**
 * Load persona metadata (name, tags) for a set of persona IDs.
 * Used by leaderboard and tag-based stats.
 */
export async function loadPersonaMeta(personaIds: number[]): Promise<Map<number, PersonaMeta>> {
  if (personaIds.length === 0) return new Map();

  const personas = await prisma.persona.findMany({
    where: { id: { in: personaIds } },
    select: { id: true, name: true, extra: true, tags: true },
  });

  const map = new Map<number, PersonaMeta>();
  for (const p of personas) {
    const extra = (p.extra && typeof p.extra === "object") ? p.extra as Record<string, unknown> : {};
    map.set(p.id, {
      id: p.id,
      name: p.name,
      title: typeof extra.title === "string" ? extra.title : "",
      tags: Array.isArray(p.tags) ? (p.tags as string[]) : [],
    });
  }
  return map;
}

// ── Helper: extract model for a persona from session extra ──────────────────

export function getPersonaModel(
  session: ParsedSession,
  personaId: number,
): LLMModelName | undefined {
  return session.extra.personaModels?.[personaId] as LLMModelName | undefined;
}

// ── Helper: group sessions by game type ─────────────────────────────────────

export function groupByGameType(sessions: ParsedSession[]): Map<string, ParsedSession[]> {
  const groups = new Map<string, ParsedSession[]>();
  for (const s of sessions) {
    const arr = groups.get(s.gameType) ?? [];
    arr.push(s);
    groups.set(s.gameType, arr);
  }
  return groups;
}
