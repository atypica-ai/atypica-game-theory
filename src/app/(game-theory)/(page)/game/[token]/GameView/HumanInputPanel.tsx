"use client";

import {
  submitHumanDiscussion,
} from "@/app/(game-theory)/humanActions";
import {
  HUMAN_PLAYER_ID,
  PersonaDecisionEvent,
  PersonaDiscussionEvent,
} from "@/app/(game-theory)/types";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { DecisionInput } from "./DecisionInput";

// ── Timer hooks (exported for DecisionInput) ────────────────────────────────

/** Visual-only countdown — no callbacks, no dependency issues */
export function useCountdown(durationMs: number): { secondsLeft: number; progress: number } {
  const [now, setNow] = useState(() => Date.now());
  const startRef = useRef(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const msLeft = Math.max(0, startRef.current + durationMs - now);
  return { secondsLeft: Math.ceil(msLeft / 1000), progress: msLeft / durationMs };
}

/** Hard deadline — fires a ref-based callback once, immune to stale closures and dep changes */
export function useDeadline(durationMs: number, callbackRef: React.RefObject<(() => void) | null>) {
  useEffect(() => {
    const id = setTimeout(() => {
      callbackRef.current?.();
    }, durationMs);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // truly empty — fires exactly once on mount
}

// ── Shared panel shell (exported for DecisionInput) ─────────────────────────

export function PanelShell({
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
      style={{ background: "var(--gt-surface)", borderTop: "1px solid var(--gt-border-md)" }}
    >
      <div className="h-[3px] w-full" style={{ background: "var(--gt-border)" }}>
        <div className="h-full" style={{ width: `${progress * 100}%`, background: barColor, transition: "width 0.25s linear, background 0.6s" }} />
      </div>
      <div className="flex items-center justify-between px-8 pt-4 pb-3 border-b" style={{ borderColor: "var(--gt-border)" }}>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-[600] uppercase" style={{ color: "var(--gt-t1)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.1em" }}>{label}</span>
          <span className="text-[11px] uppercase" style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.08em" }}>· R{round}</span>
        </div>
        <span className="text-[12px] tabular-nums" style={{ color: progress < 0.4 ? barColor : "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", transition: "color 0.6s" }}>
          ◷ {secondsLeft}s
        </span>
      </div>
      {children}
    </motion.div>
  );
}

// ── Discussion input ────────────────────────────────────────────────────────

function DiscussionInput({
  token,
  roundId,
  onSubmitted,
}: {
  token: string;
  roundId: number;
  onSubmitted: (event: PersonaDiscussionEvent) => void;
}) {
  const [text, setText] = useState("");
  const submittedRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = useCallback((content: string) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const trimmed = content.trim() || "(said nothing)";
    onSubmitted({
      type: "persona-discussion",
      personaId: HUMAN_PLAYER_ID,
      personaName: "You",
      reasoning: null,
      content: trimmed,
      round: roundId,
    });
    void submitHumanDiscussion(token, content, roundId);
  }, [token, roundId, onSubmitted]);

  // Ref always points to latest submit — immune to stale closures
  const submitRef = useRef(submit);
  submitRef.current = submit;
  const deadlineRef = useRef(() => submitRef.current(""));
  useDeadline(30_000, deadlineRef);

  const { secondsLeft, progress } = useCountdown(30_000);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  return (
    <PanelShell label="Your Turn to Speak" round={roundId} secondsLeft={secondsLeft} progress={progress}>
      <div className="px-8 py-5 flex flex-col gap-4">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(text); }}
          placeholder="What will you say to the others?"
          rows={3}
          className="w-full resize-none bg-transparent outline-none leading-relaxed"
          style={{ fontSize: "14px", color: "var(--gt-t1)", fontFamily: "var(--gt-font-outfit), system-ui, sans-serif", caretColor: "var(--gt-blue)" }}
        />
        <div className="flex items-center justify-end gap-3">
          <button onClick={() => submit("")} className="text-[12px] transition-opacity hover:opacity-60" style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace" }}>skip</button>
          <button
            onClick={() => submit(text)}
            disabled={!text.trim()}
            className="h-8 px-5 text-[13px] font-[500] transition-all"
            style={{
              background: text.trim() ? "var(--gt-blue)" : "var(--gt-border)",
              color: text.trim() ? "white" : "var(--gt-t4)",
              borderRadius: "0.375rem",
              cursor: text.trim() ? "pointer" : "not-allowed",
            }}
          >
            Send ↵
          </button>
        </div>
      </div>
    </PanelShell>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────

export type HumanTurnRequest = { type: "discussion" | "decision"; roundId: number };

export function HumanInputPanel({
  humanTurn,
  token,
  gameTypeName,
  currentScores,
  onDiscussionSubmitted,
  onDecisionSubmitted,
}: {
  humanTurn: HumanTurnRequest;
  token: string;
  gameTypeName: string;
  currentScores: Record<number, number>;
  onDiscussionSubmitted: (event: PersonaDiscussionEvent) => void;
  onDecisionSubmitted: (event: PersonaDecisionEvent) => void;
}) {
  if (humanTurn.type === "discussion") {
    return (
      <DiscussionInput
        token={token}
        roundId={humanTurn.roundId}
        onSubmitted={onDiscussionSubmitted}
      />
    );
  }

  return (
    <DecisionInput
      token={token}
      roundId={humanTurn.roundId}
      gameTypeName={gameTypeName}
      currentScores={currentScores}
      onSubmitted={onDecisionSubmitted}
    />
  );
}
