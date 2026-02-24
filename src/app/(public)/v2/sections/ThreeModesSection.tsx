"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import React, { useCallback, useEffect, useRef, useState } from "react";
import ChapterPanel from "../components/ChapterPanel";
import { CHAPTERS, WORKFLOW_GOALS } from "../content";

const copy = CHAPTERS[3];

/* Light theme color tokens */
const L = {
  bg: "#f5f3ef",
  bgSub: "#eceae4",
  border: "#ddd9d0",
  borderLight: "#e8e5de",
  text: "#1a1714",
  textMuted: "#7a7068",
  textFaint: "#a8a098",
  accent: "#16a34a",
  accentBg: "rgba(22,163,74,0.06)",
  blue: "#2563eb",
  blueBg: "rgba(37,99,235,0.06)",
  amber: "#d97706",
  amberBg: "rgba(217,119,6,0.06)",
};

/* ═══════════════════════════════════════════════
   Shared Chrome & Primitives
   ═══════════════════════════════════════════════ */

function AppChrome({
  title,
  badge,
  badgeColor,
  step,
  totalSteps,
  children,
}: {
  title: string;
  badge: string;
  badgeColor: string;
  step: number;
  totalSteps: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-full select-none" style={{ background: L.bg }}>
      {/* Header bar */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-2 border-b" style={{ borderColor: L.border, background: L.bgSub }}>
        <span className="font-IBMPlexMono text-xs tracking-[0.06em]" style={{ color: L.textMuted }}>atypica.AI</span>
        <span className="w-px h-3" style={{ background: L.border }} />
        <span className="text-xs truncate flex-1" style={{ color: L.text }}>{title}</span>
        <span className="font-IBMPlexMono text-xs tracking-[0.1em] uppercase px-1.5 py-0.5 border" style={{ color: badgeColor, borderColor: `${badgeColor}33` }}>
          {badge}
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden relative">{children}</div>
      {/* Progress bar instead of dots */}
      <div className="shrink-0 h-0.5" style={{ background: L.border }}>
        <motion.div
          className="h-full"
          style={{ background: badgeColor }}
          animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
    </div>
  );
}

/* Typing text animation */
function TypeText({ text, speed = 30, className }: { text: string; speed?: number; className?: string }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return <span className={className}>{displayed}<span className="animate-pulse">|</span></span>;
}

/* page-slide transition */
const pageVariants = {
  enter: { opacity: 0, x: 30 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

/* ═══════════════════════════════════════════════
   Reusable Screen Components (Light theme)
   ═══════════════════════════════════════════════ */

function InputScreen({ label, placeholder, buttonText }: { label: string; placeholder: string; buttonText: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 gap-4">
      <span className="font-IBMPlexMono text-xs tracking-[0.1em] uppercase" style={{ color: L.textMuted }}>{label}</span>
      <div className="w-full max-w-[320px] border px-3 py-3 text-xs leading-relaxed min-h-[64px]" style={{ borderColor: L.border, background: "white", color: L.text }}>
        <TypeText text={placeholder} speed={20} />
      </div>
      <motion.div
        className="px-4 py-1.5 font-IBMPlexMono text-xs tracking-[0.04em] text-white"
        style={{ background: L.accent }}
        animate={{ opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {buttonText}
      </motion.div>
    </div>
  );
}

function PlanScreen({ steps, buttonText }: { steps: string[]; buttonText: string }) {
  return (
    <div className="flex flex-col justify-center h-full px-6 gap-2">
      <span className="font-IBMPlexMono text-xs tracking-[0.1em] uppercase mb-2" style={{ color: L.textMuted }}>Study Plan</span>
      {steps.map((s, i) => (
        <motion.div
          key={s}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.4 }}
          className="flex items-center gap-2.5 py-2 px-3 border"
          style={{ borderColor: L.borderLight, background: "white" }}
        >
          <motion.span
            className="w-5 h-5 rounded-full grid place-items-center font-IBMPlexMono text-xs shrink-0"
            initial={{ background: "transparent", borderColor: L.border }}
            animate={{ background: L.accentBg }}
            transition={{ delay: i * 0.4 + 0.2 }}
            style={{ border: `1px solid ${L.border}`, color: L.accent }}
          >
            {i + 1}
          </motion.span>
          <span className="text-xs" style={{ color: L.text }}>{s}</span>
          <motion.span className="ml-auto text-xs" style={{ color: L.accent }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.4 + 0.3 }}>
            ✓
          </motion.span>
        </motion.div>
      ))}
      <motion.div
        className="self-end mt-2 px-4 py-1.5 font-IBMPlexMono text-xs text-white"
        style={{ background: L.blue }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: steps.length * 0.4 }}
      >
        {buttonText}
      </motion.div>
    </div>
  );
}

function ConsoleScreen({ userMsg, aiReply, tools }: { userMsg: string; aiReply: string; tools: { name: string; status: "done" | "running" | "pending"; result?: string }[] }) {
  const [visibleTools, setVisibleTools] = useState(0);
  useEffect(() => {
    setVisibleTools(0);
    const timers = tools.map((_, i) => setTimeout(() => setVisibleTools(i + 1), (i + 1) * 800));
    return () => timers.forEach(clearTimeout);
  }, [tools]);

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col" style={{ borderRight: `1px solid ${L.border}` }}>
        <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden">
          <div className="self-end max-w-[80%] rounded-lg px-3 py-2 text-xs" style={{ background: L.accent, color: "white" }}>{userMsg}</div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="max-w-[85%] text-xs leading-relaxed" style={{ color: L.textMuted }}>
            <TypeText text={aiReply} speed={15} />
          </motion.div>
        </div>
        <div className="shrink-0 px-3 py-2 flex items-center gap-2" style={{ borderTop: `1px solid ${L.border}` }}>
          <div className="flex-1 h-7 rounded px-2 flex items-center border" style={{ background: "white", borderColor: L.border }}>
            <span className="text-xs" style={{ color: L.textFaint }}>Follow up...</span>
          </div>
          <div className="w-6 h-6 rounded grid place-items-center" style={{ background: L.accent }}><span className="text-white text-xs">→</span></div>
        </div>
      </div>
      <div className="w-[140px] shrink-0 p-3 flex flex-col gap-1.5 max-lg:hidden" style={{ background: L.bgSub }}>
        <span className="font-IBMPlexMono text-xs tracking-[0.12em] uppercase mb-1" style={{ color: L.textFaint }}>Console</span>
        {tools.map((t, i) => (
          <motion.div key={t.name} initial={{ opacity: 0, x: 4 }} animate={{ opacity: i < visibleTools ? 1 : 0, x: i < visibleTools ? 0 : 4 }} transition={{ duration: 0.3 }} className="flex items-start gap-1.5">
            {t.status === "done" ? (
              <span className="text-xs mt-px shrink-0" style={{ color: L.accent }}>✓</span>
            ) : t.status === "running" ? (
              <motion.span className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ background: L.blue }} animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.6, repeat: Infinity }} />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ background: L.border }} />
            )}
            <div>
              <span className="font-IBMPlexMono text-xs block" style={{ color: L.text }}>{t.name}</span>
              {t.result && <span className="font-IBMPlexMono text-xs block" style={{ color: L.textFaint }}>{t.result}</span>}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function InterviewScreen({ personaName, personaMeta, question, answer }: { personaName: string; personaMeta: string; question: string; answer: string }) {
  const [showAnswer, setShowAnswer] = useState(false);
  useEffect(() => { setShowAnswer(false); const t = setTimeout(() => setShowAnswer(true), 2000); return () => clearTimeout(t); }, [question]);

  return (
    <div className="flex flex-col h-full items-center">
      <div className="shrink-0 flex flex-col items-center pt-4 pb-2">
        <div className="w-7 h-7 rounded-full grid place-items-center mb-1" style={{ background: L.amberBg, border: `1px solid ${L.border}` }}>
          <span className="text-xs" style={{ color: L.amber }}>P</span>
        </div>
        <span className="font-IBMPlexMono text-xs" style={{ color: L.text }}>{personaName}</span>
        <span className="font-IBMPlexMono text-xs" style={{ color: L.textFaint }}>{personaMeta}</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4 w-full">
        <p className="text-sm leading-relaxed text-center max-w-[85%]" style={{ color: L.text }}>{question}</p>
        <AnimatePresence>
          {showAnswer ? (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg px-4 py-2.5 max-w-[85%]" style={{ background: L.bgSub, border: `1px solid ${L.border}` }}>
              <p className="text-xs leading-relaxed italic" style={{ color: L.textMuted }}>&ldquo;{answer}&rdquo;</p>
            </motion.div>
          ) : (
            <motion.div className="flex items-center gap-1.5" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity }}>
              <motion.span className="w-1.5 h-1.5 rounded-full" style={{ background: L.amber }} animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
              <motion.span className="w-1.5 h-1.5 rounded-full" style={{ background: L.amber }} animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }} />
              <motion.span className="w-1.5 h-1.5 rounded-full" style={{ background: L.amber }} animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="shrink-0 pb-3 flex flex-col items-center gap-1">
        <div className="w-7 h-7 rounded-full grid place-items-center" style={{ background: L.amberBg, border: `1px solid rgba(217,119,6,0.2)` }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={L.amber} strokeWidth="2" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /></svg>
        </div>
      </div>
    </div>
  );
}

function SignalScreen({ platforms, signals, trending }: { platforms: { name: string; change: string; up: boolean }[]; signals: { label: string; strength: number }[]; trending: string }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((t) => t + 1), 800); return () => clearInterval(id); }, []);

  return (
    <div className="p-4 flex flex-col gap-3 h-full">
      <div className="flex items-center gap-3">
        <motion.span className="w-1.5 h-1.5 rounded-full" style={{ background: L.accent }} animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
        <span className="font-IBMPlexMono text-xs" style={{ color: L.textMuted }}>LIVE</span>
        <span className="w-px h-3" style={{ background: L.border }} />
        <span className="font-IBMPlexMono text-xs tabular-nums" style={{ color: L.textMuted }}>{platforms.length} sources</span>
        <span className="w-px h-3" style={{ background: L.border }} />
        <motion.span className="font-IBMPlexMono text-xs tabular-nums" style={{ color: L.accent }} key={tick}>{847 + tick * 7}</motion.span>
        <span className="font-IBMPlexMono text-xs" style={{ color: L.textMuted }}>signals</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5 max-lg:grid-cols-2">
        {platforms.map((p) => (
          <div key={p.name} className="border px-2 py-1.5" style={{ borderColor: L.borderLight, background: "white" }}>
            <span className="font-IBMPlexMono text-xs block" style={{ color: L.textFaint }}>{p.name}</span>
            <span className={cn("font-IBMPlexMono text-sm font-medium")} style={{ color: p.up ? L.accent : "#dc2626" }}>{p.change}</span>
          </div>
        ))}
      </div>
      <div className="flex-1 flex flex-col gap-1.5 justify-center">
        {signals.map((s) => {
          const jitter = Math.sin(tick * 0.5 + s.strength * 10) * 0.06;
          const w = Math.max(0.1, Math.min(1, s.strength + jitter));
          return (
            <div key={s.label} className="flex items-center gap-2">
              <span className="font-IBMPlexMono text-xs w-24 text-right shrink-0 truncate" style={{ color: L.textMuted }}>{s.label}</span>
              <div className="flex-1 h-2.5 relative overflow-hidden" style={{ background: L.bgSub }}>
                <motion.div className="absolute inset-y-0 left-0" style={{ background: `${L.accent}30` }} animate={{ width: `${w * 100}%` }} transition={{ duration: 0.5 }} />
              </div>
              <span className="font-IBMPlexMono text-xs w-6 shrink-0 tabular-nums" style={{ color: L.textMuted }}>{Math.round(w * 100)}</span>
            </div>
          );
        })}
      </div>
      <div className="shrink-0 pt-2 flex items-center gap-2" style={{ borderTop: `1px solid ${L.border}` }}>
        <span className="font-IBMPlexMono text-xs tracking-[0.1em] uppercase" style={{ color: L.textFaint }}>Trending</span>
        <span className="text-xs truncate" style={{ color: L.text }}>{trending}</span>
      </div>
    </div>
  );
}

function SelectScreen({ label, items, buttonText }: { label: string; items: { id: string; desc: string }[]; buttonText: string }) {
  const [selected, setSelected] = useState(0);
  useEffect(() => { setSelected(0); const t = setTimeout(() => setSelected(1), 800); return () => clearTimeout(t); }, [items]);

  return (
    <div className="flex flex-col justify-center h-full px-6 gap-2">
      <span className="font-IBMPlexMono text-xs tracking-[0.1em] uppercase mb-2" style={{ color: L.textMuted }}>{label}</span>
      {items.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.2 }}
          className="flex items-center gap-2.5 py-2 px-3 border transition-colors cursor-default"
          style={{ borderColor: i <= selected ? L.accent : L.borderLight, background: i <= selected ? L.accentBg : "white" }}
        >
          <span className={cn("w-3 h-3 rounded-full border shrink-0")} style={{ borderColor: i <= selected ? L.accent : L.border, background: i <= selected ? L.accent : "transparent" }}>
            {i <= selected && <span className="block w-full h-full rounded-full" style={{ background: L.accent }} />}
          </span>
          <div>
            <span className="text-xs block" style={{ color: L.text }}>{item.id}</span>
            <span className="text-xs" style={{ color: L.textFaint }}>{item.desc}</span>
          </div>
        </motion.div>
      ))}
      <motion.div className="self-end mt-2 px-4 py-1.5 font-IBMPlexMono text-xs text-white" style={{ background: L.accent }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: items.length * 0.2 }}>
        {buttonText}
      </motion.div>
    </div>
  );
}

function ResultScreen({ title, stats, finding, actions }: { title: string; stats?: { label: string; value: string }[]; finding: string; actions: string[] }) {
  return (
    <div className="flex flex-col justify-center h-full px-6 gap-4">
      <div className="flex items-center gap-2">
        <motion.span style={{ color: L.accent }} className="text-xs" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>✓</motion.span>
        <span className="font-IBMPlexMono text-xs tracking-[0.1em] uppercase" style={{ color: L.text }}>{title}</span>
      </div>
      {stats && (
        <div className="flex gap-3">
          {stats.map((s, i) => (
            <motion.div key={s.label} className="border py-2 px-3" style={{ borderColor: L.borderLight, background: "white" }} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }}>
              <span className="font-IBMPlexMono text-xs tracking-[0.08em] uppercase block" style={{ color: L.textFaint }}>{s.label}</span>
              <span className="text-sm font-medium block mt-0.5" style={{ color: L.text }}>{s.value}</span>
            </motion.div>
          ))}
        </div>
      )}
      <motion.p className="text-xs leading-relaxed border-l-2 pl-3" style={{ color: L.textMuted, borderColor: `${L.accent}40` }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        {finding}
      </motion.p>
      <div className="flex gap-2">
        {actions.map((a) => (
          <span key={a} className="px-3 py-1 border font-IBMPlexMono text-xs cursor-default" style={{ borderColor: L.border, color: L.text }}>{a}</span>
        ))}
      </div>
    </div>
  );
}

function PanelScreen({ messages, countLabel }: { messages: { persona: string; text: string }[]; countLabel: string }) {
  return (
    <div className="flex flex-col h-full px-5 py-4 gap-2">
      <span className="font-IBMPlexMono text-xs tracking-[0.1em] uppercase mb-1" style={{ color: L.textMuted }}>Panel Discussion</span>
      <div className="flex-1 flex flex-col gap-2 overflow-hidden">
        {messages.map((m, i) => (
          <motion.div key={m.persona} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.6 }} className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full grid place-items-center shrink-0 mt-0.5" style={{ background: L.bgSub, border: `1px solid ${L.border}` }}>
              <span className="text-xs" style={{ color: L.textMuted }}>P</span>
            </span>
            <div className="border rounded-lg px-3 py-2" style={{ borderColor: L.borderLight, background: "white" }}>
              <span className="font-IBMPlexMono text-xs block" style={{ color: L.textFaint }}>{m.persona}</span>
              <p className="text-xs leading-relaxed italic" style={{ color: L.textMuted }}>&ldquo;{m.text}&rdquo;</p>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="shrink-0 pt-2" style={{ borderTop: `1px solid ${L.border}` }}>
        <span className="font-IBMPlexMono text-xs" style={{ color: L.textFaint }}>{countLabel}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Flow Definitions
   ═══════════════════════════════════════════════ */

type FlowStep = { badge: string; badgeColor: string; title: string; duration: number; render: () => React.ReactNode };

const FLOWS: Record<string, FlowStep[]> = {
  consumerInsight: [
    { badge: "SIGNAL", badgeColor: L.accent, title: "Scout: Skincare Trends", duration: 3000, render: () => <SelectScreen label="Select platforms to scout" items={[{ id: "TikTok", desc: "Short video + comments" }, { id: "RED (Xiaohongshu)", desc: "Lifestyle reviews" }, { id: "Weibo", desc: "Public discourse" }]} buttonText="Start Scout →" /> },
    { badge: "SIGNAL", badgeColor: L.accent, title: "Scouting: Skincare Trends", duration: 5000, render: () => <SignalScreen platforms={[{ name: "TikTok", change: "+23%", up: true }, { name: "RED", change: "-5%", up: false }, { name: "Weibo", change: "+8%", up: true }]} signals={[{ label: "Clean Beauty", strength: 0.85 }, { label: "Price Talk", strength: 0.62 }, { label: "KOL Mentions", strength: 0.78 }, { label: "Sustainability", strength: 0.45 }]} trending="Clean Beauty sentiment ↑ 23% this week" /> },
    { badge: "REPORT", badgeColor: L.accent, title: "Insight Report", duration: 4000, render: () => <ResultScreen title="Consumer Insight Report" stats={[{ label: "Signals", value: "847" }, { label: "Platforms", value: "3" }, { label: "Trends", value: "12" }]} finding='"Clean beauty" surging with Gen-Z, but price sensitivity rising — opportunity for affordable-clean positioning.' actions={["View Full Report", "Start Deep Study"]} /> },
  ],
  conceptTesting: [
    { badge: "DEEP", badgeColor: L.blue, title: "New Study", duration: 3500, render: () => <InputScreen label="Research Question" placeholder="Test our new skincare concept with Gen-Z consumers — focus on clean positioning and price sensitivity." buttonText="Submit →" /> },
    { badge: "DEEP", badgeColor: L.blue, title: "Study Plan", duration: 3500, render: () => <PlanScreen steps={["Build 6 Gen-Z personas (Tier 2)", "Run concept interviews with each", "Generate insight report with scoring"]} buttonText="Confirm Plan ✓" /> },
    { badge: "DEEP", badgeColor: L.blue, title: "Executing Study", duration: 5000, render: () => <ConsoleScreen userMsg="Test this skincare concept with Gen-Z" aiReply='Testing with 6 personas. Initial signal: 72% positive on "clean" positioning, but premium pricing triggers hesitation in 4/6...' tools={[{ name: "buildPersona", status: "done", result: "6 built" }, { name: "interviewChat", status: "done", result: "6/6 done" }, { name: "generateReport", status: "running" }]} /> },
  ],
  brandStrategy: [
    { badge: "LIVE", badgeColor: L.amber, title: "Brand Perception Study", duration: 3000, render: () => <SelectScreen label="Select personas to interview" items={[{ id: "Persona #2847", desc: "F · 28 · Premium shopper" }, { id: "Persona #1105", desc: "M · 35 · Budget-conscious" }, { id: "Persona #3021", desc: "F · 22 · Gen-Z explorer" }]} buttonText="Start Interview →" /> },
    { badge: "LIVE", badgeColor: L.amber, title: "Interview: #2847", duration: 5000, render: () => <InterviewScreen personaName="Persona #2847" personaMeta="Female · 28 · Premium" question="When you think of 'clean beauty', what brand comes to mind first?" answer="Probably Glossier? But I'm not sure they're actually 'clean'..." /> },
    { badge: "INSIGHT", badgeColor: L.amber, title: "Interview Summary", duration: 4000, render: () => <ResultScreen title="Brand Perception Summary" finding="3/3 personas associate 'clean' with 'natural ingredients' — not brand claims. Trust deficit on premium brands. Ingredients transparency > marketing." actions={["Generate Report", "More Interviews"]} /> },
  ],
  pricing: [
    { badge: "DEEP", badgeColor: L.blue, title: "Pricing Research", duration: 3500, render: () => <InputScreen label="Research Question" placeholder="Research willingness-to-pay for our 3-tier SaaS model: Free / Pro $49 / Enterprise $99" buttonText="Submit →" /> },
    { badge: "DEEP", badgeColor: L.blue, title: "Panel Discussion", duration: 5000, render: () => <PanelScreen messages={[{ persona: "#4201 · CTO", text: "$49 feels right for the features. $99 needs clearer enterprise value." }, { persona: "#4202 · PM", text: "Free tier is too limited — I'd churn. Mid-tier is the sweet spot." }, { persona: "#4203 · Founder", text: "I'd pay $99 if it saves 10+ hours/week." }]} countLabel="●●●○○○○○  3/8 speaking" /> },
    { badge: "REPORT", badgeColor: L.blue, title: "WTP Analysis", duration: 4000, render: () => <ResultScreen title="Pricing Analysis" stats={[{ label: "Free→Pro", value: "62%" }, { label: "Pro→Ent.", value: "31%" }, { label: "Best", value: "$49" }]} finding="Mid-tier ($49) has strongest conversion. Enterprise tier needs ROI proof — abstract value claims fail with technical buyers." actions={["Full Report", "Adjust Tiers"]} /> },
  ],
  socialListening: [
    { badge: "SIGNAL", badgeColor: L.accent, title: "Configure Monitor", duration: 3500, render: () => <InputScreen label="Brand to Monitor" placeholder="Competitor X — track product recall sentiment across Twitter, Reddit, and news outlets." buttonText="Start Monitoring →" /> },
    { badge: "SIGNAL", badgeColor: L.accent, title: "Live Monitor: Competitor X", duration: 5000, render: () => <SignalScreen platforms={[{ name: "Twitter", change: "+45%", up: true }, { name: "Reddit", change: "+18%", up: true }, { name: "News", change: "-2%", up: false }]} signals={[{ label: "Negative Sent.", strength: 0.72 }, { label: "Complaints", strength: 0.58 }, { label: "Alt-Seeking", strength: 0.67 }, { label: "Price Talk", strength: 0.41 }]} trending="Product recall → 67% seeking alternatives" /> },
    { badge: "ALERT", badgeColor: "#dc2626", title: "Opportunity Alert", duration: 4000, render: () => <ResultScreen title="⚡ Opportunity Detected" finding="Competitor recall driving 67% of users to seek alternatives. Strongest signal on Reddit. Window: 2-3 weeks before sentiment normalizes." actions={["Launch Campaign", "Create Study"]} /> },
  ],
  userExperience: [
    { badge: "LIVE", badgeColor: L.amber, title: "UX Research: Checkout", duration: 3000, render: () => <SelectScreen label="Select personas for UX interviews" items={[{ id: "Persona #1205", desc: "M · 34 · Price-sensitive" }, { id: "Persona #3344", desc: "F · 29 · Impulse buyer" }]} buttonText="Start Interviews →" /> },
    { badge: "LIVE", badgeColor: L.amber, title: "Interview: #1205", duration: 5000, render: () => <InterviewScreen personaName="Persona #1205" personaMeta="Male · 34 · Price-sensitive" question="Walk me through your last purchase — what almost stopped you?" answer="The shipping cost. It showed up at the very end, felt like a trap." /> },
    { badge: "INSIGHT", badgeColor: L.amber, title: "Journey Analysis", duration: 4000, render: () => <ResultScreen title="Checkout Journey Analysis" stats={[{ label: "Drop-off", value: "Checkout" }, { label: "Flagged", value: "4/5" }, { label: "Cause", value: "Hidden cost" }]} finding="Hidden shipping at checkout is #1 pain point. 4/5 flagged it. Recommendation: include shipping in price or show early." actions={["Journey Map", "Recommendations"]} /> },
  ],
  socialSimulation: [
    { badge: "DEEP", badgeColor: L.blue, title: "New Simulation", duration: 3500, render: () => <InputScreen label="Simulation Setup" placeholder="Simulate family responses to new parental leave policy across 200 archetypes in Tier 1-3 cities." buttonText="Submit →" /> },
    { badge: "DEEP", badgeColor: L.blue, title: "Running Simulation", duration: 5000, render: () => <ConsoleScreen userMsg="Simulate parental leave policy impact" aiReply="Strongest positive response in Tier-2 cities (61%). Urban dual-income families remain skeptical about job security..." tools={[{ name: "buildPersona", status: "done", result: "200 archetypes" }, { name: "discussionChat", status: "done", result: "20 panels" }, { name: "reasoning", status: "running" }]} /> },
    { badge: "REPORT", badgeColor: L.blue, title: "Simulation Report", duration: 4000, render: () => <ResultScreen title="Policy Impact Report" stats={[{ label: "Tier-1", value: "32% ↑" }, { label: "Tier-2", value: "61% ↑" }, { label: "Tier-3", value: "74% ↑" }]} finding="Overall +12% birth intention. Tier-2 most responsive. Urban dual-income needs additional childcare subsidy to move." actions={["Full Report", "Adjust Policy"]} /> },
  ],
  eventPrediction: [
    { badge: "SIGNAL", badgeColor: L.accent, title: "Event Tracker", duration: 3500, render: () => <InputScreen label="Event to Track" placeholder="Q4 Tech Market Outlook — multi-source sentiment tracking across analyst reports, social, and expert panels." buttonText="Start Tracking →" /> },
    { badge: "SIGNAL", badgeColor: L.accent, title: "Tracking: Q4 Outlook", duration: 5000, render: () => <SignalScreen platforms={[{ name: "Analyst", change: "73%", up: true }, { name: "Social", change: "61%", up: true }, { name: "Expert", change: "68%", up: true }, { name: "Market", change: "55%", up: false }]} signals={[{ label: "Bull Signal", strength: 0.73 }, { label: "Risk Aversion", strength: 0.45 }, { label: "Tech Rotation", strength: 0.62 }, { label: "Policy Risk", strength: 0.38 }]} trending="Multi-source: cautiously bullish consensus" /> },
    { badge: "REPORT", badgeColor: L.accent, title: "Prediction Consensus", duration: 4000, render: () => <ResultScreen title="Consensus Report" stats={[{ label: "Direction", value: "Bullish" }, { label: "Confidence", value: "68%" }, { label: "Agree", value: "3/4" }]} finding="Q4 cautiously bullish. Key risk: regulatory uncertainty. 3/4 sources agree. Analyst and expert panels most confident." actions={["Full Analysis", "Set Alert"]} /> },
  ],
};

/* ═══════════════════════════════════════════════
   Click-triggered Step Controller
   ═══════════════════════════════════════════════ */

function MockupPlayer({ goalKey }: { goalKey: string }) {
  const flow = FLOWS[goalKey] ?? FLOWS.consumerInsight;
  const [step, setStep] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const advanceStep = useCallback(() => {
    setStep((s) => {
      const next = (s + 1) % flow.length;
      return next;
    });
  }, [flow.length]);

  // Reset on goal change
  useEffect(() => {
    setStep(0);
  }, [goalKey]);

  // Auto-advance with per-step duration
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(advanceStep, flow[step].duration);
    return () => clearTimeout(timerRef.current);
  }, [goalKey, step, flow, advanceStep]);

  const current = flow[step];

  return (
    <AppChrome title={current.title} badge={current.badge} badgeColor={current.badgeColor} step={step} totalSteps={flow.length}>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${goalKey}-${step}`}
          variants={pageVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="h-full"
        >
          {current.render()}
        </motion.div>
      </AnimatePresence>
    </AppChrome>
  );
}

/* ═══════════════════════════════════════════════
   Section
   ═══════════════════════════════════════════════ */

export default function ThreeModesSection({
  register,
}: {
  register: (el: HTMLElement | null) => void;
}) {
  const t = useTranslations("HomeAtypicaV2");
  const [activeGoal, setActiveGoal] = useState(-1);
  const hasSelected = activeGoal >= 0;

  return (
    <section
      ref={register}
      id={copy.id}
      className="relative z-2 py-20 border-t border-zinc-800 max-lg:py-15"
    >
      <ChapterPanel variant="dark">
        <div className="mb-12">
          <div className="font-IBMPlexMono text-xs tracking-[0.18em] text-[#1bff1b] mb-4">{copy.number}</div>
          <p className="font-IBMPlexMono text-xs tracking-[0.14em] uppercase text-zinc-300 mb-3">{t("workflow.kicker")}</p>
          <h2 className="m-0 font-EuclidCircularA text-3xl lg:text-4xl xl:text-5xl font-medium leading-[1.1]">{t("workflow.title")}</h2>
          <p className="mt-4 max-w-[64ch] text-base lg:text-lg leading-relaxed text-zinc-300">{t("workflow.body")}</p>
        </div>

        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }}>
          {/* Desktop */}
          <div className="grid grid-cols-[260px_1fr] gap-4 max-lg:hidden">
            <div className="flex flex-col gap-1">
              {WORKFLOW_GOALS.map((g, i) => (
                <button
                  key={g.key}
                  type="button"
                  className={cn(
                    "border px-4 py-3 text-left cursor-pointer transition-all duration-200 bg-transparent",
                    activeGoal === i ? "border-zinc-600 bg-zinc-800/80" : "border-zinc-800 hover:border-zinc-700",
                  )}
                  onClick={() => setActiveGoal(i)}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: g.accent }} />
                    <span className={cn("font-IBMPlexMono text-xs tracking-[0.04em] font-medium transition-colors duration-200", activeGoal === i ? "text-zinc-100" : "text-zinc-400")}>
                      {t(`workflow.goals.${g.key}.label`)}
                    </span>
                  </div>
                  <p className={cn("text-xs leading-relaxed mt-1 pl-[18px] transition-colors duration-200", activeGoal === i ? "text-zinc-400" : "text-zinc-600")}>
                    {t(`workflow.goals.${g.key}.desc`)}
                  </p>
                </button>
              ))}
            </div>

            <div className="border border-zinc-700 overflow-hidden min-h-[420px]">
              <AnimatePresence mode="wait">
                {hasSelected ? (
                  <motion.div
                    key={WORKFLOW_GOALS[activeGoal].key}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                  >
                    <MockupPlayer goalKey={WORKFLOW_GOALS[activeGoal].key} />
                  </motion.div>
                ) : (
                  <motion.div key="empty" className="h-full flex flex-col items-center justify-center gap-3">
                    <motion.div className="grid grid-cols-3 gap-1.5" animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 3, repeat: Infinity }}>
                      {Array.from({ length: 9 }).map((_, i) => (
                        <span key={i} className={cn("w-3 h-3", i === 4 ? "bg-[#1bff1b]/20" : "bg-zinc-800")} />
                      ))}
                    </motion.div>
                    <span className="font-IBMPlexMono text-xs text-zinc-600">{t("workflow.centerDefault")}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile */}
          <div className="lg:hidden flex flex-col gap-2">
            {WORKFLOW_GOALS.map((g, i) => (
              <div key={g.key}>
                <button
                  type="button"
                  className={cn("w-full border px-4 py-3 text-left cursor-pointer transition-all duration-200 bg-transparent", activeGoal === i ? "border-zinc-600 bg-zinc-800/80" : "border-zinc-800")}
                  onClick={() => setActiveGoal(activeGoal === i ? -1 : i)}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: g.accent }} />
                    <span className={cn("font-IBMPlexMono text-xs font-medium", activeGoal === i ? "text-zinc-100" : "text-zinc-400")}>{t(`workflow.goals.${g.key}.label`)}</span>
                  </div>
                </button>
                <AnimatePresence>
                  {activeGoal === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 360, opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden border-x border-b border-zinc-800">
                      <MockupPlayer goalKey={g.key} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </motion.div>
      </ChapterPanel>
    </section>
  );
}
