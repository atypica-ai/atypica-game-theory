"use client";

import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AnimCursor from "./AnimCursor";
import ProductFrame, { BreadcrumbSegment, BreadcrumbSeparator } from "./ProductFrame";
import { L } from "./theme";

const PERSONAS = [
  { name: "#1042", seed: 1042, role: "Urban snack buyer", title: "Consumer" },
  { name: "#387", seed: 387, role: "Gen Z creator", title: "Consumer" },
  { name: "#2156", seed: 2156, role: "Category manager", title: "Buyer" },
  { name: "#891", seed: 891, role: "Family shopper", title: "Consumer" },
  { name: "#1523", seed: 1523, role: "Retail operator", title: "Buyer" },
  { name: "#604", seed: 604, role: "Impulse buyer", title: "Consumer" },
] as const;

const RECENT_PROJECTS = [
  { title: "Lunar snack concept review", meta: "6 personas · 2h ago" },
  { title: "Packaging shelf test", meta: "4 personas · yesterday" },
] as const;

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

  const events = useMemo<DiscussionEvent[]>(
    () => [
      { type: "moderator", text: t("twoAgents.mockup.modQ") },
      { type: "persona", seed: 387, name: "#387", text: t("twoAgents.mockup.reply1") },
      { type: "persona", seed: 2156, name: "#2156", text: t("twoAgents.mockup.reply2") },
      { type: "summary", text: t("twoAgents.mockup.modSummary") },
    ],
    [t],
  );

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  function schedule(fn: () => void, ms: number) {
    timersRef.current.push(setTimeout(fn, ms));
  }

  const resetToPanel = useCallback(() => {
    clearTimers();
    setPhase("panel");
    setMsgCount(0);
    setParticipated(new Set());
    setCursor({ x: 0, y: 0, visible: false, clicking: false });
    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
  }, []);

  const startFlow = useCallback(() => {
    clearTimers();
    setCursor({ x: 278, y: 146, visible: true, clicking: false });
    schedule(() => setCursor({ x: 278, y: 146, visible: true, clicking: true }), 420);
    schedule(() => {
      setCursor((prev) => ({ ...prev, visible: false, clicking: false }));
      setPhase("dialog");
    }, 740);
  }, []);

  const submitDialog = useCallback(() => {
    clearTimers();
    setPhase("discussion");
    setMsgCount(0);
    setParticipated(new Set());
  }, []);

  useEffect(() => {
    if (phase !== "panel") return;
    const timer = setTimeout(startFlow, 2000);
    return () => clearTimeout(timer);
  }, [phase, startFlow]);

  useEffect(() => {
    if (phase !== "dialog") return;
    const timer = setTimeout(submitDialog, 1800);
    return () => clearTimeout(timer);
  }, [phase, submitDialog]);

  useEffect(() => {
    if (phase !== "discussion") return;
    const timer = setTimeout(() => {
      if (msgCount < events.length) {
        const evt = events[msgCount];
        if (evt.type === "persona") {
          setParticipated((prev) => new Set([...prev, evt.seed]));
        }
        setMsgCount((count) => count + 1);
      } else {
        setPhase("report");
      }
    }, msgCount === 0 ? 700 : 1000);
    return () => clearTimeout(timer);
  }, [events, msgCount, phase]);

  useEffect(() => {
    if (phase !== "report") return;
    clearTimers();
    schedule(() => {
      const el = scrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }, 600);
    schedule(resetToPanel, 6200);
    return clearTimers;
  }, [phase, resetToPanel]);

  return (
    <ProductFrame
      className="h-[400px]"
      accentColor={L.blue}
      breadcrumb={
        <>
          <BreadcrumbSegment text="Panel" />
          <BreadcrumbSeparator />
          <BreadcrumbSegment text="Consumer Research" active />
        </>
      }
    >
      <AnimatePresence>
        {phase === "dialog" && (
          <motion.div
            className="absolute inset-0 z-20 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ background: "rgba(0,0,0,0.12)" }}
          >
            <motion.div
              className="w-[82%] max-w-[300px] rounded-lg p-4"
              style={{ background: L.bgCard, border: `1px solid ${L.border}` }}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full" style={{ background: L.blue }} />
                <p className="text-sm font-medium" style={{ color: L.text }}>
                  New Focus Group
                </p>
              </div>
              <p className="mt-3 text-xs leading-relaxed" style={{ color: L.textSub }}>
                {t("twoAgents.mockup.modQ")}
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: L.textFaint }}>
                <span>6 personas</span>
                <span>·</span>
                <span>Auto moderator</span>
                <span>·</span>
                <span>Summary on</span>
              </div>
              <button
                type="button"
                className="mt-4 w-full rounded-md py-2 text-xs font-medium text-white"
                style={{ background: L.blue }}
                onClick={submitDialog}
              >
                Start Discussion
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={scrollRef} className="relative h-full overflow-y-auto overflow-x-hidden">
        <AnimCursor x={cursor.x} y={cursor.y} visible={cursor.visible} clicking={cursor.clicking} />

        <AnimatePresence mode="wait">
          {(phase === "panel" || phase === "dialog") && (
            <motion.div
              key="panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="flex h-full"
            >
              <div className="flex min-w-0 flex-1 flex-col px-4 py-4">
                <div className="shrink-0 pb-4">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold" style={{ color: L.text }}>
                      Consumer Research Panel
                    </p>
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]"
                      style={{ background: L.bgSub, color: L.textMuted, border: `1px solid ${L.border}` }}
                    >
                      <span className="size-1.5 rounded-full" style={{ background: "var(--ghost-green)" }} />
                      Consumer
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: L.textMuted }}>
                    Premium snack buyers and retail operators for rapid concept discussion.
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-[10px]" style={{ color: L.textFaint }}>
                    <span>6 personas</span>
                    <span>·</span>
                    <span>12 discussions</span>
                    <span>·</span>
                    <span>4 interviews</span>
                  </div>
                </div>

                <div className="grid flex-1 grid-cols-2 gap-2 overflow-hidden">
                  {PERSONAS.map((persona) => (
                    <div
                      key={persona.seed}
                      className="rounded-lg px-3 py-2.5"
                      style={{ background: L.bgCard, border: `1px solid ${L.borderLight}` }}
                    >
                      <div className="flex items-center gap-2">
                        <HippyGhostAvatar seed={persona.seed} className="size-7 rounded-full shrink-0" />
                        <div className="min-w-0">
                          <div className="truncate text-xs font-medium" style={{ color: L.text }}>
                            {persona.name}
                          </div>
                          <div className="truncate text-[10px]" style={{ color: L.textFaint }}>
                            {persona.title}
                          </div>
                        </div>
                      </div>
                      <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed" style={{ color: L.textMuted }}>
                        {persona.role}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="flex w-[146px] shrink-0 flex-col border-l px-3 py-4"
                style={{ borderColor: L.borderLight, background: L.bgCard }}
              >
                <div className="shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full" style={{ background: "var(--ghost-green)" }} />
                    <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: L.textFaint }}>
                      Ready To Start
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold" style={{ color: L.text }}>
                    Launch Study
                  </p>
                </div>

                <div className="mt-4 grid gap-2">
                  {[
                    { label: "Focus Group", active: true },
                    { label: "User Interview" },
                    { label: "Expert Interview" },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      className="rounded-lg px-2.5 py-2 text-left"
                      style={{
                        background: item.active ? L.blueBg : L.bg,
                        border: `1px solid ${item.active ? L.blueBorder : L.borderLight}`,
                        color: L.text,
                      }}
                      onClick={item.active ? startFlow : undefined}
                    >
                      <span className="block text-xs font-medium">{item.label}</span>
                      <span className="mt-1 block text-[10px]" style={{ color: L.textFaint }}>
                        {item.active ? "Moderated discussion" : "Saved workflow"}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mt-5 border-t pt-4" style={{ borderColor: L.borderLight }}>
                  <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: L.textFaint }}>
                    Recent Projects
                  </p>
                  <div className="mt-2 space-y-2">
                    {RECENT_PROJECTS.map((project) => (
                      <div
                        key={project.title}
                        className="rounded-lg px-2.5 py-2"
                        style={{ background: L.bg, border: `1px solid ${L.borderLight}` }}
                      >
                        <p className="line-clamp-2 text-[11px] font-medium leading-snug" style={{ color: L.text }}>
                          {project.title}
                        </p>
                        <p className="mt-1 text-[10px]" style={{ color: L.textFaint }}>
                          {project.meta}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {phase === "discussion" && (
            <motion.div
              key="discussion"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="flex h-full"
            >
              <div
                className="hidden w-[120px] shrink-0 flex-col border-r px-3 py-3 md:flex"
                style={{ borderColor: L.borderLight }}
              >
                <div className="space-y-1.5">
                  <div className="text-[10px]" style={{ color: L.textFaint }}>
                    {participated.size}/{PERSONAS.length} participated
                  </div>
                  <div className="h-1 rounded-full" style={{ background: L.bgSub }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(participated.size / PERSONAS.length) * 100}%`,
                        background: "var(--ghost-green)",
                      }}
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-3 overflow-y-auto">
                  {PERSONAS.map((persona) => (
                    <div
                      key={persona.seed}
                      className={cn(
                        "flex items-center gap-2 rounded-md transition-opacity",
                        participated.has(persona.seed) ? "opacity-100" : "opacity-45",
                      )}
                    >
                      <HippyGhostAvatar seed={persona.seed} className="size-6 shrink-0 rounded-full" />
                      <div className="min-w-0">
                        <div className="truncate text-[11px] font-medium" style={{ color: L.text }}>
                          {persona.name}
                        </div>
                        <div className="truncate text-[10px]" style={{ color: L.textFaint }}>
                          {persona.title}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative flex min-w-0 flex-1 flex-col">
                <div
                  className="absolute left-0 right-0 top-0 z-10 flex items-center px-4 py-2.5"
                  style={{ background: `${L.bg}dd`, borderBottom: `1px solid ${L.borderLight}` }}
                >
                  <div className="w-1/4 min-w-0 pr-2">
                    <span className="truncate text-xs" style={{ color: L.textMuted }}>
                      Consumer Research Panel
                    </span>
                  </div>
                  <div className="w-1/2 min-w-0 text-center">
                    <p className="truncate text-sm font-medium" style={{ color: L.text }}>
                      Lunar snack concept review
                    </p>
                  </div>
                  <div className="flex w-1/4 justify-end pl-2">
                    <div
                      className="inline-flex items-center gap-2 rounded-md px-2.5 py-1"
                      style={{ background: L.bgCard, border: `1px solid ${L.border}` }}
                    >
                      <span className="size-1.5 rounded-full" style={{ background: "var(--ghost-green)" }} />
                      <span className="text-[10px] font-medium" style={{ color: L.textMuted }}>
                        In progress
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-4 pt-16">
                  <div className="mx-auto max-w-[360px] space-y-5">
                    {events.slice(0, msgCount).map((evt, index) => (
                      <motion.div
                        key={`${evt.type}-${index}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.24 }}
                      >
                        {evt.type === "moderator" ? (
                          <div
                            className="rounded-lg px-4 py-4"
                            style={{ background: L.bgSub, border: `1px solid ${L.border}` }}
                          >
                            <div className="mb-2 flex items-center justify-center gap-2">
                              <span className="size-1.5 rounded-full" style={{ background: "var(--ghost-green)" }} />
                              <span className="text-xs font-semibold" style={{ color: L.text }}>
                                {t("twoAgents.mockup.moderator")}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed" style={{ color: L.textSub }}>
                              {evt.text}
                            </p>
                          </div>
                        ) : evt.type === "summary" ? (
                          <div className="px-2">
                            <div className="mb-3 flex items-center gap-3">
                              <div className="h-px flex-1" style={{ background: L.border }} />
                              <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: L.textFaint }}>
                                AI Moderator
                              </span>
                              <div className="h-px flex-1" style={{ background: L.border }} />
                            </div>
                            <p className="text-sm leading-relaxed" style={{ color: L.textMuted }}>
                              {evt.text}
                            </p>
                          </div>
                        ) : (
                          <div className="flex gap-3">
                            <div className="flex flex-col items-center shrink-0">
                              <HippyGhostAvatar seed={evt.seed} className="size-8 rounded-full" />
                              <div className="mt-2 w-px flex-1 bg-linear-to-b from-[rgba(221,217,208,1)] to-transparent" />
                            </div>
                            <div className="flex-1">
                              <div className="mb-1.5 flex items-center gap-2">
                                <span className="text-sm font-semibold" style={{ color: L.text }}>
                                  {evt.name}
                                </span>
                                <span
                                  className="rounded border px-1.5 py-0.5 text-[10px]"
                                  style={{ borderColor: L.border, background: L.bgSub, color: L.textFaint }}
                                >
                                  Participant
                                </span>
                              </div>
                              <p className="text-sm leading-relaxed" style={{ color: L.textSub }}>
                                {evt.text}
                              </p>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className="hidden w-[132px] shrink-0 border-l px-3 py-3 md:flex md:flex-col"
                style={{ borderColor: L.borderLight, background: L.bgSub }}
              >
                <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: L.textFaint }}>
                  Summary
                </p>
                <div className="mt-3 space-y-2">
                  <div className="rounded-lg px-2.5 py-2" style={{ background: L.bg, border: `1px solid ${L.borderLight}` }}>
                    <p className="text-[10px]" style={{ color: L.textFaint }}>
                      Signals
                    </p>
                    <p className="mt-1 text-xs font-medium" style={{ color: L.text }}>
                      Packaging nostalgia rising
                    </p>
                  </div>
                  <div className="rounded-lg px-2.5 py-2" style={{ background: L.bg, border: `1px solid ${L.borderLight}` }}>
                    <p className="text-[10px]" style={{ color: L.textFaint }}>
                      Status
                    </p>
                    <p className="mt-1 text-xs font-medium" style={{ color: L.text }}>
                      Auto-summarizing
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {phase === "report" && (
            <motion.div
              key="report"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="flex h-full cursor-pointer"
              onClick={resetToPanel}
            >
              <div className="flex min-w-0 flex-1 flex-col px-4 py-4">
                <div className="mb-4 flex items-center gap-2">
                  <span className="size-1.5 rounded-full" style={{ background: L.blue }} />
                  <span className="text-xs uppercase tracking-[0.18em]" style={{ color: L.textFaint }}>
                    Discussion Summary
                  </span>
                </div>
                <h3 className="text-base font-semibold" style={{ color: L.text }}>
                  {t("twoAgents.mockup.reportTitle")}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: L.textMuted }}>
                  {t("twoAgents.mockup.modSummary")}
                </p>

                <div className="mt-4 grid gap-2">
                  <div className="rounded-lg px-3 py-3" style={{ background: L.bgCard, border: `1px solid ${L.borderLight}` }}>
                    <p className="text-[10px] uppercase tracking-[0.16em]" style={{ color: L.textFaint }}>
                      Insight
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed" style={{ color: L.text }}>
                      {t("twoAgents.mockup.insightText")}
                    </p>
                  </div>
                  <div className="rounded-lg px-3 py-3" style={{ background: L.bgCard, border: `1px solid ${L.borderLight}` }}>
                    <p className="text-[10px] uppercase tracking-[0.16em]" style={{ color: L.textFaint }}>
                      Recommended next step
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed" style={{ color: L.text }}>
                      Move the strongest route into concept scoring and follow-up interviews.
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="hidden w-[140px] shrink-0 border-l px-3 py-4 md:flex md:flex-col"
                style={{ borderColor: L.borderLight, background: L.bgCard }}
              >
                <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: L.textFaint }}>
                  Project
                </p>
                <div className="mt-2 rounded-lg px-2.5 py-2" style={{ background: L.bg, border: `1px solid ${L.borderLight}` }}>
                  <p className="text-xs font-medium" style={{ color: L.text }}>
                    Lunar snack concept review
                  </p>
                  <p className="mt-1 text-[10px]" style={{ color: L.textFaint }}>
                    6 participants · completed
                  </p>
                </div>

                <p className="mt-4 text-[10px] uppercase tracking-[0.18em]" style={{ color: L.textFaint }}>
                  Output
                </p>
                <div className="mt-2 space-y-2">
                  <div className="rounded-lg px-2.5 py-2" style={{ background: L.bgSub, border: `1px solid ${L.border}` }}>
                    <p className="text-[10px]" style={{ color: L.textFaint }}>
                      Summary
                    </p>
                    <p className="mt-1 text-xs font-medium" style={{ color: L.text }}>
                      Ready
                    </p>
                  </div>
                  <div className="rounded-lg px-2.5 py-2" style={{ background: L.bgSub, border: `1px solid ${L.border}` }}>
                    <p className="text-[10px]" style={{ color: L.textFaint }}>
                      Report
                    </p>
                    <p className="mt-1 text-xs font-medium" style={{ color: L.text }}>
                      Drafting
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ProductFrame>
  );
}
