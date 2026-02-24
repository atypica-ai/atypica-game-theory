"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "../HomeV43.module.css";
import ChapterPanel from "../components/ChapterPanel";
import { CHAPTERS, SIGNAL_SNAPSHOTS, THREE_MODES } from "../content";

const copy = CHAPTERS[3];

/* ── Signal Mode: Animated Treemap / Histomap ── */

type Block = { id: string; label: string; weight: number };

/** Slice-and-dice treemap: alternates horizontal/vertical splits to fill the rectangle */
function layoutTreemap(blocks: Block[], W: number, H: number) {
  type Rect = { id: string; label: string; x: number; y: number; w: number; h: number };
  const sorted = [...blocks].sort((a, b) => b.weight - a.weight);
  const total = sorted.reduce((s, b) => s + b.weight, 0);
  const result: Rect[] = [];

  function subdivide(items: Block[], x: number, y: number, w: number, h: number, horiz: boolean) {
    if (items.length === 0) return;
    if (items.length === 1) {
      result.push({ id: items[0].id, label: items[0].label, x, y, w, h });
      return;
    }
    const sum = items.reduce((s, b) => s + b.weight, 0);
    // Split into two groups as close to half as possible
    let acc = 0;
    let splitIdx = 0;
    for (let i = 0; i < items.length - 1; i++) {
      acc += items[i].weight;
      if (acc >= sum / 2) {
        splitIdx = i + 1;
        break;
      }
    }
    if (splitIdx === 0) splitIdx = 1;
    const groupA = items.slice(0, splitIdx);
    const groupB = items.slice(splitIdx);
    const ratioA = groupA.reduce((s, b) => s + b.weight, 0) / sum;

    if (horiz) {
      const wA = w * ratioA;
      subdivide(groupA, x, y, wA, h, !horiz);
      subdivide(groupB, x + wA, y, w - wA, h, !horiz);
    } else {
      const hA = h * ratioA;
      subdivide(groupA, x, y, w, hA, !horiz);
      subdivide(groupB, x, y + hA, w, h - hA, !horiz);
    }
  }

  subdivide(
    sorted.map((b) => ({ ...b, weight: b.weight / total })),
    0, 0, W, H, W >= H,
  );
  return result;
}

function SignalMockup() {
  const t = useTranslations("HomeAtypicaV2");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((prev) => (prev + 1) % SIGNAL_SNAPSHOTS.length), 2500);
    return () => clearInterval(id);
  }, []);

  const snapshot = SIGNAL_SNAPSHOTS[tick];
  const signalLabels: Record<string, string> = {
    cleanBeauty: t("threeModes.signal.cleanBeauty"),
    priceSensitivity: t("threeModes.signal.priceSensitivity"),
    kolMentions: t("threeModes.signal.kolMentions"),
    brandRecall: t("threeModes.signal.brandRecall"),
    sustainability: t("threeModes.signal.sustainability"),
    peerReviews: t("threeModes.signal.peerReviews"),
    packaging: t("threeModes.signal.packaging"),
  };
  const labeledSnapshot: Block[] = snapshot.map((b) => ({
    ...b,
    label: signalLabels[b.labelKey] ?? b.labelKey,
  }));
  // Layout in percentage coordinates (0-100)
  const rects = useMemo(() => layoutTreemap(labeledSnapshot, 100, 100), [labeledSnapshot]);

  return (
    <div className="relative w-full h-full">
      {/* Time axis */}
      <div className="absolute top-2 left-3 right-3 flex items-center gap-2 z-10">
        <motion.span
          className="w-1.5 h-1.5 rounded-full bg-[#1bff1b]"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <span className="font-IBMPlexMono text-[10px] text-zinc-500">{t("threeModes.signal.mapLabel")}</span>
        <div className="flex-1" />
        {["T-2", "T-1", "NOW"].map((label, i) => (
          <span
            key={label}
            className={cn(
              "font-IBMPlexMono text-[9px]",
              i === tick ? "text-[#1bff1b]" : "text-zinc-700",
            )}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Treemap blocks — div-based with percentage positioning */}
      {rects.map((r) => {
        const area = r.w * r.h;
        return (
          <motion.div
            key={r.id}
            className="absolute border border-[rgba(27,255,27,0.15)] flex items-center justify-center overflow-hidden"
            style={{
              backgroundColor: `rgba(27,255,27,${0.03 + (area / 10000) * 0.12})`,
            }}
            animate={{
              left: `${r.x}%`,
              top: `${r.y}%`,
              width: `${r.w}%`,
              height: `${r.h}%`,
            }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            <span
              className={cn(
                "font-IBMPlexMono text-center leading-tight pointer-events-none",
                area > 800 ? "text-[10px]" : "text-[8px]",
              )}
              style={{ color: `rgba(27,255,27,${0.3 + (area / 10000) * 0.5})` }}
            >
              {r.label}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── Deep Mode: 3-screen Research Workflow ── */

function DeepMockup() {
  const t = useTranslations("HomeAtypicaV2");
  const [screen, setScreen] = useState(0);

  const screens = [
    {
      label: t("threeModes.deep.tabBrief"),
      content: (
        <div className="p-4 flex flex-col gap-3 h-full justify-center">
          <div className="border border-[rgba(147,197,253,0.2)] bg-[rgba(147,197,253,0.04)] p-3">
            <span className="font-IBMPlexMono text-[10px] text-zinc-500 block mb-2">
              {t("threeModes.deep.researchQuestion")}
            </span>
            <span className="text-xs text-zinc-300 leading-relaxed">
              {t("threeModes.deep.briefQuestion")}
            </span>
          </div>
          <motion.div
            className="self-end px-3 py-1 bg-[rgba(147,197,253,0.15)] font-IBMPlexMono text-[10px] text-[#93c5fd]"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {t("threeModes.deep.submit")}
          </motion.div>
        </div>
      ),
    },
    {
      label: t("threeModes.deep.tabIntent"),
      content: (
        <div className="p-4 flex flex-col gap-2 h-full justify-center">
          <span className="font-IBMPlexMono text-[10px] text-zinc-500">{t("threeModes.deep.studyPlan")}</span>
          {[t("threeModes.deep.planStep1"), t("threeModes.deep.planStep2"), t("threeModes.deep.planStep3")].map(
            (step, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.3 }}
                className="flex items-center gap-2 py-1.5 px-2.5 border border-[rgba(147,197,253,0.12)]"
              >
                <span className="w-5 h-5 rounded-full border border-[rgba(147,197,253,0.3)] grid place-items-center text-[10px] text-[#93c5fd] shrink-0">
                  {i + 1}
                </span>
                <span className="text-xs text-zinc-400">{step}</span>
              </motion.div>
            ),
          )}
          <motion.div
            className="mt-1 self-end px-3 py-1 bg-[rgba(147,197,253,0.15)] font-IBMPlexMono text-[10px] text-[#93c5fd]"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {t("threeModes.deep.confirmPlan")}
          </motion.div>
        </div>
      ),
    },
    {
      label: t("threeModes.deep.tabExecute"),
      content: (
        <div className="p-4 flex flex-col gap-2 h-full justify-center">
          <span className="font-IBMPlexMono text-[10px] text-zinc-500">{t("threeModes.deep.executing")}</span>
          {[
            { step: t("threeModes.deep.execScout"), status: "done" },
            { step: t("threeModes.deep.execInterview"), status: "done" },
            { step: t("threeModes.deep.execAnalyze"), status: "running" },
            { step: t("threeModes.deep.execReport"), status: "pending" },
          ].map((s, i) => (
            <div key={s.step} className="flex items-center gap-2.5 py-1 px-2.5">
              {s.status === "done" ? (
                <span className="text-xs text-[#93c5fd]">✓</span>
              ) : s.status === "running" ? (
                <motion.span
                  className="w-2 h-2 rounded-full bg-[#93c5fd]"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              ) : (
                <span className="w-2 h-2 rounded-full bg-zinc-700" />
              )}
              <span
                className={cn(
                  "text-xs",
                  s.status === "done" ? "text-zinc-400" : s.status === "running" ? "text-zinc-300" : "text-zinc-600",
                )}
              >
                {s.step}
              </span>
              {s.status === "done" && (
                <motion.div
                  className="ml-auto h-1 rounded-full bg-[rgba(147,197,253,0.3)]"
                  initial={{ width: 0 }}
                  animate={{ width: 30 + i * 10 }}
                  transition={{ duration: 0.5, delay: i * 0.2 }}
                />
              )}
            </div>
          ))}
        </div>
      ),
    },
  ];

  useEffect(() => {
    const id = setInterval(() => setScreen((s) => (s + 1) % screens.length), 3000);
    return () => clearInterval(id);
  }, [screens.length]);

  return (
    <div className="flex flex-col h-full">
      {/* Screen tabs */}
      <div className="flex border-b border-zinc-800">
        {screens.map((s, i) => (
          <button
            key={s.label}
            type="button"
            className={cn(
              "flex-1 py-1.5 font-IBMPlexMono text-[10px] tracking-wide transition-colors duration-200 cursor-pointer border-none bg-transparent",
              i === screen ? "text-[#93c5fd]" : "text-zinc-600",
            )}
            style={i === screen ? { borderBottom: "1px solid #93c5fd" } : undefined}
            onClick={() => setScreen(i)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Screen content */}
      <div className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="h-full"
          >
            {screens[screen].content}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Live Mode: Focused Interview Chat ── */

function LiveMockup() {
  const t = useTranslations("HomeAtypicaV2");
  const [msgIndex, setMsgIndex] = useState(0);
  const [showMic, setShowMic] = useState(true);

  const messages = [
    { role: "ai" as const, text: t("threeModes.live.msg1") },
    { role: "user" as const, text: t("threeModes.live.msg2") },
    { role: "ai" as const, text: t("threeModes.live.msg3") },
  ];

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      setMsgIndex(0);
      setShowMic(true);

      messages.forEach((msg, i) => {
        timers.push(
          setTimeout(() => {
            setMsgIndex(i);
            setShowMic(msg.role === "ai");
          }, i * 2800),
        );
      });
      timers.push(setTimeout(run, messages.length * 2800 + 2000));
    };
    run();
    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const msg = messages[msgIndex];

  return (
    <div className="flex flex-col h-full px-4 relative">
      {/* Centered message — takes up most of the space */}
      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={msgIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="text-center max-w-[85%]"
          >
            {msg.role === "ai" ? (
              <p className="text-xs leading-relaxed text-zinc-200">{msg.text}</p>
            ) : (
              <p className="text-xs leading-relaxed text-zinc-500 italic">
                &ldquo;{msg.text}&rdquo;
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Mic indicator — pinned near bottom */}
      <div className="shrink-0 pb-6 flex justify-center">
        {showMic ? (
          <motion.div
            className="flex flex-col items-center gap-1.5"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="w-8 h-8 rounded-full border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.08)] grid place-items-center">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(245,158,11,0.7)"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
              </svg>
            </div>
            <span className="font-IBMPlexMono text-[9px] text-[rgba(245,158,11,0.5)]">
              {t("threeModes.live.listening")}
            </span>
          </motion.div>
        ) : (
          // Placeholder to keep layout stable when mic hidden
          <div className="h-12" />
        )}
      </div>

      {/* Progress dots at bottom */}
      <div className="absolute bottom-3 flex gap-1.5">
        {messages.map((_, i) => (
          <span
            key={i}
            className={cn(
              "w-1 h-1 rounded-full transition-colors duration-300",
              i <= msgIndex ? "bg-[#f59e0b]" : "bg-zinc-700",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Section ── */

const MOCKUPS = [SignalMockup, DeepMockup, LiveMockup];

export default function ThreeModesSection({
  register,
}: {
  register: (el: HTMLElement | null) => void;
}) {
  const t = useTranslations("HomeAtypicaV2");

  return (
    <section
      ref={register}
      id={copy.id}
      className="relative z-2 py-20 border-t border-zinc-800 max-lg:py-15"
    >
      <ChapterPanel variant="dark">
        <div className="mb-12">
          <div className="font-IBMPlexMono text-xs tracking-[0.18em] text-[#1bff1b] mb-4">
            {copy.number}
          </div>
          <p className="font-IBMPlexMono text-xs tracking-[0.14em] uppercase text-zinc-300 mb-3">
            {t("threeModes.kicker")}
          </p>
          <h2 className="m-0 font-EuclidCircularA text-3xl lg:text-4xl xl:text-5xl font-medium leading-[1.1]">
            {t("threeModes.title")}
          </h2>
          <p className="mt-4 max-w-[64ch] text-base lg:text-lg leading-relaxed text-zinc-300">
            {t("threeModes.body")}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-1">
            {THREE_MODES.map((mode, i) => {
              const Mockup = MOCKUPS[i];
              return (
                <Link key={mode.key} href={mode.link} className={styles.modeCard}>
                  <div className="aspect-[4/3] bg-zinc-900 border-b border-zinc-800 relative overflow-hidden">
                    <Mockup />
                  </div>
                  <div className="p-5 flex-1">
                    <div
                      className="font-IBMPlexMono text-xs tracking-[0.18em] uppercase mb-2"
                      style={{ color: mode.accent }}
                    >
                      {t(`threeModes.${mode.key}.badge`)}
                    </div>
                    <h3 className="text-lg font-medium mb-2">{t(`threeModes.${mode.key}.title`)}</h3>
                    <p className="text-sm leading-relaxed text-zinc-300">{t(`threeModes.${mode.key}.description`)}</p>
                    <p className="mt-3 font-IBMPlexMono text-xs text-[#1bff1b]">{t("threeModes.explore")} &rarr;</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.div>
      </ChapterPanel>
    </section>
  );
}
