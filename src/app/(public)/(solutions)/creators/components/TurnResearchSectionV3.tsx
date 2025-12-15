"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";

// Small output format icons
const outputIconPrompts = {
  article: `Icon illustration: Document with text lines. Minimal, clean, coral/orange accent. Square icon style.`,
  podcast: `Icon illustration: Microphone with audio waves. Minimal, clean, teal accent. Square icon style.`,
};

// Medium-sized content transformation infographics
const contentFlowPrompts = {
  multiFormat: `
    Infographic: Content transformation pipeline flow.
    Show: Single research document branching into multiple format outputs (article, video script, social posts, email).
    Information: "1 RESEARCH INPUT", "10+ FORMATS", "80% TIME SAVED" badges with bold numbers.
    Colors: Warm coral-orange primary, teal secondary accents, yellow highlight badges.
    Style: Flow diagram with arrows, format icons, metric callouts. Bold typography.
    Mood: Efficient, productive, transformative for content creators.
  `,
  socialStrategy: `
    Infographic: Social media content calendar strategy.
    Show: Grid calendar with color-coded post types, engagement metrics, platform icons.
    Information: "30 POSTS/MONTH", "5 PLATFORMS", weekly planning view with content types.
    Colors: Vibrant multi-color palette (Instagram pink, Twitter blue, TikTok teal), organized grid layout.
    Style: Dashboard-style calendar infographic with data viz elements.
    Mood: Strategic, organized, multi-platform success.
  `,
};

export function TurnResearchSectionV3() {
  const t = useTranslations("CreatorPage.TurnResearchSection");
  const [hoveredOutput, setHoveredOutput] = useState<string | null>(null);

  return (
    <section className="py-32 md:py-40 bg-zinc-50 dark:bg-zinc-900">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Section Label */}
        <p className="text-sm font-medium tracking-wider uppercase text-zinc-500 dark:text-zinc-400 mb-4">
          {t("badge")}
        </p>

        {/* Title */}
        <h2 className="font-EuclidCircularA font-bold text-4xl md:text-5xl lg:text-6xl tracking-tight leading-tight mb-6 text-zinc-900 dark:text-white">
          {t("title")}
        </h2>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 mb-20 max-w-4xl leading-relaxed">
          {t("subtitle")}
        </p>

        {/* Transformation Flow with Interactive Cards */}
        <div className="mb-20">
          {/* Bold transformation statement */}
          <div className="bg-gradient-to-r from-orange-500 to-teal-500 p-1 rounded-2xl mb-12">
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl">
              <div className="flex items-center justify-center gap-6 flex-wrap">
                <span className="text-6xl font-bold text-orange-500">1</span>
                <span className="text-4xl text-zinc-400">→</span>
                <span className="text-6xl font-bold text-teal-500">10+</span>
                <div className="ml-4">
                  <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Research
                  </p>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                    Multiple Outputs
                  </p>
                </div>
              </div>
            </div>
          </div>

          <h3 className="text-2xl font-bold mb-8 text-zinc-900 dark:text-white">
            {t("outputs.title")}
          </h3>

          {/* Interactive output cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Article Output Card */}
            <div
              className={cn(
                "relative p-6 rounded-xl border transition-all duration-300 cursor-default",
                "bg-gradient-to-br from-orange-50 to-orange-100/30 dark:from-orange-950/20 dark:to-orange-900/10",
                "border-orange-200 dark:border-orange-800",
                "hover:shadow-lg hover:-translate-y-0.5",
                hoveredOutput === "article" && "ring-2 ring-orange-400 dark:ring-orange-600",
              )}
              onMouseEnter={() => setHoveredOutput("article")}
              onMouseLeave={() => setHoveredOutput(null)}
            >
              <div className="flex items-start gap-4">
                {/* Small icon image */}
                <div
                  className={cn(
                    "relative w-16 h-16 rounded-lg overflow-hidden border border-orange-300 dark:border-orange-700 flex-shrink-0",
                    "transition-all duration-300",
                    hoveredOutput === "article" ? "scale-110" : "scale-100",
                  )}
                >
                  <Image
                    loader={({ src }) => src}
                    src={`/api/imagegen/dev/${encodeURIComponent(outputIconPrompts.article)}?ratio=square`}
                    alt="Article output"
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
                <div className="flex-1">
                  <span className="text-3xl mb-2 block">📝</span>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {t("outputs.output1")}
                  </p>
                </div>
              </div>
            </div>

            {/* Podcast Output Card */}
            <div
              className={cn(
                "relative p-6 rounded-xl border transition-all duration-300 cursor-default",
                "bg-gradient-to-br from-teal-50 to-teal-100/30 dark:from-teal-950/20 dark:to-teal-900/10",
                "border-teal-200 dark:border-teal-800",
                "hover:shadow-lg hover:-translate-y-0.5",
                hoveredOutput === "podcast" && "ring-2 ring-teal-400 dark:ring-teal-600",
              )}
              onMouseEnter={() => setHoveredOutput("podcast")}
              onMouseLeave={() => setHoveredOutput(null)}
            >
              <div className="flex items-start gap-4">
                {/* Small icon image */}
                <div
                  className={cn(
                    "relative w-16 h-16 rounded-lg overflow-hidden border border-teal-300 dark:border-teal-700 flex-shrink-0",
                    "transition-all duration-300",
                    hoveredOutput === "podcast" ? "scale-110" : "scale-100",
                  )}
                >
                  <Image
                    loader={({ src }) => src}
                    src={`/api/imagegen/dev/${encodeURIComponent(outputIconPrompts.podcast)}?ratio=square`}
                    alt="Podcast output"
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
                <div className="flex-1">
                  <span className="text-3xl mb-2 block">🎙️</span>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {t("outputs.output2")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ideal For */}
        <div className="mb-20">
          <h3 className="text-xl font-bold mb-8 text-zinc-900 dark:text-white">
            {t("idealFor.title")}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-brand-green rounded-full flex-shrink-0" />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {t("idealFor.type1")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-brand-green rounded-full flex-shrink-0" />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {t("idealFor.type2")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-brand-green rounded-full flex-shrink-0" />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {t("idealFor.type3")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-brand-green rounded-full flex-shrink-0" />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {t("idealFor.type4")}
              </span>
            </div>
          </div>
        </div>

        {/* Reuse Options with Visual Examples */}
        <div className="mb-20 border-t border-zinc-200 dark:border-zinc-800 pt-16">
          <h3 className="text-2xl font-bold mb-12 text-zinc-900 dark:text-white">
            {t("reuseOptions.title")}
          </h3>

          {/* Content Flow Visualization */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mb-12">
            <div className="relative aspect-video rounded-xl overflow-hidden border border-orange-200 dark:border-orange-800 shadow-lg">
              <Image
                loader={({ src }) => src}
                src={`/api/imagegen/dev/${encodeURIComponent(contentFlowPrompts.multiFormat)}?ratio=landscape`}
                alt="Multi-format content transformation"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="text-orange-600 dark:text-orange-400 font-semibold text-lg">
                  →
                </span>
                <span className="text-base text-zinc-700 dark:text-zinc-300">
                  {t("reuseOptions.option1")}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-600 dark:text-orange-400 font-semibold text-lg">
                  →
                </span>
                <span className="text-base text-zinc-700 dark:text-zinc-300">
                  {t("reuseOptions.option2")}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-600 dark:text-orange-400 font-semibold text-lg">
                  →
                </span>
                <span className="text-base text-zinc-700 dark:text-zinc-300">
                  {t("reuseOptions.option3")}
                </span>
              </li>
            </ul>
          </div>

          {/* Social Strategy Visualization */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <ul className="space-y-4 lg:order-first">
              <li className="flex items-start gap-3">
                <span className="text-teal-600 dark:text-teal-400 font-semibold text-lg">→</span>
                <span className="text-base text-zinc-700 dark:text-zinc-300">
                  {t("reuseOptions.option4")}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-teal-600 dark:text-teal-400 font-semibold text-lg">→</span>
                <span className="text-base text-zinc-700 dark:text-zinc-300">
                  {t("reuseOptions.option5")}
                </span>
              </li>
            </ul>
            <div className="relative aspect-video rounded-xl overflow-hidden border border-teal-200 dark:border-teal-800 shadow-lg lg:order-last order-first">
              <Image
                loader={({ src }) => src}
                src={`/api/imagegen/dev/${encodeURIComponent(contentFlowPrompts.socialStrategy)}?ratio=landscape`}
                alt="Social media strategy calendar"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>

        {/* Formula - Bold Statement */}
        <div className="mb-32 text-center py-16 border-y border-zinc-200 dark:border-zinc-800">
          <p className="text-3xl md:text-4xl lg:text-5xl font-bold text-zinc-900 dark:text-white leading-tight">
            {t("formula")}
          </p>
        </div>

        {/* Real Examples */}
        <div>
          <h3 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white">
            {t("realExamples.title")}
          </h3>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-12 max-w-4xl">
            {t("realExamples.description")}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-zinc-200 dark:border-zinc-800 p-6 hover:-translate-y-1 transition-transform duration-300">
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {t("realExamples.example1")}
              </p>
            </div>
            <div className="border border-zinc-200 dark:border-zinc-800 p-6 hover:-translate-y-1 transition-transform duration-300">
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {t("realExamples.example2")}
              </p>
            </div>
            <div className="border border-zinc-200 dark:border-zinc-800 p-6 hover:-translate-y-1 transition-transform duration-300">
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {t("realExamples.example3")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
