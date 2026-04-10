"use client";

import {
  GameSessionParticipant,
  HUMAN_PLAYER_ID,
  PersonaDiscussionEvent,
} from "@/app/(game-theory)/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { MessageSquare, Clock, Send, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PLAYER_COLORS } from "../PlayerCard";

interface DiscussionCardProps {
  discussions: PersonaDiscussionEvent[];
  participants: GameSessionParticipant[];
  currentSpeakerId: number | null;
  /** Human has already submitted their message this round */
  humanHasSpoken: boolean;
  /** All participants (AI + human) have spoken */
  allSpoken: boolean;
  onSendMessage: (content: string) => void;
  onProceedToDecision: () => void;
}

export function DiscussionCard({
  discussions,
  participants,
  currentSpeakerId,
  humanHasSpoken,
  allSpoken,
  onSendMessage,
  onProceedToDecision,
}: DiscussionCardProps) {
  const [inputText, setInputText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const submittedRef = useRef(humanHasSpoken);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [discussions.length, currentSpeakerId]);

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

  // Typing indicator
  const typingSpeaker = currentSpeakerId != null
    ? participants.find((p) => p.personaId === currentSpeakerId)
    : null;
  const typingSpeakerIdx = typingSpeaker
    ? participants.findIndex((p) => p.personaId === typingSpeaker.personaId)
    : -1;

  const spokenCount = discussions.length;
  const totalCount = participants.length;

  return (
    <motion.div
      key="discussion"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="card-lab flex flex-col h-[380px] sm:h-[500px]"
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: "var(--gt-border)", background: "var(--gt-row-alt)" }}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} style={{ color: "var(--gt-t3)" }} />
            <span className="text-xs font-bold uppercase" style={{ letterSpacing: "0.1em", color: "var(--gt-t2)" }}>
              Discussion Channel
            </span>
          </div>
          <p
            className="text-[11px] leading-snug pl-6"
            style={{ color: "var(--gt-t3)", fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic" }}
          >
            Communicate, negotiate, or bluff — shape the table before decisions lock in.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] tabular-nums"
            style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace" }}
          >
            {spokenCount} / {totalCount} spoken
          </span>
          <div
            className="flex items-center gap-1 text-[10px]"
            style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace" }}
          >
            <Clock size={12} /> LIVE
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
                {!isUser && <HippyGhostAvatar seed={seed} className="size-5 rounded-full" />}
                <span className="text-[10px] font-bold" style={{ color: isUser ? "var(--gt-t3)" : color }}>
                  {isUser ? "You" : msg.personaName}
                </span>
              </div>
              <div
                className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm ${isUser ? "rounded-tr-none" : "rounded-tl-none"}`}
                style={
                  isUser
                    ? { background: "var(--gt-ink)", color: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
                    : { background: "var(--gt-row-alt)", color: "var(--gt-t2)", border: "1px solid var(--gt-border)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }
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
            <HippyGhostAvatar seed={typingSpeaker.personaId} className="size-5 rounded-full mt-0.5" />
            <div>
              <span className="text-[10px] font-bold" style={{ color: PLAYER_COLORS[typingSpeakerIdx] ?? PLAYER_COLORS[0] }}>
                {typingSpeaker.name}
              </span>
              <div className="flex items-center gap-1 mt-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ backgroundColor: "var(--gt-t4)", animationDelay: `${i * 0.25}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Footer: input OR proceed button */}
      <div className="p-4 border-t" style={{ borderColor: "var(--gt-border)", background: "var(--gt-surface)" }}>
        {!humanHasSpoken ? (
          /* Human hasn't spoken yet — show input */
          <form onSubmit={handleFormSubmit}>
            <div
              className="flex items-center gap-2 rounded-full px-4 py-1 border transition-colors focus-within:border-[var(--gt-ink)]"
              style={{ background: "var(--gt-row-alt)", borderColor: "var(--gt-border)" }}
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
              <button type="submit" className="p-1 transition-transform hover:scale-110" style={{ color: "var(--gt-ink)" }}>
                <Send size={18} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleSend("")}
              className="w-full mt-2 text-[10px] font-bold uppercase transition-colors hover:text-[var(--gt-ink)]"
              style={{ letterSpacing: "0.1em", color: "var(--gt-t4)" }}
            >
              Say nothing
            </button>
          </form>
        ) : (
          /* Human has spoken — show proceed button (disabled until all spoken) */
          <button
            onClick={onProceedToDecision}
            disabled={!allSpoken}
            className="btn-lab w-full flex items-center justify-center gap-2"
          >
            {allSpoken ? (
              <>PROCEED TO DECISION <ChevronRight size={18} /></>
            ) : (
              <span
                className="flex items-center gap-2 text-[11px] uppercase"
                style={{ fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.08em" }}
              >
                <span className="flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1 h-1 rounded-full animate-pulse"
                      style={{ backgroundColor: "white", animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </span>
                Discussing ({spokenCount} / {totalCount})
              </span>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}
