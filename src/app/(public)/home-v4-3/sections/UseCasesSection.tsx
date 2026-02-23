"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import React, { useState } from "react";
import ChapterPanel from "../components/ChapterPanel";
import { CHAPTERS, CUSTOMER_STORIES, USE_CASE_CATEGORIES } from "../content";

const copy = CHAPTERS[5];

const CATEGORY_COLORS: Record<string, string> = {
  enterprise: "#16a34a",
  academic: "#d97706",
  prediction: "#8b5cf6",
} as const;

/* ── Story #0: Chart-driven — big bar chart left, quote + metrics right ── */

function StoryChartDriven() {
  const s = CUSTOMER_STORIES[0];
  const bars = [
    { label: "R&D Cycle", before: 90, after: 15 },
    { label: "Concepts", before: 20, after: 95 },
    { label: "Test Time", before: 85, after: 17 },
  ];
  return (
    <div className="grid grid-cols-[1fr_1fr] gap-8 max-lg:grid-cols-1">
      {/* Chart */}
      <div>
        <p className="font-IBMPlexMono text-[10px] tracking-[0.1em] uppercase text-zinc-400 mb-3">
          Before vs After
        </p>
        <div className="flex items-end gap-6 h-40">
          {bars.map((b, i) => (
            <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
              <div className="flex items-end gap-1 w-full h-32">
                <motion.div
                  className="flex-1 bg-zinc-200"
                  initial={{ height: 0 }}
                  animate={{ height: `${b.before}%` }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                />
                <motion.div
                  className="flex-1 bg-[#16a34a]"
                  initial={{ height: 0 }}
                  animate={{ height: `${b.after}%` }}
                  transition={{ duration: 0.5, delay: i * 0.1 + 0.2 }}
                />
              </div>
              <span className="font-IBMPlexMono text-[9px] text-zinc-400">{b.label}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3">
          <span className="flex items-center gap-1.5 text-[10px] text-zinc-400">
            <span className="w-2.5 h-2.5 bg-zinc-200" /> Before
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-zinc-400">
            <span className="w-2.5 h-2.5 bg-[#16a34a]" /> With Atypica
          </span>
        </div>
      </div>

      {/* Quote + body */}
      <div className="flex flex-col justify-center">
        <span className="font-IBMPlexMono text-xs tracking-[0.1em] uppercase text-zinc-500 mb-3">
          {s.client}
        </span>
        <blockquote
          className="text-base leading-relaxed text-zinc-800 italic border-l-2 pl-4 mb-4"
          style={{ borderColor: "#16a34a" }}
        >
          &ldquo;{s.quote}&rdquo;
        </blockquote>
        <p className="text-sm leading-relaxed text-zinc-500">{s.body}</p>
      </div>
    </div>
  );
}

/* ── Story #1: Pure quote — centered, large typography ── */

function StoryPureQuote() {
  const s = CUSTOMER_STORIES[1];
  return (
    <div className="grid grid-cols-[1fr_1fr] gap-8 h-full max-lg:grid-cols-1">
      {/* Left: product feedback mockup */}
      <div className="flex items-center justify-center">
        <div className="relative w-full max-w-[280px]">
          {/* CAD-like product outline */}
          <svg viewBox="0 0 200 140" className="w-full" fill="none">
            {/* Product body */}
            <rect x="30" y="20" width="140" height="100" rx="4" stroke="rgba(59,130,246,0.2)" strokeWidth="1" strokeDasharray="4 3" />
            <rect x="45" y="35" width="60" height="50" rx="2" stroke="rgba(59,130,246,0.15)" strokeWidth="0.8" />
            <circle cx="130" cy="60" r="18" stroke="rgba(59,130,246,0.15)" strokeWidth="0.8" />
            <text x="100" y="132" textAnchor="middle" fontSize="7" fill="rgba(0,0,0,0.2)" fontFamily="var(--font-ibm-plex-mono)">PROTOTYPE v3.2</text>
          </svg>
          {/* Feedback bubbles */}
          <div className="absolute top-2 -right-2 bg-white border border-zinc-200 py-1 px-2 text-[9px] text-zinc-500 shadow-sm">
            &ldquo;Grip angle needs work&rdquo;
          </div>
          <div className="absolute bottom-6 -left-2 bg-white border border-zinc-200 py-1 px-2 text-[9px] text-zinc-500 shadow-sm">
            &ldquo;Weight balance is right&rdquo;
          </div>
        </div>
      </div>

      {/* Right: quote + metrics */}
      <div className="flex flex-col justify-center">
        <span className="font-IBMPlexMono text-xs tracking-[0.1em] uppercase text-zinc-400 mb-3">
          {s.client}
        </span>
        <blockquote
          className="text-base leading-relaxed text-zinc-800 italic border-l-2 pl-4 mb-4"
          style={{ borderColor: "#3b82f6" }}
        >
          &ldquo;{s.quote}&rdquo;
        </blockquote>
        <div className="flex gap-3">
          {s.metrics.map((m) => (
            <div key={m.label} className="border border-zinc-200 py-2 px-3">
              <div className="font-IBMPlexMono text-[9px] tracking-[0.1em] uppercase text-zinc-400">
                {m.label}
              </div>
              <div className="text-sm font-medium text-zinc-800 mt-0.5">{m.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Story #2: Process flow — step-by-step pipeline with description ── */

function StoryProcessFlow() {
  const s = CUSTOMER_STORIES[2];
  const steps = [
    { label: "1-on-1 Interviews" },
    { label: "Build AI Personas" },
    { label: "Assemble AI Panel" },
    { label: "Simulate Policies" },
  ];
  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <span className="font-IBMPlexMono text-xs tracking-[0.1em] uppercase text-zinc-500">
          {s.client}
        </span>
        <span className="text-zinc-300 mx-1">/</span>
        <span className="text-sm italic text-zinc-500">20,000 households</span>
      </div>

      {/* Horizontal pipeline */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className="w-7 h-7 rounded-full grid place-items-center font-IBMPlexMono text-[10px] shrink-0"
                style={{ backgroundColor: "rgba(217,119,6,0.1)", color: "#d97706" }}
              >
                {i + 1}
              </span>
              <span className="text-sm text-zinc-700 whitespace-nowrap">{step.label}</span>
            </div>
            {i < steps.length - 1 && <span className="text-zinc-300 mx-1">→</span>}
          </div>
        ))}
      </div>

      <blockquote
        className="text-base leading-relaxed text-zinc-800 italic border-l-2 pl-4 mb-3"
        style={{ borderColor: "#d97706" }}
      >
        &ldquo;{s.quote}&rdquo;
      </blockquote>
      <p className="text-sm leading-relaxed text-zinc-500">{s.body}</p>
    </div>
  );
}

/* ── Story #3: API integration — code-like, technical ── */

function StoryTechnical() {
  const s = CUSTOMER_STORIES[3];
  return (
    <div className="grid grid-cols-[1fr_1fr] gap-8 max-lg:grid-cols-1">
      {/* Code-like panel */}
      <div className="bg-zinc-900 p-5 font-IBMPlexMono text-xs leading-relaxed">
        <div className="text-zinc-500 mb-2">{"// MCP Integration"}</div>
        <div>
          <span className="text-[#8b5cf6]">const</span>{" "}
          <span className="text-zinc-300">sentiment</span>{" "}
          <span className="text-zinc-500">=</span>{" "}
          <span className="text-[#8b5cf6]">await</span>{" "}
          <span className="text-zinc-300">atypica</span>
          <span className="text-zinc-500">.</span>
          <span className="text-[#d97706]">analyze</span>
          <span className="text-zinc-500">({"{"}</span>
        </div>
        <div className="pl-4 text-zinc-400">
          event: <span className="text-[#16a34a]">&quot;US Election 2024&quot;</span>,
        </div>
        <div className="pl-4 text-zinc-400">
          perspectives: <span className="text-[#93c5fd]">[&quot;voter&quot;, &quot;analyst&quot;, &quot;expert&quot;]</span>,
        </div>
        <div className="pl-4 text-zinc-400">
          signal: <span className="text-[#16a34a]">&quot;continuous&quot;</span>
        </div>
        <div className="text-zinc-500">{"})"}</div>
        <div className="mt-2 text-zinc-500">
          {"// → { prediction: 0.73, confidence: \"high\" }"}
        </div>
      </div>

      {/* Description */}
      <div className="flex flex-col justify-center">
        <span className="font-IBMPlexMono text-xs tracking-[0.1em] uppercase text-zinc-500 mb-3">
          {s.client}
        </span>
        <blockquote
          className="text-base leading-relaxed text-zinc-800 italic border-l-2 pl-4 mb-4"
          style={{ borderColor: "#8b5cf6" }}
        >
          &ldquo;{s.quote}&rdquo;
        </blockquote>
        <p className="text-sm leading-relaxed text-zinc-500 mb-4">{s.body}</p>
        <div className="flex gap-4">
          {s.metrics.map((m) => (
            <div key={m.label} className="border border-zinc-200 py-2 px-3">
              <div className="font-IBMPlexMono text-[9px] tracking-[0.1em] uppercase text-zinc-400">
                {m.label}
              </div>
              <div className="text-sm font-medium text-zinc-800 mt-0.5">{m.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const STORY_VIEWS = [StoryChartDriven, StoryPureQuote, StoryProcessFlow, StoryTechnical];

/* ── Section ── */

export default function UseCasesSection({
  register,
}: {
  register: (el: HTMLElement | null) => void;
}) {
  const [activeStory, setActiveStory] = useState(0);
  const StoryView = STORY_VIEWS[activeStory];

  return (
    <section
      ref={register}
      id={copy.id}
      className="relative z-2 py-20 border-t border-zinc-800 max-lg:py-15"
    >
      <ChapterPanel variant="light">
        <div className="mb-12">
          <div className="font-IBMPlexMono text-xs tracking-[0.18em] text-[#15b025] mb-4">
            {copy.number}
          </div>
          <p className="font-IBMPlexMono text-xs tracking-[0.14em] uppercase text-zinc-500 mb-3">
            {copy.kicker}
          </p>
          <h2 className="m-0 font-EuclidCircularA text-3xl lg:text-4xl xl:text-5xl font-medium leading-[1.1]">
            {copy.title}
          </h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          {/* Scenario map — three numbered columns, flowing text */}
          <div className="grid grid-cols-[2fr_1fr_1fr] gap-8 mb-12 max-lg:grid-cols-1">
            {USE_CASE_CATEGORIES.map((cat, catIdx) => (
              <div key={cat.key}>
                {/* Big number + category name */}
                <div className="flex items-baseline gap-3 mb-4">
                  <span
                    className="font-EuclidCircularA text-5xl font-light leading-none"
                    style={{ color: cat.color, opacity: 0.25 }}
                  >
                    {String(catIdx + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="font-IBMPlexMono text-xs tracking-[0.1em] uppercase font-medium"
                    style={{ color: cat.color }}
                  >
                    {cat.label}
                  </span>
                </div>

                {/* Scenarios as flowing list */}
                <div className="space-y-3">
                  {cat.items.map((item) => (
                    <div key={item.name} className="group">
                      <div
                        className="text-sm font-medium text-zinc-800 mb-0.5 flex items-center gap-2"
                      >
                        <span
                          className="w-1 h-1 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        {item.name}
                      </div>
                      <p className="text-xs leading-relaxed text-zinc-400 pl-3">
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Customer Stories */}
          <p className="font-IBMPlexMono text-xs tracking-[0.16em] uppercase text-zinc-500 mb-4">
            Customer Stories
          </p>

          {/* Large story card */}
          <div className="border border-zinc-200 rounded-xl p-6 lg:p-8 mb-4 min-h-[280px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStory}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <StoryView />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* 4 selector cards with profile avatars */}
          <div className="grid grid-cols-4 gap-3 max-lg:grid-cols-2">
            {CUSTOMER_STORIES.map((s, i) => (
              <button
                key={s.key}
                type="button"
                className={cn(
                  "border rounded-lg p-3 text-left cursor-pointer transition-all duration-200 bg-transparent flex items-center gap-3",
                  i === activeStory
                    ? "border-zinc-400"
                    : "border-zinc-200 hover:border-zinc-300",
                )}
                onClick={() => setActiveStory(i)}
              >
                {/* Profile avatar */}
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 relative bg-zinc-100">
                  <Image
                    src={`/api/imagegen/dev/${encodeURIComponent(s.avatarPrompt)}?ratio=square`}
                    alt={s.client}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                </div>
                <div className="min-w-0">
                  <span className="font-IBMPlexMono text-[10px] tracking-[0.08em] uppercase text-zinc-500 block truncate">
                    {s.client}
                  </span>
                  <span
                    className="font-IBMPlexMono text-[9px] tracking-[0.06em]"
                    style={{ color: CATEGORY_COLORS[s.category] }}
                  >
                    {s.category === "enterprise" ? "Enterprise" : s.category === "academic" ? "Academic" : "Prediction"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </ChapterPanel>
    </section>
  );
}
