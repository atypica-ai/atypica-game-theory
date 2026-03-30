"use client";

import {
  GameSessionParticipant,
  GameTimeline,
  PersonaDecisionEvent,
  PersonaDiscussionEvent,
  RoundResultEvent,
} from "@/app/(game-theory)/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ACTION_STYLE, PLAYER_COLORS } from "./PlayerCard";

// ── Data model ─────────────────────────────────────────────────────────────────

type RoundData = {
  roundId: number;
  discussions: PersonaDiscussionEvent[];
  decisions: PersonaDecisionEvent[];
  result: RoundResultEvent | null;
};

function groupEventsByRound(events: GameTimeline): RoundData[] {
  const map = new Map<number, RoundData>();

  for (const e of events) {
    if (e.type === "persona-discussion") {
      const r = map.get(e.round) ?? { roundId: e.round, discussions: [], decisions: [], result: null };
      r.discussions.push(e);
      map.set(e.round, r);
    } else if (e.type === "persona-decision") {
      const r = map.get(e.round) ?? { roundId: e.round, discussions: [], decisions: [], result: null };
      r.decisions.push(e);
      map.set(e.round, r);
    } else if (e.type === "round-result") {
      const r = map.get(e.round) ?? { roundId: e.round, discussions: [], decisions: [], result: null };
      r.result = e;
      map.set(e.round, r);
    }
  }

  return Array.from(map.values()).sort((a, b) => a.roundId - b.roundId);
}

function getPlayerColor(participants: GameSessionParticipant[], personaId: number): string {
  const idx = participants.findIndex((p) => p.personaId === personaId);
  return PLAYER_COLORS[idx] ?? "#ffffff";
}

// ── Reasoning block ─────────────────────────────────────────────────────────────

function ReasoningBlock({ text }: { text: string }) {
  return (
    <div className="mt-2.5 pl-3 border-l-2" style={{ borderColor: "rgba(27,255,27,0.15)" }}>
      <p className="font-IBMPlexMono text-[8px] tracking-[0.18em] uppercase mb-1.5"
        style={{ color: "rgba(27,255,27,0.3)" }}>
        Inner monologue
      </p>
      <p className="font-InstrumentSerif italic text-[13px] leading-relaxed"
        style={{ color: "rgba(27,255,27,0.35)" }}>
        {text}
      </p>
    </div>
  );
}

// ── Single discussion message (collapsible) ────────────────────────────────────

function DiscussionMessage({
  event,
  participants,
}: {
  event: PersonaDiscussionEvent;
  participants: GameSessionParticipant[];
}) {
  const [expanded, setExpanded] = useState(false);
  const color = getPlayerColor(participants, event.personaId);

  return (
    <button
      onClick={() => setExpanded((v) => !v)}
      className="w-full text-left group py-2"
    >
      <div className="flex items-start gap-2.5">
        <HippyGhostAvatar seed={event.personaId} className="size-5 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <span
            className="font-EuclidCircularA text-[11px] font-medium"
            style={{ color }}
          >
            {event.personaName}
          </span>
          <AnimatePresence mode="wait" initial={false}>
            {!expanded ? (
              <motion.p
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="font-InstrumentSerif italic text-[13px] leading-snug text-zinc-600 truncate mt-0.5"
              >
                &ldquo;{event.content}&rdquo;
              </motion.p>
            ) : (
              <motion.div
                key="full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="mt-0.5"
              >
                <p className="font-InstrumentSerif italic text-[14px] leading-relaxed text-zinc-200">
                  &ldquo;{event.content}&rdquo;
                </p>
                {event.reasoning && <ReasoningBlock text={event.reasoning} />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <span
          className="shrink-0 font-IBMPlexMono text-[9px] text-zinc-700 group-hover:text-zinc-500 transition-colors mt-0.5 leading-none"
        >
          {expanded ? "▴" : "▾"}
        </span>
      </div>
    </button>
  );
}

// ── Round card ─────────────────────────────────────────────────────────────────

function RoundCard({
  data,
  participants,
  isLive,
}: {
  data: RoundData;
  participants: GameSessionParticipant[];
  isLive: boolean;
}) {
  // Discussion open for live rounds; collapsed for completed
  const [discussionOpen, setDiscussionOpen] = useState(isLive);

  const hasDiscussion = data.discussions.length > 0;
  const hasDecisions = data.decisions.length > 0;
  const hasResult = data.result !== null;

  return (
    <div className="border border-white/[0.06]" style={{ background: "#0b0b0e" }}>
      {/* ── Card header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 h-9 border-b border-white/[0.04]">
        <span className="font-IBMPlexMono text-[9px] tracking-[0.22em] uppercase text-zinc-500">
          Round {data.roundId}
        </span>
        {isLive ? (
          <div className="flex items-center gap-1.5">
            <motion.span
              className="w-1 h-1 rounded-full"
              style={{ backgroundColor: "#1bff1b" }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            />
            <span className="font-IBMPlexMono text-[8px] tracking-[0.16em] uppercase"
              style={{ color: "rgba(27,255,27,0.6)" }}>
              Live
            </span>
          </div>
        ) : hasResult ? (
          <span className="font-IBMPlexMono text-[8px] tracking-[0.14em] uppercase text-zinc-700">
            Complete
          </span>
        ) : null}
      </div>

      {/* ── Discussion toggle ─────────────────────────────────── */}
      {hasDiscussion && (
        <div>
          <button
            onClick={() => setDiscussionOpen((v) => !v)}
            className="w-full flex items-center gap-3 px-5 h-9 hover:bg-white/[0.02] transition-colors border-b border-white/[0.03]"
          >
            {/* Stacked avatars */}
            <div className="flex -space-x-1.5 shrink-0">
              {[...new Set(data.discussions.map((d) => d.personaId))].slice(0, 5).map((pid) => (
                <div
                  key={pid}
                  className="rounded-full border border-[#0b0b0e] size-4 overflow-hidden"
                >
                  <HippyGhostAvatar seed={pid} className="size-4" />
                </div>
              ))}
            </div>
            <span className="flex-1 font-IBMPlexMono text-[8px] tracking-[0.14em] uppercase text-zinc-600 text-left">
              {data.discussions.length} {data.discussions.length === 1 ? "exchange" : "exchanges"}
            </span>
            <span className="font-IBMPlexMono text-[9px] text-zinc-700 shrink-0">
              {discussionOpen ? "▴" : "▾"}
            </span>
          </button>

          <AnimatePresence initial={false}>
            {discussionOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="px-5 divide-y divide-white/[0.03]">
                  {data.discussions.map((d, i) => (
                    <DiscussionMessage key={i} event={d} participants={participants} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Decisions grid ────────────────────────────────────── */}
      {hasDecisions && (
        <div className="px-5 py-3 border-t border-white/[0.04]">
          <p className="font-IBMPlexMono text-[8px] tracking-[0.18em] uppercase text-zinc-700 mb-2.5">
            Decisions
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            {data.decisions.map((d) => {
              const color = getPlayerColor(participants, d.personaId);
              const actionKey = (d.content as Record<string, string>).action ?? "";
              const actionStyle = ACTION_STYLE[actionKey];
              return (
                <div key={d.personaId} className="flex items-center gap-1.5 min-w-0">
                  <HippyGhostAvatar seed={d.personaId} className="size-4 shrink-0" />
                  <span
                    className="font-EuclidCircularA text-[10px] font-medium truncate flex-1 min-w-0"
                    style={{ color }}
                  >
                    {d.personaName}
                  </span>
                  <div
                    className="inline-flex items-center px-1.5 py-0.5 border shrink-0"
                    style={
                      actionStyle
                        ? { borderColor: `${actionStyle.color}35`, background: actionStyle.bg }
                        : { borderColor: "rgba(255,255,255,0.08)", background: "transparent" }
                    }
                  >
                    <span
                      className="font-IBMPlexMono text-[8px] tracking-[0.1em] uppercase"
                      style={{ color: actionStyle?.color ?? "#71717a" }}
                    >
                      {(actionStyle?.label ?? actionKey) || "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Round result ──────────────────────────────────────── */}
      {hasResult && data.result && (
        <div
          className="px-5 py-3 border-t border-white/[0.04]"
          style={{ background: "rgba(27,255,27,0.02)" }}
        >
          <p
            className="font-IBMPlexMono text-[8px] tracking-[0.18em] uppercase mb-2.5"
            style={{ color: "rgba(27,255,27,0.4)" }}
          >
            Result
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {participants.map((p) => {
              const payoff = data.result!.payoffs[p.personaId];
              if (payoff === undefined) return null;
              const color = getPlayerColor(participants, p.personaId);
              return (
                <div key={p.personaId} className="flex items-center gap-1.5">
                  <HippyGhostAvatar seed={p.personaId} className="size-4 shrink-0" />
                  <span
                    className="font-EuclidCircularA text-[10px] truncate flex-1 min-w-0"
                    style={{ color }}
                  >
                    {p.name}
                  </span>
                  <span
                    className="font-EuclidCircularA text-sm font-light tabular-nums shrink-0"
                    style={{ color: payoff > 0 ? "#1bff1b" : "#ef4444" }}
                  >
                    +{payoff}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export interface GameFeedProps {
  events: GameTimeline;
  participants: GameSessionParticipant[];
  displayRoundId: number | null;
  activeRoundId: number | null;
}

export function GameFeed({
  events,
  participants,
  displayRoundId,
  activeRoundId,
}: GameFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [userScrolled, setUserScrolled] = useState(false);

  // Auto-scroll to bottom on new events
  useEffect(() => {
    if (!userScrolled && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length, userScrolled]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setUserScrolled(el.scrollHeight - el.scrollTop - el.clientHeight > 40);
  }

  const allRounds = groupEventsByRound(events);
  const rounds =
    displayRoundId !== null ? allRounds.filter((r) => r.roundId === displayRoundId) : allRounds;

  if (rounds.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-zinc-700"
              animate={{ opacity: [0.15, 1, 0.15] }}
              transition={{ duration: 1.4, delay: i * 0.25, repeat: Infinity }}
            />
          ))}
        </div>
        <span className="font-IBMPlexMono text-[9px] tracking-[0.22em] uppercase text-zinc-700">
          Awaiting activity
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {rounds.map((roundData) => (
          <RoundCard
            key={roundData.roundId}
            data={roundData}
            participants={participants}
            isLive={roundData.roundId === activeRoundId && roundData.result === null}
          />
        ))}
      </div>

      {/* Jump to latest button */}
      {userScrolled && (
        <button
          onClick={() => {
            setUserScrolled(false);
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }}
          className="shrink-0 h-7 flex items-center justify-center gap-1.5 border-t border-white/[0.05] font-IBMPlexMono text-[8px] tracking-[0.16em] uppercase text-zinc-600 hover:text-zinc-300 transition-colors"
        >
          ↓ Latest
        </button>
      )}
    </div>
  );
}
