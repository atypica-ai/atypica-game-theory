"use client";

import {
  GameSessionParticipant,
  GameTimeline,
  PersonaDecisionEvent,
  PersonaDiscussionEvent,
  RoundResultEvent,
} from "@/app/(game-theory)/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { useState, useEffect, useRef } from "react";
import { ActionPill, PLAYER_COLORS } from "./PlayerCard";

// ── Data model ────────────────────────────────────────────────────────────────

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
  return PLAYER_COLORS[idx] ?? PLAYER_COLORS[0];
}

// ── Discussion message ────────────────────────────────────────────────────────

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
    <button onClick={() => setExpanded((v) => !v)} className="w-full text-left group py-2">
      <div className="flex items-start gap-3">
        <HippyGhostAvatar seed={event.personaId} className="size-6 shrink-0 mt-0.5 rounded-full" />
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-[500] block mb-1" style={{ color }}>
            {event.personaName}
          </span>
          {!expanded ? (
            <p
              className="text-[13px] truncate italic"
              style={{ color: "var(--gt-t2)", fontFamily: "'Instrument Serif', Georgia, serif" }}
            >
              &ldquo;{event.content}&rdquo;
            </p>
          ) : (
            <div>
              <p
                className="text-[14px] italic leading-relaxed"
                style={{ color: "var(--gt-t1)", fontFamily: "'Instrument Serif', Georgia, serif" }}
              >
                &ldquo;{event.content}&rdquo;
              </p>
              {event.reasoning && (
                <div
                  className="mt-3 pl-4 border-l"
                  style={{ borderColor: "var(--gt-border-md)" }}
                >
                  <p
                    className="text-[11px] uppercase mb-1"
                    style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.1em" }}
                  >
                    Inner monologue
                  </p>
                  <p
                    className="text-[13px] italic leading-relaxed"
                    style={{ color: "var(--gt-t3)", fontFamily: "'Instrument Serif', Georgia, serif" }}
                  >
                    {event.reasoning}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        <span className="shrink-0 text-[10px] mt-0.5 transition-colors" style={{ color: "var(--gt-t4)" }}>
          {expanded ? "▴" : "▾"}
        </span>
      </div>
    </button>
  );
}

// ── Round card ────────────────────────────────────────────────────────────────

function RoundCard({
  data,
  participants,
  isLive,
}: {
  data: RoundData;
  participants: GameSessionParticipant[];
  isLive: boolean;
}) {
  const [discussionOpen, setDiscussionOpen] = useState(isLive);

  const hasDiscussion = data.discussions.length > 0;
  const hasDecisions = data.decisions.length > 0;
  const hasResult = data.result !== null;

  return (
    <div className="flex gap-4">
      {/* Left — round label (lab-notebook style) */}
      <div className="shrink-0 w-10 pt-4 flex flex-col items-end gap-1.5">
        <span
          className="text-[12px] font-[600] uppercase"
          style={{
            color: isLive ? "var(--gt-blue)" : "var(--gt-t4)",
            fontFamily: "IBMPlexMono, monospace",
            letterSpacing: "0.06em",
          }}
        >
          R{data.roundId}
        </span>
        {isLive && (
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: "var(--gt-blue)" }}
          />
        )}
      </div>

      {/* Right — events */}
      <div
        className="flex-1 border rounded-[0.375rem] overflow-hidden mb-3"
        style={{ border: "1px solid var(--gt-border)", background: "var(--gt-surface)" }}
      >
        {/* Discussion section */}
        {hasDiscussion && (
          <div>
            <button
              onClick={() => setDiscussionOpen((v) => !v)}
              className="w-full flex items-center gap-3 px-5 h-11 border-b transition-colors hover:bg-[var(--gt-row-alt)]"
              style={{ borderColor: "var(--gt-border)" }}
            >
              <div className="flex -space-x-1.5 shrink-0">
                {[...new Set(data.discussions.map((d) => d.personaId))].slice(0, 5).map((pid) => (
                  <div
                    key={pid}
                    className="rounded-full border size-5 overflow-hidden"
                    style={{ borderColor: "var(--gt-surface)" }}
                  >
                    <HippyGhostAvatar seed={pid} className="size-5" />
                  </div>
                ))}
              </div>
              <span
                className="flex-1 text-[12px] text-left"
                style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.04em" }}
              >
                {data.discussions.length} {data.discussions.length === 1 ? "exchange" : "exchanges"}
              </span>
              <span className="text-[11px]" style={{ color: "var(--gt-t4)" }}>
                {discussionOpen ? "▴" : "▾"}
              </span>
            </button>
            {discussionOpen && (
              <div className="px-5 divide-y" style={{ borderColor: "var(--gt-border)" }}>
                {data.discussions.map((d, i) => (
                  <DiscussionMessage key={i} event={d} participants={participants} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Decisions */}
        {hasDecisions && (
          <div
            className={hasDiscussion ? "border-t px-5 py-4" : "px-5 py-4"}
            style={{ borderColor: "var(--gt-border)" }}
          >
            <p
              className="text-[11px] uppercase mb-3"
              style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.1em" }}
            >
              Decisions
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {data.decisions.map((d) => {
                const color = getPlayerColor(participants, d.personaId);
                const actionKey = (d.content as Record<string, string>).action ?? "";
                return (
                  <div key={d.personaId} className="flex items-center gap-2 min-w-0">
                    <HippyGhostAvatar seed={d.personaId} className="size-5 shrink-0 rounded-full" />
                    <span className="text-[13px] font-[500] truncate" style={{ color }}>
                      {d.personaName}
                    </span>
                    <ActionPill actionKey={actionKey} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Result */}
        {hasResult && data.result && (
          <div
            className="border-t px-5 py-4"
            style={{ borderColor: "var(--gt-border)", background: "var(--gt-row-alt)" }}
          >
            <p
              className="text-[11px] uppercase mb-3"
              style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.1em" }}
            >
              Result
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {participants.map((p) => {
                const payoff = data.result!.payoffs[p.personaId];
                if (payoff === undefined) return null;
                const color = getPlayerColor(participants, p.personaId);
                return (
                  <div key={p.personaId} className="flex items-center gap-2">
                    <HippyGhostAvatar seed={p.personaId} className="size-5 shrink-0 rounded-full" />
                    <span className="text-[13px] font-[500] truncate" style={{ color }}>
                      {p.name}
                    </span>
                    <span
                      className="text-[15px] font-[600] tabular-nums"
                      style={{ color: payoff >= 0 ? "var(--gt-pos)" : "var(--gt-neg)" }}
                    >
                      {payoff > 0 ? "+" : ""}{payoff}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

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
      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: "var(--gt-border-md)", animationDelay: `${i * 0.25}s` }}
            />
          ))}
        </div>
        <span
          className="text-[11px] uppercase"
          style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.12em" }}
        >
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
        className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="mx-auto px-8 py-6" style={{ maxWidth: "1200px" }}>
        {rounds.map((roundData) => (
          <RoundCard
            key={roundData.roundId}
            data={roundData}
            participants={participants}
            isLive={roundData.roundId === activeRoundId && roundData.result === null}
          />
        ))}
        </div>
      </div>

      {userScrolled && (
        <button
          onClick={() => {
            setUserScrolled(false);
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }}
          className="shrink-0 h-7 flex items-center justify-center gap-1.5 border-t text-[11px] transition-colors hover:bg-[var(--gt-row-alt)]"
          style={{ borderColor: "var(--gt-border)", color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}
        >
          ↓ Latest
        </button>
      )}
    </div>
  );
}
