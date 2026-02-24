"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import ChapterPanel from "../components/ChapterPanel";
import {
  CATEGORY_COLORS,
  CHAPTERS,
  CUSTOMER_STORY_KEYS,
  CUSTOMER_STORY_META,
  SOLUTION_ROLES,
} from "../content";

const copy = CHAPTERS[5];

const ROLE_IMAGE_PROMPTS: Record<string, string> = {
  creators: "Bird's eye view of a content creator workspace with a phone showing a trending video feed, a ring light circle, and scattered story cards on a dark surface, minimalist flat design, green and black color scheme, clean geometric shapes, no text",
  influencers: "Top-down view of a social media influencer desk with an audience heatmap, fan mail envelopes, and a phone showing follower growth curve, minimalist flat design, amber and black color scheme, clean geometric shapes, no text",
  marketers: "Overhead view of a campaign war room table with consumer journey sticky notes, A/B test comparison cards, and a funnel diagram, minimalist flat design, blue and black color scheme, clean geometric shapes, no text",
  startupOwners: "Bird's eye view of a founder's desk with napkin sketches of a product idea, a lean canvas card, and early prototype wireframes, minimalist flat design, pink and black color scheme, clean geometric shapes, no text",
  consultants: "Top-down view of a strategy consulting workspace with client presentation slides, a SWOT matrix card, and recommendation priority ranking, minimalist flat design, cyan and black color scheme, clean geometric shapes, no text",
  productManagers: "Overhead view of a product manager workspace with user feedback cards, a feature prioritization matrix, and a roadmap timeline ribbon, minimalist flat design, purple and black color scheme, clean geometric shapes, no text",
  researcher: "Bird's eye view of an academic research desk with interview transcript pages, color-coded thematic analysis cards, and a citation network diagram, minimalist flat design, green and black color scheme, clean geometric shapes, no text",
  investor: "Top-down view of a prediction analyst workspace with multi-source signal cards, a confidence gauge dial, and scenario divergence arrows on a dark surface, minimalist flat design, orange and black color scheme, clean geometric shapes, no text",
};

/* ── Story #0: Chart-driven ── */

function StoryChartDriven() {
  const t = useTranslations("HomeAtypicaV2");
  const bars = [
    { label: t("solutions.storyUI.rdCycle"), before: 90, after: 15 },
    { label: t("solutions.storyUI.concepts"), before: 20, after: 95 },
    { label: t("solutions.storyUI.testTime"), before: 85, after: 17 },
  ];
  return (
    <div className="grid grid-cols-[1fr_1fr] gap-8 max-lg:grid-cols-1">
      <div>
        <p className="font-IBMPlexMono text-xs tracking-[0.1em] uppercase text-zinc-400 mb-3">
          {t("solutions.storyUI.beforeVsAfter")}
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
              <span className="font-IBMPlexMono text-xs text-zinc-400">{b.label}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3">
          <span className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className="w-2.5 h-2.5 bg-zinc-200" /> {t("solutions.storyUI.before")}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className="w-2.5 h-2.5 bg-[#16a34a]" /> {t("solutions.storyUI.withAtypica")}
          </span>
        </div>
      </div>
      <div className="flex flex-col justify-center">
        <span className="font-IBMPlexMono text-xs tracking-[0.1em] uppercase text-zinc-500 mb-3">
          {t("solutions.stories.food.client")}
        </span>
        <blockquote
          className="text-base leading-relaxed text-zinc-800 italic border-l-2 pl-4 mb-4"
          style={{ borderColor: "#16a34a" }}
        >
          &ldquo;{t("solutions.stories.food.quote")}&rdquo;
        </blockquote>
        <p className="text-sm leading-relaxed text-zinc-500">{t("solutions.stories.food.body")}</p>
      </div>
    </div>
  );
}

/* ── Story #1: Pure quote ── */

function StoryPureQuote() {
  const t = useTranslations("HomeAtypicaV2");
  return (
    <div className="grid grid-cols-[1fr_1fr] gap-8 h-full max-lg:grid-cols-1">
      <div className="flex items-center justify-center">
        <div className="relative w-full max-w-[280px]">
          <svg viewBox="0 0 200 140" className="w-full" fill="none">
            <rect x="30" y="20" width="140" height="100" rx="4" stroke="rgba(59,130,246,0.2)" strokeWidth="1" strokeDasharray="4 3" />
            <rect x="45" y="35" width="60" height="50" rx="2" stroke="rgba(59,130,246,0.15)" strokeWidth="0.8" />
            <circle cx="130" cy="60" r="18" stroke="rgba(59,130,246,0.15)" strokeWidth="0.8" />
            <text x="100" y="132" textAnchor="middle" fontSize="7" fill="rgba(0,0,0,0.2)" fontFamily="var(--font-ibm-plex-mono)">{t("solutions.storyUI.prototypeLabel")}</text>
          </svg>
          <div className="absolute top-2 -right-2 bg-white border border-zinc-200 py-1 px-2 text-xs text-zinc-500 shadow-sm">
            &ldquo;{t("solutions.storyUI.gripAngle")}&rdquo;
          </div>
          <div className="absolute bottom-6 -left-2 bg-white border border-zinc-200 py-1 px-2 text-xs text-zinc-500 shadow-sm">
            &ldquo;{t("solutions.storyUI.weightBalance")}&rdquo;
          </div>
        </div>
      </div>
      <div className="flex flex-col justify-center">
        <span className="font-IBMPlexMono text-xs tracking-[0.1em] uppercase text-zinc-400 mb-3">
          {t("solutions.stories.tools.client")}
        </span>
        <blockquote
          className="text-base leading-relaxed text-zinc-800 italic border-l-2 pl-4 mb-4"
          style={{ borderColor: "#3b82f6" }}
        >
          &ldquo;{t("solutions.stories.tools.quote")}&rdquo;
        </blockquote>
        <div className="flex gap-3">
          {(["metric1", "metric2", "metric3"] as const).map((mk) => (
            <div key={mk} className="border border-zinc-200 py-2 px-3">
              <div className="font-IBMPlexMono text-xs tracking-[0.1em] uppercase text-zinc-400">
                {t(`solutions.stories.tools.${mk}Label`)}
              </div>
              <div className="text-sm font-medium text-zinc-800 mt-0.5">
                {t(`solutions.stories.tools.${mk}Value`)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Story #2: Process flow ── */

function StoryProcessFlow() {
  const t = useTranslations("HomeAtypicaV2");
  const steps = [
    { label: t("solutions.storyUI.stepInterviews") },
    { label: t("solutions.storyUI.stepBuildPersonas") },
    { label: t("solutions.storyUI.stepAssemblePanel") },
    { label: t("solutions.storyUI.stepSimulatePolicies") },
  ];
  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <span className="font-IBMPlexMono text-xs tracking-[0.1em] uppercase text-zinc-500">
          {t("solutions.stories.university.client")}
        </span>
        <span className="text-zinc-300 mx-1">/</span>
        <span className="text-sm italic text-zinc-500">{t("solutions.storyUI.households")}</span>
      </div>
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className="w-7 h-7 rounded-full grid place-items-center font-IBMPlexMono text-xs shrink-0"
                style={{ backgroundColor: "rgba(217,119,6,0.1)", color: "#d97706" }}
              >
                {i + 1}
              </span>
              <span className="text-sm text-zinc-700 whitespace-nowrap">{step.label}</span>
            </div>
            {i < steps.length - 1 && <span className="text-zinc-300 mx-1">&rarr;</span>}
          </div>
        ))}
      </div>
      <blockquote
        className="text-base leading-relaxed text-zinc-800 italic border-l-2 pl-4 mb-3"
        style={{ borderColor: "#d97706" }}
      >
        &ldquo;{t("solutions.stories.university.quote")}&rdquo;
      </blockquote>
      <p className="text-sm leading-relaxed text-zinc-500">{t("solutions.stories.university.body")}</p>
    </div>
  );
}

/* ── Story #3: Technical ── */

function StoryTechnical() {
  const t = useTranslations("HomeAtypicaV2");
  return (
    <div className="grid grid-cols-[1fr_1fr] gap-8 max-lg:grid-cols-1">
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
      <div className="flex flex-col justify-center">
        <span className="font-IBMPlexMono text-xs tracking-[0.1em] uppercase text-zinc-500 mb-3">
          {t("solutions.stories.prediction.client")}
        </span>
        <blockquote
          className="text-base leading-relaxed text-zinc-800 italic border-l-2 pl-4 mb-4"
          style={{ borderColor: "#8b5cf6" }}
        >
          &ldquo;{t("solutions.stories.prediction.quote")}&rdquo;
        </blockquote>
        <p className="text-sm leading-relaxed text-zinc-500 mb-4">{t("solutions.stories.prediction.body")}</p>
        <div className="flex gap-4">
          {(["metric1", "metric2", "metric3"] as const).map((mk) => (
            <div key={mk} className="border border-zinc-200 py-2 px-3">
              <div className="font-IBMPlexMono text-xs tracking-[0.1em] uppercase text-zinc-400">
                {t(`solutions.stories.prediction.${mk}Label`)}
              </div>
              <div className="text-sm font-medium text-zinc-800 mt-0.5">
                {t(`solutions.stories.prediction.${mk}Value`)}
              </div>
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
  const t = useTranslations("HomeAtypicaV2");
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
            {t("solutions.kicker")}
          </p>
          <h2 className="m-0 font-EuclidCircularA text-3xl lg:text-4xl xl:text-5xl font-medium leading-[1.1]">
            {t("solutions.title")}
          </h2>
          <p className="mt-4 max-w-[64ch] text-base lg:text-lg leading-relaxed text-zinc-500">
            {t("solutions.body")}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          {/* Role cards (replaces old scenario map) */}
          <div className="grid grid-cols-4 gap-4 mb-12 max-lg:grid-cols-2 max-sm:grid-cols-1">
            {SOLUTION_ROLES.map((role) => (
              <Link
                key={role.key}
                href={role.link}
                className="group border border-zinc-200 hover:border-zinc-400 transition-colors duration-200 overflow-hidden block"
              >
                <div className="aspect-[4/3] bg-zinc-100 relative overflow-hidden">
                  <Image
                    src={`/api/imagegen/dev/${encodeURIComponent(ROLE_IMAGE_PROMPTS[role.key] ?? role.key)}?ratio=landscape`}
                    alt={t(`solutions.roles.${role.key}.title`)}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-medium mb-1" style={{ color: role.accent }}>
                    {t(`solutions.roles.${role.key}.title`)}
                  </h3>
                  <p className="text-sm leading-relaxed text-zinc-500">
                    {t(`solutions.roles.${role.key}.desc`)}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* Customer Stories */}
          <p className="font-IBMPlexMono text-xs tracking-[0.16em] uppercase text-zinc-500 mb-4">
            {t("solutions.customerStoriesLabel")}
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
            {CUSTOMER_STORY_KEYS.map((storyKey, i) => {
              const meta = CUSTOMER_STORY_META[storyKey];
              return (
                <button
                  key={storyKey}
                  type="button"
                  className={cn(
                    "border rounded-lg p-3 text-left cursor-pointer transition-all duration-200 bg-transparent flex items-center gap-3",
                    i === activeStory
                      ? "border-zinc-400"
                      : "border-zinc-200 hover:border-zinc-300",
                  )}
                  onClick={() => setActiveStory(i)}
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 relative bg-zinc-100">
                    <Image
                      src={`/api/imagegen/dev/${encodeURIComponent(meta.avatarPrompt)}?ratio=square`}
                      alt={t(`solutions.stories.${storyKey}.client`)}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="font-IBMPlexMono text-xs tracking-[0.08em] uppercase text-zinc-500 block truncate">
                      {t(`solutions.stories.${storyKey}.client`)}
                    </span>
                    <span
                      className="font-IBMPlexMono text-xs tracking-[0.06em]"
                      style={{ color: CATEGORY_COLORS[meta.category] }}
                    >
                      {t(
                        meta.category === "enterprise"
                          ? "solutions.categoryEnterprise"
                          : meta.category === "academic"
                            ? "solutions.categoryAcademic"
                            : "solutions.categoryPrediction",
                      )}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      </ChapterPanel>
    </section>
  );
}
