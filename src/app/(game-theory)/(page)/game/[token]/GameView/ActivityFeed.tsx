"use client";

import {
  GameSessionParticipant,
  GameTimeline,
  PersonaDecisionEvent,
  PersonaDiscussionEvent,
  RoundResultEvent,
  SystemEvent,
} from "@/app/(game-theory)/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { useEffect, useRef, useState } from "react";
import { ACTION_STYLE, PLAYER_COLORS } from "./PlayerCard";

// ── Helpers ────────────────────────────────────────────────────────────────────

function getPlayerIndex(participants: GameSessionParticipant[], personaId: number): number {
  return participants.findIndex((p) => p.personaId === personaId);
}

function getPlayerColor(participants: GameSessionParticipant[], personaId: number): string {
  const idx = getPlayerIndex(participants, personaId);
  return PLAYER_COLORS[idx] ?? "#ffffff";
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ReasoningBlock({ text }: { text: string }) {
  return (
    <div
      className="mt-2 p-3 border border-white/[0.04]"
      style={{ background: "rgba(27,255,27,0.015)" }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-1 h-1 rounded-full" style={{ backgroundColor: "rgba(27,255,27,0.35)" }} />
        <span
          className="font-IBMPlexMono text-[8px] tracking-[0.2em] uppercase"
          style={{ color: "rgba(27,255,27,0.35)" }}
        >
          Intercepted · Private
        </span>
      </div>
      <p className="font-InstrumentSerif italic text-[13px] leading-relaxed text-zinc-500">
        {text}
      </p>
    </div>
  );
}

function RoundSeparator({ round, isResult }: { round: number; isResult?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.06)" }} />
      <span className="font-IBMPlexMono text-[8px] tracking-[0.2em] uppercase text-zinc-600 shrink-0">
        Round {round}{isResult ? " · Result" : ""}
      </span>
      <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.06)" }} />
    </div>
  );
}

function DiscussionItem({
  event,
  participants,
}: {
  event: PersonaDiscussionEvent;
  participants: GameSessionParticipant[];
}) {
  const color = getPlayerColor(participants, event.personaId);

  return (
    <div className="flex gap-2.5">
      <div className="shrink-0 mt-0.5">
        <HippyGhostAvatar seed={event.personaId} className="size-6" />
      </div>
      <div className="flex-1 min-w-0">
        <span
          className="font-EuclidCircularA text-[11px] font-medium tracking-[0.02em] uppercase"
          style={{ color }}
        >
          {event.personaName}
        </span>
        <p className="font-InstrumentSerif italic text-[14px] leading-relaxed text-zinc-200 mt-0.5">
          &ldquo;{event.content}&rdquo;
        </p>
        {event.reasoning && <ReasoningBlock text={event.reasoning} />}
      </div>
    </div>
  );
}

function DecisionItem({
  event,
  participants,
}: {
  event: PersonaDecisionEvent;
  participants: GameSessionParticipant[];
}) {
  const color = getPlayerColor(participants, event.personaId);
  const actionKey = (event.content as Record<string, string>).action ?? "";
  const actionStyle = ACTION_STYLE[actionKey];

  return (
    <div className="flex items-center gap-2.5">
      <HippyGhostAvatar seed={event.personaId} className="size-5 shrink-0" />
      <span className="font-EuclidCircularA text-xs font-medium" style={{ color }}>
        {event.personaName}
      </span>
      <span className="text-zinc-700 font-IBMPlexMono text-[9px]">→</span>
      <div
        className="inline-flex items-center px-2 py-0.5 border"
        style={
          actionStyle
            ? { borderColor: `${actionStyle.color}35`, background: actionStyle.bg }
            : { borderColor: "rgba(255,255,255,0.08)", background: "transparent" }
        }
      >
        <span
          className="font-IBMPlexMono text-[9px] tracking-[0.14em] uppercase font-medium"
          style={{ color: actionStyle?.color ?? "#71717a" }}
        >
          {(actionStyle?.label ?? actionKey) || "—"}
        </span>
      </div>
      {event.reasoning && (
        <span className="font-IBMPlexMono text-[8px] text-zinc-700 ml-1">· reasoned</span>
      )}
    </div>
  );
}

function RoundResultItem({
  event,
  participants,
}: {
  event: RoundResultEvent;
  participants: GameSessionParticipant[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <RoundSeparator round={event.round} isResult />
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {participants.map((p) => {
          const payoff = event.payoffs[p.personaId];
          if (payoff === undefined) return null;
          const color = getPlayerColor(participants, p.personaId);
          return (
            <div key={p.personaId} className="flex items-center gap-1.5">
              <HippyGhostAvatar seed={p.personaId} className="size-4 shrink-0" />
              <span className="font-EuclidCircularA text-[11px] text-zinc-500 truncate flex-1 min-w-0">
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
  );
}

function SystemItem({ event }: { event: SystemEvent }) {
  return (
    <div className="flex items-center gap-3 py-0.5">
      <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.04)" }} />
      <span className="font-IBMPlexMono text-[8px] tracking-[0.18em] uppercase text-zinc-700 shrink-0">
        {event.content}
      </span>
      <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.04)" }} />
    </div>
  );
}

// ── Main feed ──────────────────────────────────────────────────────────────────

export interface ActivityFeedProps {
  events: GameTimeline;
  participants: GameSessionParticipant[];
  displayRoundId: number | null;
  activeRoundId: number | null;
}

export function ActivityFeed({
  events,
  participants,
  displayRoundId,
  activeRoundId,
}: ActivityFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [userScrolled, setUserScrolled] = useState(false);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (!userScrolled && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length, userScrolled]);

  // Detect manual scroll
  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setUserScrolled(!atBottom);
  }

  // Filter events when browsing a specific round
  const filteredEvents = displayRoundId !== null
    ? events.filter((e) => {
        if (e.type === "system") return false;
        if ("round" in e) return e.round === displayRoundId;
        return false;
      })
    : events;

  // Group events with round separators inserted
  const items: Array<{ type: "separator"; round: number } | { type: "event"; event: typeof filteredEvents[number] }> = [];

  let lastRound: number | null = null;
  for (const event of filteredEvents) {
    if ("round" in event && event.round !== undefined && event.type !== "round-result") {
      if (event.round !== lastRound) {
        items.push({ type: "separator", round: event.round });
        lastRound = event.round;
      }
    }
    items.push({ type: "event", event });
  }

  if (items.length === 0) {
    return (
      <div className="w-[320px] shrink-0 border-l border-white/[0.05] flex items-center justify-center">
        <span className="font-IBMPlexMono text-[9px] tracking-[0.18em] uppercase text-zinc-700">
          Awaiting activity
        </span>
      </div>
    );
  }

  return (
    <div
      className="w-[320px] shrink-0 border-l border-white/[0.05] flex flex-col overflow-hidden"
    >
      {/* Feed header */}
      <div className="shrink-0 h-9 flex items-center px-5 border-b border-white/[0.04]">
        <span className="font-IBMPlexMono text-[8px] tracking-[0.2em] uppercase text-zinc-700">
          {displayRoundId !== null ? `Round ${displayRoundId} · Log` : "Activity Log"}
        </span>
      </div>

      {/* Scrollable events */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, i) => {
          if (item.type === "separator") {
            return <RoundSeparator key={`sep-${item.round}`} round={item.round} />;
          }
          const { event } = item;
          if (event.type === "system") return <SystemItem key={i} event={event} />;
          if (event.type === "persona-discussion")
            return <DiscussionItem key={i} event={event} participants={participants} />;
          if (event.type === "persona-decision")
            return <DecisionItem key={i} event={event} participants={participants} />;
          if (event.type === "round-result")
            return <RoundResultItem key={i} event={event} participants={participants} />;
          return null;
        })}

        {/* Live indicator when game is running */}
        {activeRoundId !== null && displayRoundId === null && (
          <div className="flex items-center gap-2 py-1">
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#1bff1b]"
              style={{ animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}
            />
            <span className="font-IBMPlexMono text-[8px] tracking-[0.18em] uppercase text-zinc-700">
              Live
            </span>
          </div>
        )}
      </div>

      {/* Scroll-to-bottom button when user has scrolled up */}
      {userScrolled && (
        <button
          onClick={() => {
            setUserScrolled(false);
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
          }}
          className="shrink-0 h-7 flex items-center justify-center gap-2 border-t border-white/[0.05] font-IBMPlexMono text-[8px] tracking-[0.16em] uppercase text-zinc-600 hover:text-zinc-300 transition-colors"
        >
          ↓ Jump to latest
        </button>
      )}
    </div>
  );
}
