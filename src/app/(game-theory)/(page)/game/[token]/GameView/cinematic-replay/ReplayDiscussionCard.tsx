"use client";

import {
  GameSessionParticipant,
  HUMAN_PLAYER_ID,
  PersonaDiscussionEvent,
} from "@/app/(game-theory)/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { MessageSquare, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { PLAYER_COLORS } from "../PlayerCard";
import { ReasoningTooltip } from "./ReasoningTooltip";

interface ReplayDiscussionCardProps {
  discussions: PersonaDiscussionEvent[];
  participants: GameSessionParticipant[];
  typingSpeakerId: number | null;
  allDone: boolean;
  onProceed: () => void;
}

export function ReplayDiscussionCard({
  discussions,
  participants,
  typingSpeakerId,
  allDone,
  onProceed,
}: ReplayDiscussionCardProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [discussions.length, typingSpeakerId]);

  const typingSpeaker = typingSpeakerId != null
    ? participants.find((p) => p.personaId === typingSpeakerId)
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
        <span
          className="text-[10px] tabular-nums"
          style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace" }}
        >
          {spokenCount} / {totalCount} spoken
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {discussions.map((msg, i) => {
          const isHuman = msg.personaId === HUMAN_PLAYER_ID;
          const playerIdx = participants.findIndex((p) => p.personaId === msg.personaId);
          const color = PLAYER_COLORS[playerIdx] ?? PLAYER_COLORS[0];
          const seed = isHuman
            ? (participants.find((p) => p.personaId === HUMAN_PLAYER_ID)?.userId ?? 0)
            : msg.personaId;

          return (
            <div key={i} className={`flex flex-col ${isHuman ? "items-end" : "items-start"}`}>
              <div className="flex items-center gap-2 mb-1">
                {!isHuman && <HippyGhostAvatar seed={seed} className="size-5 rounded-full" />}
                <span className="text-[10px] font-bold" style={{ color: isHuman ? "var(--gt-t3)" : color }}>
                  {isHuman ? "You" : msg.personaName}
                </span>
                {!isHuman && msg.reasoning && (
                  <ReasoningTooltip reasoning={msg.reasoning} color={color} />
                )}
              </div>
              <div
                className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm ${isHuman ? "rounded-tr-none" : "rounded-tl-none"}`}
                style={
                  isHuman
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

      {/* Footer: proceed button */}
      <div className="p-4 border-t" style={{ borderColor: "var(--gt-border)", background: "var(--gt-surface)" }}>
        <button
          onClick={onProceed}
          disabled={!allDone}
          className="btn-lab w-full flex items-center justify-center gap-2"
        >
          {allDone ? (
            <>PROCEED TO ANALYSIS <ChevronRight size={18} /></>
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
      </div>
    </motion.div>
  );
}
