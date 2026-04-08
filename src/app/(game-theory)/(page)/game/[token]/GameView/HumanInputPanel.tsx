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
} from "@/app/(game-theory)/types";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

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

// ── Shared panel shell ────────────────────────────────────────────────────────

function PanelShell({
  label,
  round,
  secondsLeft,
  progress,
  children,
}: {
  label: string;
  round: number;
  secondsLeft: number;
  progress: number;
  children: React.ReactNode;
}) {
  const barColor =
    progress < 0.15 ? "var(--gt-neg)" : progress < 0.4 ? "var(--gt-warn)" : "var(--gt-blue)";

  return (
    <motion.div
      initial={{ y: 72, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 72, opacity: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 38 }}
      className="shrink-0"
      style={{
        background: "var(--gt-surface)",
        borderTop: "1px solid var(--gt-border-md)",
      }}
    >
      {/* Timer bar — thin strip at very top, color shifts as deadline approaches */}
      <div className="h-[3px] w-full" style={{ background: "var(--gt-border)" }}>
        <div
          className="h-full"
          style={{
            width: `${progress * 100}%`,
            background: barColor,
            transition: "width 0.25s linear, background 0.6s",
          }}
        />
      </div>

      {/* Header */}
      <div
        className="flex items-center justify-between px-8 pt-4 pb-3 border-b"
        style={{ borderColor: "var(--gt-border)" }}
      >
        <div className="flex items-center gap-3">
          <span
            className="text-[11px] font-[600] uppercase"
            style={{
              color: "var(--gt-t1)",
              fontFamily: "IBMPlexMono, monospace",
              letterSpacing: "0.1em",
            }}
          >
            {label}
          </span>
          <span
            className="text-[11px] uppercase"
            style={{
              color: "var(--gt-t4)",
              fontFamily: "IBMPlexMono, monospace",
              letterSpacing: "0.08em",
            }}
          >
            · R{round}
          </span>
        </div>
        <span
          className="text-[12px] tabular-nums"
          style={{
            color: progress < 0.4 ? barColor : "var(--gt-t4)",
            fontFamily: "IBMPlexMono, monospace",
            transition: "color 0.6s",
          }}
        >
          ◷ {secondsLeft}s
        </span>
      </div>

      {/* Body */}
      {children}
    </motion.div>
  );
}

// ── Discussion input ──────────────────────────────────────────────────────────

function DiscussionInput({
  event,
  token,
  onSubmitted,
}: {
  event: HumanDiscussionPendingEvent;
  token: string;
  onSubmitted: () => void;
}) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { secondsLeft, progress } = useCountdown(event.expiresAt);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Auto-submit (skip) on timeout
  useEffect(() => {
    if (secondsLeft === 0 && !submitting) {
      void handleSubmit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  const handleSubmit = useCallback(
    async (skip = false) => {
      if (submitting) return;
      setSubmitting(true);
      await submitHumanDiscussion(token, skip ? "" : text, event.requestId);
      onSubmitted();
    },
    [submitting, text, token, event.requestId, onSubmitted],
  );

  return (
    <PanelShell
      label="Your Turn to Speak"
      round={event.round}
      secondsLeft={secondsLeft}
      progress={progress}
    >
      <div className="px-8 py-5 flex flex-col gap-4">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              void handleSubmit(false);
            }
          }}
          placeholder="What will you say to the others?"
          rows={3}
          disabled={submitting}
          className="w-full resize-none bg-transparent outline-none leading-relaxed"
          style={{
            fontSize: "14px",
            color: "var(--gt-t1)",
            fontFamily: "var(--gt-font-outfit), system-ui, sans-serif",
            caretColor: "var(--gt-blue)",
            opacity: submitting ? 0.5 : 1,
          }}
        />

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => void handleSubmit(true)}
            disabled={submitting}
            className="text-[12px] transition-opacity hover:opacity-60"
            style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace" }}
          >
            skip
          </button>
          <button
            onClick={() => void handleSubmit(false)}
            disabled={submitting || !text.trim()}
            className="h-8 px-5 text-[13px] font-[500] transition-all"
            style={{
              background: text.trim() && !submitting ? "var(--gt-blue)" : "var(--gt-border)",
              color: text.trim() && !submitting ? "white" : "var(--gt-t4)",
              borderRadius: "0.375rem",
              cursor: text.trim() && !submitting ? "pointer" : "not-allowed",
              letterSpacing: "var(--gt-tracking-tight)",
            }}
          >
            {submitting ? "Sending…" : "Send ↵"}
          </button>
        </div>
      </div>
    </PanelShell>
  );
}

// ── Decision input ────────────────────────────────────────────────────────────

function DecisionInput({
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

  // Auto-submit first option on timeout
  useEffect(() => {
    if (secondsLeft === 0 && !submitting) {
      if (actionConfigs?.[0]) {
        void handleEnumSubmit(actionConfigs[0].key);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  const handleEnumSubmit = useCallback(
    async (key: string) => {
      if (submitting) return;
      setSubmitting(true);
      setChosen(key);
      await submitHumanDecision(token, { action: key }, event.requestId);
      onSubmitted();
    },
    [submitting, token, event.requestId, onSubmitted],
  );

  const handleNumericSubmit = useCallback(async () => {
    const num = parseFloat(numericValue);
    if (isNaN(num) || submitting) return;
    setSubmitting(true);
    await submitHumanDecision(token, { number: num }, event.requestId);
    onSubmitted();
  }, [numericValue, submitting, token, event.requestId, onSubmitted]);

  const humanParticipant = participants.find((p) => p.personaId === -1);
  const humanScore = humanParticipant ? (currentScores[humanParticipant.personaId] ?? 0) : 0;

  return (
    <PanelShell
      label="Your Move"
      round={event.round}
      secondsLeft={secondsLeft}
      progress={progress}
    >
      <div className="px-8 py-5 flex flex-col gap-3">
        {/* Score context */}
        <div className="flex items-center justify-between mb-1">
          <span
            className="text-[12px]"
            style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace" }}
          >
            your score
          </span>
          <span
            className="text-[15px] font-[700] tabular-nums"
            style={{ color: "var(--gt-t1)", fontFamily: "IBMPlexMono, monospace" }}
          >
            {humanScore}
          </span>
        </div>

        {/* Enum action buttons */}
        {actionConfigs ? (
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${actionConfigs.length}, minmax(0, 1fr))`,
            }}
          >
            {actionConfigs.map((cfg) => {
              const isChosen = chosen === cfg.key;
              return (
                <button
                  key={cfg.key}
                  onClick={() => void handleEnumSubmit(cfg.key)}
                  disabled={submitting}
                  className="flex flex-col items-start gap-2 px-5 py-4 border text-left transition-all"
                  style={{
                    borderRadius: "0.5rem",
                    border: `1.5px solid ${isChosen ? cfg.color : cfg.border}`,
                    background: isChosen ? cfg.bg : "transparent",
                    opacity: submitting && !isChosen ? 0.35 : 1,
                    cursor: submitting ? "not-allowed" : "pointer",
                    boxShadow: isChosen ? `0 0 0 1px ${cfg.color}` : undefined,
                    transform: isChosen ? "scale(1.01)" : undefined,
                    transition: "all 0.15s ease",
                  }}
                >
                  <span
                    className="text-[15px] font-[600] leading-tight"
                    style={{
                      color: cfg.color,
                      fontFamily: "var(--gt-font-outfit), system-ui, sans-serif",
                      letterSpacing: "var(--gt-tracking-tight)",
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
              );
            })}
          </div>
        ) : (
          /* Numeric fallback */
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
              className="w-full bg-transparent outline-none tabular-nums text-center pb-2"
              style={{
                fontSize: "20px",
                fontWeight: 600,
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
      </div>
    </PanelShell>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export type PendingHumanTurn = HumanDiscussionPendingEvent | HumanDecisionPendingEvent;

export function HumanInputPanel({
  pendingTurn,
  token,
  gameTypeName,
  participants,
  events: _events,
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
  if (!pendingTurn) return null;

  if (pendingTurn.type === "human-discussion-pending") {
    return (
      <DiscussionInput
        event={pendingTurn}
        token={token}
        onSubmitted={onSubmitted}
      />
    );
  }

  return (
    <DecisionInput
      event={pendingTurn}
      token={token}
      gameTypeName={gameTypeName}
      currentScores={currentScores}
      participants={participants}
      onSubmitted={onSubmitted}
    />
  );
}
