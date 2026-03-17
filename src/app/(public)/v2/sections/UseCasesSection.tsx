"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import ChapterPanel from "../components/ChapterPanel";
import {
  CHAPTERS,
  CUSTOMER_STORY_KEYS,
  SOLUTION_ROLES,
  SOLUTION_STORY_IMAGE_PROMPTS,
} from "../content";

const copy = CHAPTERS[5];

const ROLE_AVATAR_IDS = {
  creators: 8,
  influencers: 158,
  marketers: 70,
  startupOwners: 155,
  consultants: 83,
  productManagers: 43,
  researcher: 19,
  investor: 127,
} satisfies Record<(typeof SOLUTION_ROLES)[number]["key"], number>;

type RoleKey = (typeof SOLUTION_ROLES)[number]["key"];
type StoryKey = (typeof CUSTOMER_STORY_KEYS)[number];

const STORY_ACCENTS: Record<StoryKey, string> = {
  food: "var(--ghost-green)",
  tools: "#2563eb",
  university: "#d97706",
  prediction: "#8b5cf6",
};

const STORY_SURFACES: Record<StoryKey, string> = {
  food: "linear-gradient(180deg, #ffffff 0%, #f5fbf5 100%)",
  tools: "linear-gradient(180deg, #ffffff 0%, #f4f8ff 100%)",
  university: "linear-gradient(180deg, #fffdf9 0%, #fcf5ea 100%)",
  prediction: "linear-gradient(180deg, #fbf9ff 0%, #f4f0ff 100%)",
};

const STORY_CATEGORY_KEYS = {
  food: "solutions.categoryEnterprise",
  tools: "solutions.categoryEnterprise",
  university: "solutions.categoryAcademic",
  prediction: "solutions.categoryPrediction",
} as const;

function getAccentTextOnLight(accent: string) {
  return accent === "var(--ghost-green)" ? "#18181b" : accent;
}

const STORY_LINKS: Partial<Record<StoryKey, string>> = {
  prediction: "https://ioiio.bet",
};

const STORIES_WITH_TOP_STAT = new Set<StoryKey>(["food", "prediction"]);

const ROLE_STORY_MAP: Partial<Record<RoleKey, StoryKey>> = {
  researcher: "university",
  investor: "prediction",
};

function SectionLabel({ children, accent }: { children: ReactNode; accent?: string }) {
  return (
    <div className="inline-flex items-center gap-2">
      {accent && <span className="h-px w-4 shrink-0" style={{ backgroundColor: accent }} />}
      <p className="font-IBMPlexMono text-xs tracking-[0.16em] uppercase text-zinc-500">
        {children}
      </p>
    </div>
  );
}

function SummaryBlock({ title, body, accent }: { title: string; body: string; accent: string }) {
  return (
    <div className="border border-zinc-200 bg-white/72 px-4 py-3.5">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-px w-5" style={{ backgroundColor: accent }} />
        <span className="font-IBMPlexMono text-[11px] tracking-[0.14em] uppercase text-zinc-400">
          {title}
        </span>
      </div>
      <p className="text-[13px] leading-[1.55] text-zinc-600">{body}</p>
    </div>
  );
}

function MetricCell({
  label,
  value,
  accent,
  dark,
}: {
  label: string;
  value: string;
  accent: string;
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        "border px-4 py-4",
        dark ? "border-zinc-800 bg-zinc-950/60" : "border-zinc-200 bg-white/70",
      )}
    >
      <div
        className={cn(
          "font-IBMPlexMono text-[11px] tracking-[0.12em] uppercase",
          dark ? "text-zinc-500" : "text-zinc-400",
        )}
      >
        {label}
      </div>
      <div
        className="mt-1 text-base font-semibold text-zinc-900"
        style={{ color: dark ? "#f4f4f5" : "#18181b" }}
      >
        {value}
      </div>
      <div
        className="mt-3 h-px w-full"
        style={{ backgroundColor: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }}
      />
      <div className="mt-2 h-1.5 w-10" style={{ backgroundColor: accent }} />
    </div>
  );
}

function RoleCoverageRail({
  onRoleStorySelect,
}: {
  onRoleStorySelect: (storyKey: StoryKey) => void;
}) {
  const t = useTranslations("HomeAtypicaV2");

  return (
    <div className="mb-12">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {SOLUTION_ROLES.map((role) =>
          (() => {
            const storyTarget = ROLE_STORY_MAP[role.key];
            const cardContent = (
              <div className="flex items-center gap-3">
                <div
                  className="relative size-12 shrink-0 overflow-hidden rounded-full border border-zinc-200"
                  style={{ backgroundColor: "#f5f5f4" }}
                >
                  <Image
                    src={`https://api.hippyghosts.io/~/storage/images/raw/${ROLE_AVATAR_IDS[role.key]}`}
                    alt={t(`solutions.roles.${role.key}.title`)}
                    fill
                    className="object-cover scale-[1.08] transition-transform duration-300 group-hover:scale-[1.16]"
                    sizes="48px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold leading-tight text-zinc-900">
                    {t(`solutions.roles.${role.key}.title`)}
                  </h4>
                  <span className="mt-2 block h-px w-12" style={{ backgroundColor: role.accent }} />
                </div>
              </div>
            );

            if (storyTarget) {
              return (
                <button
                  key={role.key}
                  type="button"
                  onClick={() => onRoleStorySelect(storyTarget)}
                  className="group border border-zinc-200 bg-white px-4 py-3 text-left transition-colors duration-200 hover:border-zinc-400"
                >
                  {cardContent}
                </button>
              );
            }

            return (
              <Link
                key={role.key}
                href={role.link}
                className="group border border-zinc-200 bg-white px-4 py-3 transition-colors duration-200 hover:border-zinc-400"
              >
                {cardContent}
              </Link>
            );
          })(),
        )}
      </div>
    </div>
  );
}

function FoodVisual() {
  const t = useTranslations("HomeAtypicaV2");
  const accent = STORY_ACCENTS.food;

  return (
    <div className="flex flex-col border border-zinc-200 bg-white/75 p-4 lg:p-5">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 pb-3">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ backgroundColor: accent }} />
          <span className="font-IBMPlexMono text-[11px] tracking-[0.12em] uppercase text-zinc-500">
            {t("solutions.storyUI.conceptBoard")}
          </span>
        </div>
        <span className="font-IBMPlexMono text-[11px] tracking-[0.12em] uppercase text-zinc-400">
          {t("solutions.storyUI.selectedRoute")}
        </span>
      </div>

      <div className="relative mt-4 h-[212px] overflow-hidden border border-zinc-200 bg-[#f8f7f3]">
        <Image
          src={`/api/imagegen/dev/${encodeURIComponent(SOLUTION_STORY_IMAGE_PROMPTS.food)}?ratio=landscape`}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 1280px) 100vw, 560px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#f8f7f3] via-[#f8f7f3]/20 to-transparent" />
        <div className="absolute left-3 top-3 border border-white/70 bg-white/84 px-2 py-1 backdrop-blur-sm">
          <div className="font-IBMPlexMono text-[10px] tracking-[0.12em] uppercase text-zinc-500">
            {t("solutions.storyUI.conceptBoard")}
          </div>
        </div>
        <div
          className="absolute right-3 top-3 rounded-full px-2 py-1 font-IBMPlexMono text-[10px] tracking-[0.1em] uppercase text-white"
          style={{ backgroundColor: accent }}
        >
          {t("solutions.storyUI.selected")}
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {[
          {
            title: t("solutions.storyUI.conceptA"),
            value: "71",
            status: "B+",
            name: t("solutions.storyUI.conceptATitle"),
          },
          {
            title: t("solutions.storyUI.conceptB"),
            value: "84",
            status: t("solutions.storyUI.selected"),
            name: t("solutions.storyUI.conceptBTitle"),
          },
          {
            title: t("solutions.storyUI.conceptC"),
            value: "63",
            status: "B",
            name: t("solutions.storyUI.conceptCTitle"),
          },
        ].map((concept) => (
          <div key={concept.title} className="border border-zinc-200 bg-[#fbfbf8] px-3 py-3">
            <div className="font-IBMPlexMono text-[10px] tracking-[0.12em] uppercase text-zinc-400">
              {concept.title}
            </div>
            <div className="mt-1 flex items-end justify-between gap-3">
              <div className="text-lg font-semibold leading-none text-zinc-900">
                {concept.value}
              </div>
              <div className="font-IBMPlexMono text-[10px] tracking-[0.12em] uppercase text-zinc-500">
                {concept.status}
              </div>
            </div>
            <div className="mt-2 text-sm text-zinc-600">{concept.name}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border border-zinc-200 bg-[#fbfbf8] px-4 py-3">
        <div>
          <div className="font-IBMPlexMono text-[10px] tracking-[0.12em] uppercase text-zinc-400">
            {t("solutions.storyUI.finalSelection")}
          </div>
          <div className="mt-1 text-sm font-medium text-zinc-800">
            {t("solutions.storyUI.conceptBTitle")}
          </div>
        </div>
        <div className="flex gap-2">
          {["CN", "SG", "MY"].map((market) => (
            <span
              key={market}
              className="border border-zinc-200 px-2 py-1 font-IBMPlexMono text-[10px] tracking-[0.1em] uppercase text-zinc-500"
            >
              {market}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ToolsVisual() {
  const t = useTranslations("HomeAtypicaV2");
  const accent = STORY_ACCENTS.tools;

  return (
    <div className="flex flex-col border border-zinc-200 bg-white/75 p-4 lg:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ backgroundColor: accent }} />
          <span className="font-IBMPlexMono text-[11px] tracking-[0.12em] uppercase text-zinc-500">
            {t("solutions.storyUI.prototypeSheet")}
          </span>
        </div>
        <span className="font-IBMPlexMono text-[11px] tracking-[0.12em] uppercase text-zinc-400">
          {t("solutions.storyUI.livePanel")}
        </span>
      </div>

      <div className="relative mt-4 h-[212px] overflow-hidden border border-zinc-200 bg-[#f7f7f8]">
        <Image
          src={`/api/imagegen/dev/${encodeURIComponent(SOLUTION_STORY_IMAGE_PROMPTS.tools)}?ratio=landscape`}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 1280px) 100vw, 560px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#f7f7f8] via-[#f7f7f8]/25 to-transparent" />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {[
          t("solutions.storyUI.gripAngle"),
          t("solutions.storyUI.weightBalance"),
          t("solutions.storyUI.triggerReach"),
        ].map((feedback, index) => (
          <motion.div
            key={feedback}
            className="border border-zinc-200 bg-white px-3 py-3"
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.45, delay: index * 0.12 }}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-IBMPlexMono text-[10px] tracking-[0.12em] uppercase text-zinc-400">
                Panel #{index + 1}
              </span>
              <span className="h-px flex-1 opacity-35" style={{ backgroundColor: accent }} />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-700">{feedback}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function UniversityVisual() {
  const t = useTranslations("HomeAtypicaV2");
  const accent = STORY_ACCENTS.university;
  const stages = [
    {
      value: t("solutions.stories.university.metric1Value"),
      label: t("solutions.stories.university.metric1Label"),
      width: "w-full",
    },
    {
      value: t("solutions.stories.university.metric3Value"),
      label: t("solutions.stories.university.metric3Label"),
      width: "w-[84%]",
    },
    {
      value: t("solutions.stories.university.metric2Value"),
      label: t("solutions.stories.university.metric2Label"),
      width: "w-[68%]",
    },
  ];

  return (
    <div className="flex flex-col border border-zinc-200 bg-white/75 p-4 lg:p-5">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 pb-3">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ backgroundColor: accent }} />
          <span className="font-IBMPlexMono text-[11px] tracking-[0.12em] uppercase text-zinc-500">
            {t("solutions.storyUI.policySimulation")}
          </span>
        </div>
        <span className="font-IBMPlexMono text-[11px] tracking-[0.12em] uppercase text-zinc-400">
          {t("solutions.storyUI.households")}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {stages.map((stage, index) => (
          <div key={stage.label} className="relative">
            {index < stages.length - 1 && (
              <div
                className="absolute left-6 top-[calc(100%+4px)] h-6 w-px opacity-35"
                style={{ backgroundColor: accent }}
              />
            )}
            <div className={cn("border border-zinc-200 bg-[#fcfbf8] px-4 py-3", stage.width)}>
              <div className="font-EuclidCircularA text-4xl leading-none text-zinc-900">
                {stage.value}
              </div>
              <div className="mt-2 font-IBMPlexMono text-[11px] tracking-[0.12em] uppercase text-zinc-400">
                {stage.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {[
          t("solutions.storyUI.stepInterviews"),
          t("solutions.storyUI.stepBuildPersonas"),
          t("solutions.storyUI.stepAssemblePanel"),
          t("solutions.storyUI.stepSimulatePolicies"),
        ].map((step, index) => (
          <div
            key={step}
            className="flex items-center gap-3 border border-zinc-200 bg-white px-3 py-2.5"
          >
            <div
              className="grid size-7 shrink-0 place-items-center rounded-full border border-current bg-white font-IBMPlexMono text-[11px]"
              style={{ color: getAccentTextOnLight(accent) }}
            >
              {index + 1}
            </div>
            <span className="text-sm text-zinc-700">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PredictionVisual() {
  const t = useTranslations("HomeAtypicaV2");
  const accent = STORY_ACCENTS.prediction;
  const signals = [
    { label: t("solutions.storyUI.signalSocial"), value: 0.76 },
    { label: t("solutions.storyUI.signalExperts"), value: 0.64 },
    { label: t("solutions.storyUI.signalNews"), value: 0.58 },
    { label: t("solutions.storyUI.signalOrderflow"), value: 0.71 },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(240px,0.88fr)]">
      <div className="border border-zinc-200 bg-white/80 p-4 lg:p-5">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 pb-3">
          <span className="font-IBMPlexMono text-[11px] tracking-[0.12em] uppercase text-zinc-500">
            {t("solutions.storyUI.agentRuntime")}
          </span>
          <span className="font-IBMPlexMono text-[11px] tracking-[0.12em] uppercase text-zinc-400">
            MCP
          </span>
        </div>

        <div className="mt-4 border border-zinc-900 bg-zinc-950 px-4 py-4 font-IBMPlexMono text-xs leading-relaxed text-zinc-300 lg:min-h-[284px]">
          <div className="mb-3 text-zinc-600">{"// agent.ts"}</div>
          <div>
            <span className="text-[#8b5cf6]">const</span> forecast{" "}
            <span className="text-zinc-600">=</span> <span className="text-[#8b5cf6]">await</span>{" "}
            atypica.signal({"{"})
          </div>
          <div className="pl-4 text-zinc-400">
            market: <span style={{ color: accent }}>&quot;US Election 2024&quot;</span>,
          </div>
          <div className="pl-4 text-zinc-400">
            inputs:{" "}
            <span className="text-[#93c5fd]">
              [&quot;social&quot;, &quot;experts&quot;, &quot;news&quot;]
            </span>
            ,
          </div>
          <div className="pl-4 text-zinc-400">
            mode: <span className="text-ghost-green">&quot;continuous&quot;</span>,
          </div>
          <div className="text-zinc-600">{"})"}</div>
          <div className="mt-4 text-zinc-600">
            {'// -> { prediction: 0.73, confidence: "high" }'}
          </div>
          <div className="mt-6 border-t border-zinc-800 pt-4 text-zinc-400">
            {t("solutions.storyUI.agentInputNote")}
          </div>
        </div>
      </div>

      <div className="flex flex-col border border-zinc-200 bg-white/80 px-4 py-4 lg:min-h-[374px]">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 pb-3">
          <span className="font-IBMPlexMono text-[11px] tracking-[0.12em] uppercase text-zinc-500">
            {t("solutions.storyUI.signalTape")}
          </span>
          <span
            className="font-IBMPlexMono text-[11px] tracking-[0.12em] uppercase"
            style={{ color: getAccentTextOnLight(accent) }}
          >
            0.73 CONF
          </span>
        </div>

        <div className="mt-4 flex-1 space-y-3">
          {signals.map((signal, index) => (
            <div key={signal.label}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="font-IBMPlexMono text-[11px] uppercase tracking-[0.08em] text-zinc-500">
                  {signal.label}
                </span>
                <span className="font-IBMPlexMono text-[11px] text-zinc-500">
                  {signal.value.toFixed(2)}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden bg-zinc-100">
                <motion.div
                  className="h-full"
                  style={{ backgroundColor: accent }}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${signal.value * 100}%` }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.6, delay: index * 0.08 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StoryCard({
  storyKey,
  index,
  visual,
  visualRight,
}: {
  storyKey: StoryKey;
  index: number;
  visual: ReactNode;
  visualRight?: boolean;
}) {
  const t = useTranslations("HomeAtypicaV2");
  const accent = STORY_ACCENTS[storyKey];
  const link = STORY_LINKS[storyKey];
  const showTopStat = STORIES_WITH_TOP_STAT.has(storyKey);

  return (
    <motion.article
      id={`deployment-${storyKey}`}
      className="relative overflow-hidden border border-zinc-200 p-5 text-zinc-900 lg:p-6"
      style={{ background: STORY_SURFACES[storyKey] }}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.35 }}
    >
      <div className="absolute left-0 top-0 h-full w-1.5" style={{ backgroundColor: accent }} />
      <div
        className="pointer-events-none absolute right-5 top-5 hidden font-EuclidCircularA text-[4.9rem] leading-none text-zinc-950/[0.06] lg:block xl:right-6 xl:top-6 xl:text-[6rem]"
        aria-hidden="true"
      >
        {String(index + 1).padStart(2, "0")}
      </div>

      <div className="relative z-10">
        <div
          className="mb-6 border-b pb-5 pr-20 lg:pr-28 xl:pr-32"
          style={{ borderColor: "rgba(0,0,0,0.08)" }}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 max-w-[44rem]">
              <SectionLabel accent={accent}>{t(STORY_CATEGORY_KEYS[storyKey])}</SectionLabel>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                <h3 className="font-EuclidCircularA text-2xl font-medium leading-[1.03] text-zinc-900 lg:text-[2rem]">
                  {t(`solutions.stories.${storyKey}.client`)}
                </h3>
                {link && (
                  <a
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="font-IBMPlexMono text-[11px] tracking-[0.14em] uppercase text-zinc-500 transition-colors hover:text-zinc-900"
                  >
                    {t("solutions.storyUI.visitLink")} ↗
                  </a>
                )}
              </div>
              <p className="mt-3 max-w-[56ch] text-sm leading-relaxed text-zinc-500">
                {t(`solutions.stories.${storyKey}.indicator`)}
              </p>
            </div>

            {showTopStat && (
              <div className="min-w-0 shrink-0 self-start lg:pr-6 lg:text-right xl:pr-8">
                <div
                  className="font-EuclidCircularA text-5xl leading-none lg:text-6xl"
                  style={{ color: getAccentTextOnLight(accent) }}
                >
                  {t(`solutions.stories.${storyKey}.heroStatValue`)}
                </div>
                <div className="mt-2 font-IBMPlexMono text-[11px] tracking-[0.14em] uppercase text-zinc-400">
                  {t(`solutions.stories.${storyKey}.heroStatLabel`)}
                </div>
              </div>
            )}
          </div>
        </div>

        <div
          className={cn(
            "relative grid gap-6 lg:items-start xl:gap-8",
            visualRight
              ? "lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]"
              : "lg:grid-cols-[minmax(0,0.98fr)_minmax(0,1.02fr)]",
          )}
        >
          <div className={cn("min-w-0", visualRight && "lg:order-2")}>{visual}</div>

          <div className={cn("relative min-w-0", visualRight && "lg:order-1")}>
            <blockquote>
              <p className="font-InstrumentSerif text-[1.35rem] italic leading-[1.08] text-zinc-900 lg:text-[1.55rem]">
                &ldquo;{t(`solutions.stories.${storyKey}.quote`)}&rdquo;
              </p>
            </blockquote>

            <div className="mt-4 flex flex-col gap-2">
              <SummaryBlock
                title={t("solutions.storyUI.deployment")}
                body={t(`solutions.stories.${storyKey}.solution`)}
                accent={accent}
              />
              <SummaryBlock
                title={t("solutions.storyUI.outcome")}
                body={t(`solutions.stories.${storyKey}.result`)}
                accent={accent}
              />
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {(["metric1", "metric2", "metric3"] as const).map((metricKey) => (
                <MetricCell
                  key={metricKey}
                  label={t(`solutions.stories.${storyKey}.${metricKey}Label`)}
                  value={t(`solutions.stories.${storyKey}.${metricKey}Value`)}
                  accent={accent}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function StorySelector({
  storyKey,
  index,
  active,
  onClick,
}: {
  storyKey: StoryKey;
  index: number;
  active: boolean;
  onClick: () => void;
}) {
  const t = useTranslations("HomeAtypicaV2");
  const accent = STORY_ACCENTS[storyKey];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden border p-4 text-left transition-all duration-200",
        active ? "border-zinc-400 bg-zinc-50" : "border-zinc-200 bg-white hover:border-zinc-300",
      )}
    >
      <span className="absolute left-0 top-0 h-1 w-full" style={{ backgroundColor: accent }} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-IBMPlexMono text-[10px] tracking-[0.16em] uppercase text-zinc-400">
            {String(index + 1).padStart(2, "0")} · {t(STORY_CATEGORY_KEYS[storyKey])}
          </div>
          <div
            className="mt-3 font-EuclidCircularA text-3xl leading-none"
            style={{ color: getAccentTextOnLight(accent) }}
          >
            {t(`solutions.stories.${storyKey}.heroStatValue`)}
          </div>
          <div className="mt-1 font-IBMPlexMono text-[11px] tracking-[0.12em] uppercase text-zinc-400">
            {t(`solutions.stories.${storyKey}.heroStatLabel`)}
          </div>
        </div>

        <span
          className={cn(
            "font-IBMPlexMono text-[11px] tracking-[0.12em] uppercase transition-transform duration-200",
            "text-zinc-400",
            active ? "translate-x-0" : "group-hover:translate-x-0 -translate-x-1",
          )}
        >
          {active ? t("solutions.storyUI.activeCase") : t("solutions.storyUI.openCase")}
        </span>
      </div>

      <h4 className="mt-5 text-base font-semibold leading-tight text-zinc-900">
        {t(`solutions.stories.${storyKey}.client`)}
      </h4>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">
        {t(`solutions.stories.${storyKey}.indicator`)}
      </p>
    </button>
  );
}

export default function UseCasesSection({
  register,
}: {
  register: (el: HTMLElement | null) => void;
}) {
  const t = useTranslations("HomeAtypicaV2");
  const [activeStory, setActiveStory] = useState<StoryKey>("food");
  const deploymentRef = useRef<HTMLDivElement | null>(null);
  const pendingStoryRef = useRef<StoryKey | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#deployment-")) {
      return;
    }

    const storyKey = hash.replace("#deployment-", "") as StoryKey;
    if (CUSTOMER_STORY_KEYS.includes(storyKey)) {
      pendingStoryRef.current = storyKey;
      setActiveStory(storyKey);
    }
  }, []);

  useEffect(() => {
    if (pendingStoryRef.current !== activeStory) {
      return;
    }

    deploymentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#deployment-${activeStory}`);
    pendingStoryRef.current = null;
  }, [activeStory]);

  const handleRoleStorySelect = (storyKey: StoryKey) => {
    pendingStoryRef.current = storyKey;
    setActiveStory(storyKey);
  };

  return (
    <section
      ref={register}
      id={copy.id}
      className="relative z-2 py-20 border-t border-zinc-800 max-lg:py-15"
    >
      <ChapterPanel variant="light">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] lg:items-end">
          <div>
            <div className="font-IBMPlexMono mb-4 text-xs tracking-[0.18em] text-zinc-500">
              {copy.number}
            </div>
            <p className="font-IBMPlexMono mb-3 text-xs tracking-[0.14em] uppercase text-zinc-500">
              {t("solutions.kicker")}
            </p>
            <h2 className="m-0 max-w-[14ch] font-EuclidCircularA text-3xl font-medium leading-[0.98] text-zinc-950 lg:max-w-[16ch] lg:text-4xl xl:text-5xl">
              <span className="block">{t("solutions.titleLine1")}</span>
              <span className="block">{t("solutions.titleLine2")}</span>
            </h2>
          </div>

          <div className="lg:pb-2">
            <div className="max-w-[18rem] lg:ml-auto lg:text-right">
              <SectionLabel accent="var(--ghost-green)">
                {t("solutions.coverageLabel")}
              </SectionLabel>
              <p className="mt-3 font-EuclidCircularA text-lg leading-[1.08] text-zinc-500 lg:text-[1.35rem]">
                {t("solutions.coverageTitle")}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <RoleCoverageRail onRoleStorySelect={handleRoleStorySelect} />

          <div
            ref={deploymentRef}
            className="mb-5 flex scroll-mt-24 flex-wrap items-center justify-between gap-3"
          >
            <SectionLabel>{t("solutions.customerStoriesLabel")}</SectionLabel>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>

          <div className="grid gap-5">
            <AnimatePresence mode="wait">
              {activeStory === "food" && (
                <StoryCard key="food" storyKey="food" index={0} visual={<FoodVisual />} />
              )}
              {activeStory === "tools" && (
                <StoryCard
                  key="tools"
                  storyKey="tools"
                  index={1}
                  visual={<ToolsVisual />}
                  visualRight
                />
              )}
              {activeStory === "university" && (
                <StoryCard
                  key="university"
                  storyKey="university"
                  index={2}
                  visual={<UniversityVisual />}
                />
              )}
              {activeStory === "prediction" && (
                <StoryCard
                  key="prediction"
                  storyKey="prediction"
                  index={3}
                  visual={<PredictionVisual />}
                  visualRight
                />
              )}
            </AnimatePresence>

            <div className="grid gap-3 lg:grid-cols-4">
              {CUSTOMER_STORY_KEYS.map((storyKey, index) => (
                <StorySelector
                  key={storyKey}
                  storyKey={storyKey}
                  index={index}
                  active={storyKey === activeStory}
                  onClick={() => setActiveStory(storyKey)}
                />
              ))}
            </div>
          </div>
        </div>
      </ChapterPanel>
    </section>
  );
}
