"use client";

import {
  GameSessionParticipant,
  HUMAN_PLAYER_ID,
  PersonaDiscussionEvent,
} from "@/app/(game-theory)/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { MessageSquare, Clock, Send } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCountdown, useDeadline } from "../HumanInputPanel";
import { PLAYER_COLORS } from "../PlayerCard";

interface DiscussionCardProps {
  discussions: PersonaDiscussionEvent[];
  participants: GameSessionParticipant[];
  currentSpeakerId: number | null;
  humanTurnActive: boolean;
  onSendMessage: (content: string) => void;
  onSkipToDecision: () => void;
}

export function DiscussionCard({
  discussions,
  participants,
  currentSpeakerId,
  humanTurnActive,
  onSendMessage,
  onSkipToDecision,
}: DiscussionCardProps) {
  const [inputText, setInputText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const submittedRef = useRef(false);

  // Auto-scroll on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [discussions.length, currentSpeakerId]);

  // Submit handler
  const handleSend = useCallback(
    (text: string) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      onSendMessage(text);
      setInputText("");
    },
    [onSendMessage],
  );

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    handleSend(inputText);
  };

  // Deadline for auto-skip (30s)
  const submitRef = useRef(handleSend);
  submitRef.current = handleSend;
  const deadlineRef = useRef(() => submitRef.current(""));
  useDeadline(humanTurnActive ? 30_000 : 999_999_999, deadlineRef);
  const { secondsLeft, progress } = useCountdown(humanTurnActive ? 30_000 : 999_999_999);

  // Typing indicator speaker info
  const typingSpeaker =
    currentSpeakerId != null
      ? participants.find((p) => p.personaId === currentSpeakerId)
      : null;
  const typingSpeakerIdx = typingSpeaker
    ? participants.findIndex((p) => p.personaId === typingSpeaker.personaId)
    : -1;

  return (
    <motion.div
      key="discussion"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="card-lab flex flex-col h-[500px]"
    >
      {/* Timer bar (only when human turn active) */}
      {humanTurnActive && (
        <div className="h-[3px] w-full" style={{ background: "var(--gt-border)" }}>
          <div
            className="h-full"
            style={{
              width: `${progress * 100}%`,
              background:
                progress < 0.15 ? "var(--gt-neg)" : progress < 0.4 ? "var(--gt-warn)" : "var(--gt-blue)",
              transition: "width 0.25s linear, background 0.6s",
            }}
          />
        </div>
      )}

      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: "var(--gt-border)", background: "var(--gt-row-alt)" }}
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={16} style={{ color: "var(--gt-t3)" }} />
          <span
            className="text-xs font-bold uppercase"
            style={{ letterSpacing: "0.1em", color: "var(--gt-t2)" }}
          >
            Discussion Channel
          </span>
        </div>
        <div className="flex items-center gap-2">
          {humanTurnActive && (
            <span
              className="text-[11px] tabular-nums"
              style={{
                color: progress < 0.4 ? "var(--gt-warn)" : "var(--gt-t4)",
                fontFamily: "IBMPlexMono, monospace",
              }}
            >
              {secondsLeft}s
            </span>
          )}
          <div
            className="flex items-center gap-1 text-[10px]"
            style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace" }}
          >
            <Clock size={12} /> LIVE SESSION
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {discussions.map((msg, i) => {
          const isUser = msg.personaId === HUMAN_PLAYER_ID;
          const playerIdx = participants.findIndex((p) => p.personaId === msg.personaId);
          const color = PLAYER_COLORS[playerIdx] ?? PLAYER_COLORS[0];
          const seed = isUser
            ? (participants.find((p) => p.personaId === HUMAN_PLAYER_ID)?.userId ?? 0)
            : msg.personaId;

          return (
            <div key={i} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
              <div className="flex items-center gap-2 mb-1">
                {!isUser && (
                  <HippyGhostAvatar seed={seed} className="size-5 rounded-full" />
                )}
                <span
                  className="text-[10px] font-bold"
                  style={{ color: isUser ? "var(--gt-t3)" : color }}
                >
                  {isUser ? "You" : msg.personaName}
                </span>
              </div>
              <div
                className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm ${
                  isUser ? "rounded-tr-none" : "rounded-tl-none"
                }`}
                style={
                  isUser
                    ? {
                        background: "var(--gt-blue)",
                        color: "white",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                      }
                    : {
                        background: "var(--gt-row-alt)",
                        color: "var(--gt-t2)",
                        border: "1px solid var(--gt-border)",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                      }
                }
              >
                {msg.content}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {typingSpeaker && (
          <div className="flex items-start gap-2">
            <HippyGhostAvatar
              seed={typingSpeaker.personaId}
              className="size-5 rounded-full mt-0.5"
            />
            <div>
              <span
                className="text-[10px] font-bold"
                style={{
                  color: PLAYER_COLORS[typingSpeakerIdx] ?? PLAYER_COLORS[0],
                }}
              >
                {typingSpeaker.name}
              </span>
              <div className="flex items-center gap-1 mt-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{
                      backgroundColor: "var(--gt-t4)",
                      animationDelay: `${i * 0.25}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <form
        onSubmit={handleFormSubmit}
        className="p-4 border-t"
        style={{ borderColor: "var(--gt-border)", background: "var(--gt-surface)" }}
      >
        {humanTurnActive && !submittedRef.current ? (
          <>
            <div
              className="flex items-center gap-2 rounded-full px-4 py-1 border transition-colors focus-within:border-[var(--gt-blue)]"
              style={{
                background: "var(--gt-row-alt)",
                borderColor: "var(--gt-border)",
              }}
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-transparent py-2 text-sm focus:outline-none"
                style={{ color: "var(--gt-t1)" }}
                autoFocus
              />
              <button
                type="submit"
                className="p-1 transition-transform hover:scale-110"
                style={{ color: "var(--gt-blue)" }}
              >
                <Send size={18} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleSend("")}
              className="w-full mt-3 text-[10px] font-bold uppercase transition-colors hover:text-[var(--gt-blue)]"
              style={{
                letterSpacing: "0.1em",
                color: "var(--gt-t4)",
              }}
            >
              Skip to Decision Phase
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onSkipToDecision}
            className="w-full text-[10px] font-bold uppercase transition-colors hover:text-[var(--gt-blue)]"
            style={{
              letterSpacing: "0.1em",
              color: "var(--gt-t4)",
            }}
          >
            Skip to Decision Phase
          </button>
        )}
      </form>
    </motion.div>
  );
}
