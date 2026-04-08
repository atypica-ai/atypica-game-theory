"use client";

import {
  submitHumanDecision,
  submitHumanDiscussion,
} from "@/app/(game-theory)/actions";
import {
  GameSessionParticipant,
  GameTimeline,
  HumanDecisionPendingEvent,
  HumanDiscussionPendingEvent,
  PersonaDiscussionEvent,
} from "@/app/(game-theory)/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PLAYER_COLORS } from "./PlayerCard";

// ── Action configuration ──────────────────────────────────────────────────────

type ActionConfig = {
  key: string;
  label: string;
  hint: string;
  color: string;
  bg: string;
  border: string;
};

const GAME_ACTION_CONFIGS: Record<string, ActionConfig[]> = {
  "prisoner-dilemma": [
    {
      key: "cooperate",
      label: "Cooperate",
      hint: "Mutual gain — if both cooperate",
      color: "var(--gt-pos)",
      bg: "var(--gt-pos-bg)",
      border: "hsl(125 49% 43% / 0.3)",
    },
    {
      key: "defect",
      label: "Defect",
      hint: "Max gain — if they cooperate",
      color: "var(--gt-neg)",
      bg: "var(--gt-neg-bg)",
      border: "hsl(2 63% 54% / 0.3)",
    },
  ],
  "stag-hunt": [
    {
      key: "stag",
      label: "Stag",
      hint: "High reward — requires enough hunters",
      color: "var(--gt-blue)",
      bg: "var(--gt-blue-bg)",
      border: "var(--gt-blue-border)",
    },
    {
      key: "rabbit",
      label: "Rabbit",
      hint: "Safe fallback — lower but guaranteed",
      color: "var(--gt-warn)",
      bg: "var(--gt-warn-bg)",
      border: "hsl(48 93% 45% / 0.3)",
    },
  ],
  "golden-ball": [
    {
      key: "split",
      label: "Split",
      hint: "Share the prize equally",
      color: "var(--gt-pos)",
      bg: "var(--gt-pos-bg)",
      border: "hsl(125 49% 43% / 0.3)",
    },
    {
      key: "steal",
      label: "Steal",
      hint: "Take everything — if they split",
      color: "var(--gt-neg)",
      bg: "var(--gt-neg-bg)",
      border: "hsl(2 63% 54% / 0.3)",
    },
  ],
  "volunteer-dilemma": [
    {
      key: "volunteer",
      label: "Volunteer",
      hint: "Bear the cost for the group",
      color: "var(--gt-pos)",
      bg: "var(--gt-pos-bg)",
      border: "hsl(125 49% 43% / 0.3)",
    },
    {
      key: "free-ride",
      label: "Free-ride",
      hint: "Benefit without contributing",
      color: "var(--gt-neg)",
      bg: "var(--gt-neg-bg)",
      border: "hsl(2 63% 54% / 0.3)",
    },
  ],
  "trolley-problem": [
    {
      key: "pull",
      label: "Pull",
      hint: "Act — redirect harm to one",
      color: "var(--gt-neg)",
      bg: "var(--gt-neg-bg)",
      border: "hsl(2 63% 54% / 0.3)",
    },
    {
      key: "dont-pull",
      label: "Don't pull",
      hint: "Inaction — harm stays on many",
      color: "var(--gt-warn)",
      bg: "var(--gt-warn-bg)",
      border: "hsl(48 93% 45% / 0.3)",
    },
  ],
};

// ── Timer hook ────────────────────────────────────────────────────────────────

function useCountdown(expiresAt: number): { secondsLeft: number; progress: number } {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const totalMs = 30_000;
  const msLeft = Math.max(0, expiresAt - now);
  const secondsLeft = Math.ceil(msLeft / 1000);
  const progress = msLeft / totalMs; // 1 → 0

  return { secondsLeft, progress };
}

// ── Discussion dialog ─────────────────────────────────────────────────────────

function DiscussionDialog({
  event,
  token,
  participants,
  recentDiscussions,
  onSubmitted,
}: {
  event: HumanDiscussionPendingEvent;
  token: string;
  participants: GameSessionParticipant[];
  recentDiscussions: PersonaDiscussionEvent[];
  onSubmitted: () => void;
}) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { secondsLeft, progress } = useCountdown(event.expiresAt);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Auto-submit on timeout
  useEffect(() => {
    if (secondsLeft === 0 && !submitting) {
      void handleSubmit(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  const handleSubmit = useCallback(async (skip = false) => {
    if (submitting) return;
    setSubmitting(true);
    const content = skip ? "" : text;
    await submitHumanDiscussion(token, content, event.requestId);
    onSubmitted();
  }, [submitting, text, token, event.requestId, onSubmitted]);

  return (
    <div className="flex flex-col" style={{ maxHeight: "80vh" }}>
      {/* Context: recent messages */}
      {recentDiscussions.length > 0 && (
        <div
          className="overflow-y-auto flex-shrink max-h-[200px] border-b"
          style={{ borderColor: "var(--gt-border)" }}
        >
          {recentDiscussions.map((d, i) => {
            const idx = participants.findIndex((p) => p.personaId === d.personaId);
            const color = PLAYER_COLORS[idx] ?? PLAYER_COLORS[0];
            return (
              <div
                key={i}
                className="flex gap-3 px-6 py-3 border-b last:border-b-0"
                style={{ borderColor: "var(--gt-border)" }}
              >
                <HippyGhostAvatar seed={d.personaId} className="size-7 rounded-full shrink-0 mt-0.5 opacity-80" />
                <div className="flex-1 min-w-0">
                  <span className="text-[12px] font-[500] block mb-0.5" style={{ color }}>
                    {d.personaName}
                  </span>
                  <p
                    className="text-[13px] leading-relaxed"
                    style={{
                      color: "var(--gt-t3)",
                      fontFamily: "'Instrument Serif', Georgia, serif",
                    }}
                  >
                    &ldquo;{d.content}&rdquo;
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Input area */}
      <div className="px-6 pt-5 pb-4 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] uppercase"
            style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.1em" }}
          >
            Round {event.round} — your move
          </span>
        </div>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              void handleSubmit(false);
            }
          }}
          placeholder="Say something to the table…"
          rows={3}
          className="w-full resize-none bg-transparent outline-none text-[15px] leading-relaxed"
          style={{
            color: "var(--gt-t1)",
            fontFamily: "'Instrument Serif', Georgia, serif",
            caretColor: "var(--gt-blue)",
            borderBottom: "1px solid var(--gt-border-md)",
            paddingBottom: "8px",
          }}
        />

        {/* Timer bar */}
        <div className="h-0.5 w-full rounded-full overflow-hidden" style={{ background: "var(--gt-border)" }}>
          <div
            className="h-full transition-all"
            style={{
              width: `${progress * 100}%`,
              background: progress > 0.4 ? "var(--gt-blue)" : progress > 0.15 ? "var(--gt-warn)" : "var(--gt-neg)",
              transition: "width 0.25s linear, background 0.5s",
            }}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => void handleSubmit(true)}
            disabled={submitting}
            className="text-[12px] transition-opacity hover:opacity-70"
            style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace" }}
          >
            say nothing ({secondsLeft}s)
          </button>
          <button
            onClick={() => void handleSubmit(false)}
            disabled={submitting || !text.trim()}
            className="h-8 px-5 text-[13px] font-[500] transition-opacity"
            style={{
              background: text.trim() ? "var(--gt-blue)" : "var(--gt-border-md)",
              color: text.trim() ? "white" : "var(--gt-t4)",
              borderRadius: "0.375rem",
              cursor: text.trim() ? "pointer" : "not-allowed",
              letterSpacing: "var(--gt-tracking-tight)",
            }}
          >
            {submitting ? "Sending…" : "Send ↵"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Decision dialog ───────────────────────────────────────────────────────────

function DecisionDialog({
  event,
  token,
  gameTypeName,
  currentScores,
  participants,
  onSubmitted,
}: {
  event: HumanDecisionPendingEvent;
  token: string;
  gameTypeName: string;
  currentScores: Record<number, number>;
  participants: GameSessionParticipant[];
  onSubmitted: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [numericValue, setNumericValue] = useState("");
  const { secondsLeft, progress } = useCountdown(event.expiresAt);

  const actionConfigs = GAME_ACTION_CONFIGS[gameTypeName];

  // Auto-submit on timeout
  useEffect(() => {
    if (secondsLeft === 0 && !submitting) {
      // Default to first action
      if (actionConfigs?.[0]) {
        void handleEnumSubmit(actionConfigs[0].key);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  const handleEnumSubmit = useCallback(async (key: string) => {
    if (submitting) return;
    setSubmitting(true);
    setChosen(key);
    await submitHumanDecision(token, { action: key }, event.requestId);
    onSubmitted();
  }, [submitting, token, event.requestId, onSubmitted]);

  const handleNumericSubmit = useCallback(async () => {
    const num = parseFloat(numericValue);
    if (isNaN(num) || submitting) return;
    setSubmitting(true);
    await submitHumanDecision(token, { number: num }, event.requestId);
    onSubmitted();
  }, [numericValue, submitting, token, event.requestId, onSubmitted]);

  // Scores display
  const humanParticipant = participants.find((p) => p.personaId === -1);
  const humanScore = humanParticipant ? (currentScores[humanParticipant.personaId] ?? 0) : 0;

  return (
    <div className="flex flex-col px-6 py-5 gap-5">
      {/* Round header */}
      <div className="flex items-center justify-between">
        <span
          className="text-[11px] uppercase"
          style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.1em" }}
        >
          Round {event.round} — your decision
        </span>
        <span
          className="text-[12px] tabular-nums font-[600]"
          style={{ color: "var(--gt-t2)", fontFamily: "IBMPlexMono, monospace" }}
        >
          {humanScore} pts
        </span>
      </div>

      {/* Action buttons (enum games) */}
      {actionConfigs ? (
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${actionConfigs.length}, minmax(0, 1fr))` }}>
          {actionConfigs.map((cfg) => (
            <button
              key={cfg.key}
              onClick={() => void handleEnumSubmit(cfg.key)}
              disabled={submitting}
              className="flex flex-col items-start gap-2 p-5 border transition-all text-left"
              style={{
                borderRadius: "0.625rem",
                border: `1.5px solid ${chosen === cfg.key ? cfg.color : cfg.border}`,
                background: chosen === cfg.key ? cfg.bg : "transparent",
                opacity: submitting && chosen !== cfg.key ? 0.4 : 1,
                cursor: submitting ? "not-allowed" : "pointer",
                boxShadow: chosen === cfg.key ? `0 0 0 1px ${cfg.color}` : undefined,
                transform: chosen === cfg.key ? "scale(1.02)" : undefined,
                transition: "all 0.15s ease",
              }}
            >
              <span
                className="text-[17px] font-[600] leading-tight"
                style={{
                  color: cfg.color,
                  letterSpacing: "var(--gt-tracking-tight)",
                  fontFamily: "var(--gt-font-outfit), system-ui, sans-serif",
                }}
              >
                {cfg.label}
              </span>
              <span
                className="text-[12px] leading-snug"
                style={{
                  color: "var(--gt-t3)",
                  fontFamily: "'Instrument Serif', Georgia, serif",
                  fontStyle: "italic",
                }}
              >
                {cfg.hint}
              </span>
            </button>
          ))}
        </div>
      ) : (
        /* Numeric / generic fallback */
        <div className="flex flex-col gap-3">
          <input
            type="number"
            value={numericValue}
            onChange={(e) => setNumericValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleNumericSubmit();
            }}
            placeholder="Enter a value…"
            autoFocus
            className="w-full bg-transparent text-[20px] font-[600] outline-none tabular-nums text-center pb-2"
            style={{
              color: "var(--gt-t1)",
              fontFamily: "IBMPlexMono, monospace",
              borderBottom: "2px solid var(--gt-border-md)",
              caretColor: "var(--gt-blue)",
              letterSpacing: "var(--gt-tracking-tight)",
            }}
          />
          <button
            onClick={() => void handleNumericSubmit()}
            disabled={submitting || !numericValue.trim() || isNaN(parseFloat(numericValue))}
            className="h-10 px-6 text-[13px] font-[500] w-full transition-opacity"
            style={{
              background: numericValue.trim() ? "var(--gt-blue)" : "var(--gt-border-md)",
              color: numericValue.trim() ? "white" : "var(--gt-t4)",
              borderRadius: "0.375rem",
              cursor: numericValue.trim() ? "pointer" : "not-allowed",
            }}
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      )}

      {/* Timer bar */}
      <div className="h-0.5 w-full rounded-full overflow-hidden" style={{ background: "var(--gt-border)" }}>
        <div
          className="h-full"
          style={{
            width: `${progress * 100}%`,
            background: progress > 0.4 ? "var(--gt-blue)" : progress > 0.15 ? "var(--gt-warn)" : "var(--gt-neg)",
            transition: "width 0.25s linear, background 0.5s",
          }}
        />
      </div>

      <p
        className="text-center text-[11px]"
        style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace" }}
      >
        Auto-submits in {secondsLeft}s
      </p>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export type PendingHumanTurn = HumanDiscussionPendingEvent | HumanDecisionPendingEvent;

export function HumanTurnDialog({
  pendingTurn,
  token,
  gameTypeName,
  participants,
  events,
  currentScores,
  onSubmitted,
}: {
  pendingTurn: PendingHumanTurn | null;
  token: string;
  gameTypeName: string;
  participants: GameSessionParticipant[];
  events: GameTimeline;
  currentScores: Record<number, number>;
  onSubmitted: () => void;
}) {
  // Recent discussions for context in the discussion dialog
  const recentDiscussions =
    pendingTurn?.type === "human-discussion-pending"
      ? (events.filter(
          (e): e is PersonaDiscussionEvent =>
            e.type === "persona-discussion" && e.round === pendingTurn.round,
        ) as PersonaDiscussionEvent[]).slice(-3)
      : [];

  return (
    <AnimatePresence>
      {pendingTurn && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40"
            style={{
              background: "hsl(36 45% 10% / 0.65)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          />

          {/* Dialog card */}
          <motion.div
            key="dialog"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
          >
            <div
              className="w-full max-w-md pointer-events-auto overflow-hidden"
              style={{
                background: "var(--gt-surface)",
                border: "1px solid var(--gt-border-md)",
                borderRadius: "0.75rem",
                boxShadow: "0 24px 64px hsl(0 0% 0% / 0.2)",
              }}
            >
              {/* Header strip */}
              <div
                className="h-1 w-full"
                style={{ background: "var(--gt-blue)" }}
              />

              {pendingTurn.type === "human-discussion-pending" ? (
                <DiscussionDialog
                  event={pendingTurn}
                  token={token}
                  participants={participants}
                  recentDiscussions={recentDiscussions}
                  onSubmitted={onSubmitted}
                />
              ) : (
                <DecisionDialog
                  event={pendingTurn}
                  token={token}
                  gameTypeName={gameTypeName}
                  currentScores={currentScores}
                  participants={participants}
                  onSubmitted={onSubmitted}
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
