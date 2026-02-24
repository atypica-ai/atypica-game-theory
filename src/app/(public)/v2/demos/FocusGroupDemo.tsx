"use client";

import { cn } from "@/lib/utils";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import AnimCursor from "./AnimCursor";
import ProductFrame, { BreadcrumbSegment, BreadcrumbSeparator } from "./ProductFrame";
import { L } from "./theme";

const PERSONAS = [
  { name: "#1042", seed: 1042, role: "consumer" },
  { name: "#387", seed: 387, role: "consumer" },
  { name: "#2156", seed: 2156, role: "buyer" },
  { name: "#891", seed: 891, role: "consumer" },
  { name: "#1523", seed: 1523, role: "buyer" },
  { name: "#604", seed: 604, role: "consumer" },
];

type DiscussionEvent =
  | { type: "moderator"; text: string }
  | { type: "persona"; seed: number; name: string; text: string }
  | { type: "summary"; text: string };

type Phase = "panel" | "dialog" | "discussion" | "report";

export default function FocusGroupDemo() {
  const t = useTranslations("HomeAtypicaV2");
  const [phase, setPhase] = useState<Phase>("panel");
  const [msgCount, setMsgCount] = useState(0);
  const [participated, setParticipated] = useState<Set<number>>(new Set());
  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false, clicking: false });
  const scrollRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const EVENTS: DiscussionEvent[] = [
    { type: "moderator", text: t("twoAgents.mockup.modQ") },
    { type: "persona", seed: 387, name: "#387", text: t("twoAgents.mockup.reply1") },
    { type: "persona", seed: 2156, name: "#2156", text: t("twoAgents.mockup.reply2") },
    { type: "summary", text: t("twoAgents.mockup.modSummary") },
  ];

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }
  function schedule(fn: () => void, ms: number) {
    timersRef.current.push(setTimeout(fn, ms));
  }

  function startFlow() {
    clearTimers();
    // Cursor moves to a persona card, clicks → dialog opens
    setCursor({ x: 60, y: 100, visible: true, clicking: false });
    schedule(() => setCursor({ x: 60, y: 100, visible: true, clicking: true }), 400);
    schedule(() => { setCursor((c) => ({ ...c, visible: false, clicking: false })); setPhase("dialog"); }, 700);
  }

  function submitDialog() {
    clearTimers();
    setPhase("discussion");
    setMsgCount(0);
    setParticipated(new Set());
  }

  // Discussion auto-advance
  useEffect(() => {
    if (phase !== "discussion") return;
    const t = setTimeout(() => {
      if (msgCount < EVENTS.length) {
        const evt = EVENTS[msgCount];
        if (evt.type === "persona") setParticipated((prev) => new Set([...prev, evt.seed]));
        setMsgCount((c) => c + 1);
      } else {
        setPhase("report");
      }
    }, msgCount === 0 ? 600 : 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, msgCount]);

  // Dialog auto-submit
  useEffect(() => {
    if (phase !== "dialog") return;
    const t = setTimeout(submitDialog, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Report → scroll then loop
  useEffect(() => {
    if (phase !== "report") return;
    clearTimers();
    schedule(() => {
      const el = scrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }, 600);
    schedule(() => {
      setPhase("panel");
      setMsgCount(0);
      setParticipated(new Set());
      const el = scrollRef.current;
      if (el) el.scrollTop = 0;
    }, 6000);
    return clearTimers;
  }, [phase]);

  // Auto-start
  useEffect(() => {
    if (phase !== "panel") return;
    const t = setTimeout(startFlow, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <ProductFrame
      className="h-[400px]"
      sidebarActiveIndex={1}
      accentColor={L.blue}
      breadcrumb={<><BreadcrumbSegment text="Panel" /><BreadcrumbSeparator /><BreadcrumbSegment text="Consumer Research" active /></>}
    >
      {/* Dialog overlay — outside scroll container, covers entire content area */}
      <AnimatePresence>
        {phase === "dialog" && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ background: "rgba(0,0,0,0.12)" }}
          >
            <motion.div
              className="w-[80%] max-w-[250px] rounded-lg shadow-lg p-4 space-y-3"
              style={{ background: L.bgCard, border: `1px solid ${L.border}` }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-sm font-medium" style={{ color: L.text }}>New Focus Group</p>
              <div className="rounded p-2 text-xs leading-relaxed" style={{ background: L.bgSub, border: `1px solid ${L.borderLight}`, color: L.textSub }}>
                {t("twoAgents.mockup.modQ")}
                <motion.span className="inline-block w-0.5 h-3.5 ml-0.5 align-middle" style={{ background: L.blue }} animate={{ opacity: [1, 0] }} transition={{ duration: 0.6, repeat: Infinity }} />
              </div>
              <button
                type="button"
                className="w-full py-2 rounded text-xs font-medium cursor-pointer"
                style={{ background: L.blue, color: "white" }}
                onClick={submitDialog}
              >
                Start Discussion →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={scrollRef} className="h-full overflow-y-auto overflow-x-hidden relative">
        <AnimCursor x={cursor.x} y={cursor.y} visible={cursor.visible} clicking={cursor.clicking} />

        <AnimatePresence mode="wait">
          {/* ── Panel Detail Page ── */}
          {(phase === "panel" || phase === "dialog") && (
            <motion.div key="panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="p-4">
              {/* Panel title */}
              <div className="mb-3">
                <p className="text-sm font-medium" style={{ color: L.text }}>Consumer Research Panel</p>
                <p className="text-xs mt-0.5" style={{ color: L.textFaint }}>{PERSONAS.length} personas · 0 discussions</p>
              </div>

              {/* Persona grid (3×2) */}
              <div className="grid grid-cols-3 gap-1.5">
                {PERSONAS.map((p) => (
                  <div
                    key={p.seed}
                    className="flex flex-col items-center gap-1 py-2.5 px-1 rounded cursor-pointer transition-colors"
                    style={{ border: `1px solid ${L.borderLight}`, background: L.bgCard }}
                    onClick={startFlow}
                  >
                    <HippyGhostAvatar seed={p.seed} className="size-8 rounded-full" />
                    <span className="font-IBMPlexMono text-xs" style={{ color: L.textSub }}>{p.name}</span>
                    <span className="font-IBMPlexMono text-xs" style={{ color: L.textFaint }}>#{p.role}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Discussion (3-column, fixed height) ── */}
          {phase === "discussion" && (
            <motion.div key="discussion" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex h-full">
              {/* Left: avatars only (narrow) */}
              <div className="w-[52px] shrink-0 py-2.5 px-1.5 flex flex-col gap-1.5 items-center" style={{ borderRight: `1px solid ${L.border}` }}>
                {PERSONAS.map((p) => (
                  <div key={p.seed} className="relative">
                    <HippyGhostAvatar seed={p.seed} className="size-5 rounded-full" />
                    <span className={cn("absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border", participated.has(p.seed) ? "bg-green-500" : "")} style={{ borderColor: L.bg, background: participated.has(p.seed) ? "#16a34a" : L.border }} />
                  </div>
                ))}
              </div>

              {/* Center: Timeline */}
              <div className="flex-1 p-3 flex flex-col gap-2 overflow-hidden min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <motion.span className="w-1.5 h-1.5 rounded-full" style={{ background: L.blue }} animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
                  <span className="font-IBMPlexMono text-xs" style={{ color: L.textMuted }}>In Progress</span>
                  <span className="font-IBMPlexMono text-xs ml-auto tabular-nums" style={{ color: L.textFaint }}>{msgCount}/{EVENTS.length}</span>
                </div>
                {EVENTS.slice(0, msgCount).map((evt, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="py-1.5 px-2 text-xs leading-relaxed rounded"
                    style={{
                      background: evt.type === "moderator" ? L.blueBg : evt.type === "summary" ? L.bgSub : "transparent",
                      border: evt.type === "moderator" ? `1px solid ${L.blueBorder}` : evt.type === "summary" ? `1px solid ${L.border}` : "none",
                      color: evt.type === "summary" ? L.textMuted : L.text,
                      fontStyle: evt.type === "summary" ? "italic" : "normal",
                    }}
                  >
                    <span className="font-IBMPlexMono text-xs mr-1" style={{ color: L.textMuted }}>
                      {evt.type === "moderator" && "🎙 "}
                      {evt.type === "summary" && "📋 "}
                      {evt.type === "persona" && <HippyGhostAvatar seed={evt.seed} className="size-3.5 rounded-full inline-block align-text-bottom mr-0.5" />}
                      {evt.type === "moderator" ? t("twoAgents.mockup.moderator") : evt.type === "persona" ? evt.name : "Summary"}:
                    </span>
                    {evt.text}
                  </motion.div>
                ))}
              </div>

            </motion.div>
          )}

          {/* ── Report (scrolls within fixed container) ── */}
          {phase === "report" && (
            <motion.div key="report" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="p-4 space-y-3 cursor-pointer" onClick={() => { setPhase("panel"); setMsgCount(0); setParticipated(new Set()); }}>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">📊</span>
                  <span className="text-sm font-medium" style={{ color: L.text }}>{t("twoAgents.mockup.reportTitle")}</span>
                </div>
                <div className="flex items-center gap-0.5 mb-3">
                  {PERSONAS.slice(0, 5).map((p, i) => (
                    <HippyGhostAvatar key={p.seed} seed={p.seed} className={cn("size-5 rounded-full", i > 0 && "-ml-1")} />
                  ))}
                  <span className="text-xs ml-2" style={{ color: L.textFaint }}>{PERSONAS.length} participants</span>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15 }} className="p-3 rounded-lg" style={{ background: L.bgSub, border: `1px solid ${L.borderLight}` }}>
                <span className="font-IBMPlexMono text-xs block mb-1.5" style={{ color: L.textFaint }}>Summary</span>
                <p className="text-sm leading-relaxed" style={{ color: L.text }}>{t("twoAgents.mockup.modSummary")}</p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.3 }} className="p-3 rounded-lg" style={{ background: L.blueBg, border: `1px solid ${L.blueBorder}` }}>
                <span className="font-IBMPlexMono text-xs tracking-[0.08em] block mb-1.5" style={{ color: L.blue }}>{t("twoAgents.mockup.insightLabel")}</span>
                <p className="text-sm leading-relaxed" style={{ color: L.text }}>{t("twoAgents.mockup.insightText")}</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ProductFrame>
  );
}
