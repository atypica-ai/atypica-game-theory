"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";

// Small icon-style prompts for hover interactions
const iconPrompts = {
  useCase1: `Icon illustration: Content calendar with checkmarks. Minimal, clean, purple accent. Square icon style.`,
  useCase2: `Icon illustration: Target audience segments diagram. Minimal, clean, blue accent. Square icon style.`,
  useCase3: `Icon illustration: Trending chart going up. Minimal, clean, green accent. Square icon style.`,
};

// Medium-sized infographic images
const mediumImagePrompts = {
  planningWorkflow: `
    Infographic: Content planning workflow visualization.
    Show: Weekly calendar layout, content idea bubbles, drag-and-drop scheduling interface.
    Information: "PLAN 4 WEEKS AHEAD", "AUTO-SCHEDULE", timeline with colored content blocks.
    Colors: Purple gradient background, white UI elements, bold purple accents.
    Style: Dashboard UI infographic, organized grid layout, modern SaaS aesthetic.
    Mood: Productive, organized, empowering for content creators.
  `,
  audienceInsights: `
    Infographic: Audience analysis dashboard with persona cards.
    Show: 3 persona cards with avatars, demographic data bars, interest tag clouds, engagement metrics.
    Information: "AUDIENCE SEGMENTS", "85% MATCH", "TOP INTERESTS" labels with data.
    Colors: Blue-teal gradient, white cards with colored accents, data visualization bars.
    Style: Analytics dashboard infographic, card-based layout, professional data viz.
    Mood: Strategic, data-driven, insightful.
  `,
  analyticsGrowth: `
    Infographic: Growth analytics and trending metrics.
    Show: Upward trending line chart, growth percentage badges, content performance bars.
    Information: "+150% GROWTH", "VIRAL CONTENT", performance metrics with numbers.
    Colors: Green gradient background, yellow highlights for success metrics, white charts.
    Style: Analytics infographic with bold numbers, chart visualizations, achievement badges.
    Mood: Success-oriented, motivating, data-backed confidence.
  `,
};

export function PlanSmarterSectionV3() {
  const t = useTranslations("CreatorPage.PlanSmarterSection");
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

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

        {/* Interactive Use Cases Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-32">
          {/* Use Case 1 Card */}
          <div
            className={cn(
              "group relative p-8 rounded-2xl border transition-all duration-300 cursor-default",
              "bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20",
              "border-purple-200 dark:border-purple-800",
              "hover:shadow-xl hover:-translate-y-1",
              hoveredCard === "useCase1" && "ring-2 ring-purple-400 dark:ring-purple-600",
            )}
            onMouseEnter={() => setHoveredCard("useCase1")}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="mb-6">
              <span className="text-5xl font-bold text-purple-600 dark:text-purple-400">01</span>
            </div>

            {/* Small icon image on hover */}
            <div
              className={cn(
                "relative w-24 h-24 mb-6 rounded-xl overflow-hidden border border-purple-300 dark:border-purple-700",
                "transition-all duration-300",
                hoveredCard === "useCase1" ? "opacity-100 scale-100" : "opacity-0 scale-95",
              )}
            >
              <Image
                loader={({ src }) => src}
                src={`/api/imagegen/dev/${encodeURIComponent(iconPrompts.useCase1)}?ratio=square`}
                alt="Content planning icon"
                fill
                className="object-cover"
                sizes="96px"
              />
            </div>

            <h3 className="text-xl font-bold mb-3 text-zinc-900 dark:text-white">
              {t("useCase1.title")}
            </h3>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-4 leading-relaxed">
              {t("useCase1.description")}
            </p>

            <div className="space-y-2 mb-4 text-xs text-zinc-600 dark:text-zinc-400 italic">
              <p>&ldquo;{t("useCase1.example1")}&rdquo;</p>
              <p>&ldquo;{t("useCase1.example2")}&rdquo;</p>
            </div>

            <div className="pt-4 border-t border-purple-200 dark:border-purple-800">
              <p className="text-xs font-semibold tracking-wider uppercase text-purple-600 dark:text-purple-400 mb-1">
                Output
              </p>
              <p className="text-xs text-zinc-700 dark:text-zinc-300">{t("useCase1.output")}</p>
            </div>
          </div>

          {/* Use Case 2 Card */}
          <div
            className={cn(
              "group relative p-8 rounded-2xl border transition-all duration-300 cursor-default",
              "bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20",
              "border-blue-200 dark:border-blue-800",
              "hover:shadow-xl hover:-translate-y-1",
              hoveredCard === "useCase2" && "ring-2 ring-blue-400 dark:ring-blue-600",
            )}
            onMouseEnter={() => setHoveredCard("useCase2")}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="mb-6">
              <span className="text-5xl font-bold text-blue-600 dark:text-blue-400">02</span>
            </div>

            {/* Small icon image on hover */}
            <div
              className={cn(
                "relative w-24 h-24 mb-6 rounded-xl overflow-hidden border border-blue-300 dark:border-blue-700",
                "transition-all duration-300",
                hoveredCard === "useCase2" ? "opacity-100 scale-100" : "opacity-0 scale-95",
              )}
            >
              <Image
                loader={({ src }) => src}
                src={`/api/imagegen/dev/${encodeURIComponent(iconPrompts.useCase2)}?ratio=square`}
                alt="Audience targeting icon"
                fill
                className="object-cover"
                sizes="96px"
              />
            </div>

            <h3 className="text-xl font-bold mb-3 text-zinc-900 dark:text-white">
              {t("useCase2.title")}
            </h3>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-4 leading-relaxed">
              {t("useCase2.description")}
            </p>

            <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-1 h-1 mt-1.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                <span>{t("useCase2.point1")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-1 h-1 mt-1.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                <span>{t("useCase2.point2")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-1 h-1 mt-1.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                <span>{t("useCase2.point3")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-1 h-1 mt-1.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                <span>{t("useCase2.point4")}</span>
              </li>
            </ul>
          </div>

          {/* Use Case 3 Card */}
          <div
            className={cn(
              "group relative p-8 rounded-2xl border transition-all duration-300 cursor-default",
              "bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20",
              "border-green-200 dark:border-green-800",
              "hover:shadow-xl hover:-translate-y-1",
              hoveredCard === "useCase3" && "ring-2 ring-green-400 dark:ring-green-600",
            )}
            onMouseEnter={() => setHoveredCard("useCase3")}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="mb-6">
              <span className="text-5xl font-bold text-green-600 dark:text-green-400">03</span>
            </div>

            {/* Small icon image on hover */}
            <div
              className={cn(
                "relative w-24 h-24 mb-6 rounded-xl overflow-hidden border border-green-300 dark:border-green-700",
                "transition-all duration-300",
                hoveredCard === "useCase3" ? "opacity-100 scale-100" : "opacity-0 scale-95",
              )}
            >
              <Image
                loader={({ src }) => src}
                src={`/api/imagegen/dev/${encodeURIComponent(iconPrompts.useCase3)}?ratio=square`}
                alt="Analytics icon"
                fill
                className="object-cover"
                sizes="96px"
              />
            </div>

            <h3 className="text-xl font-bold mb-3 text-zinc-900 dark:text-white">
              {t("useCase3.title")}
            </h3>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-4 leading-relaxed">
              {t("useCase3.description")}
            </p>

            <div className="space-y-2 mb-4 text-xs text-zinc-600 dark:text-zinc-400 italic">
              <p>&ldquo;{t("useCase3.example1")}&rdquo;</p>
              <p>&ldquo;{t("useCase3.example2")}&rdquo;</p>
            </div>

            <div className="pt-4 border-t border-green-200 dark:border-green-800">
              <p className="text-xs font-semibold tracking-wider uppercase text-green-600 dark:text-green-400 mb-1">
                Output
              </p>
              <p className="text-xs text-zinc-700 dark:text-zinc-300">{t("useCase3.output")}</p>
            </div>
          </div>
        </div>

        {/* Visual Workflow Examples - Medium-sized infographics */}
        <div className="mb-32 space-y-16">
          {/* Planning Workflow with Image */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-block px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-semibold rounded-full mb-4">
                WORKFLOW VISUALIZATION
              </div>
              <h3 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-white">
                Visual Content Planning
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                See your entire content calendar at a glance. Drag-and-drop scheduling with
                AI-powered suggestions for optimal posting times.
              </p>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400 mt-0.5">✓</span>
                  <span>4-week planning view with color-coded content types</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400 mt-0.5">✓</span>
                  <span>Auto-schedule based on audience activity patterns</span>
                </li>
              </ul>
            </div>
            <div className="relative aspect-video rounded-xl overflow-hidden border border-purple-200 dark:border-purple-800 shadow-lg">
              <Image
                loader={({ src }) => src}
                src={`/api/imagegen/dev/${encodeURIComponent(mediumImagePrompts.planningWorkflow)}?ratio=landscape`}
                alt="Content planning workflow"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>

          {/* Audience Insights with Image (reversed layout) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="relative aspect-video rounded-xl overflow-hidden border border-blue-200 dark:border-blue-800 shadow-lg lg:order-first order-last">
              <Image
                loader={({ src }) => src}
                src={`/api/imagegen/dev/${encodeURIComponent(mediumImagePrompts.audienceInsights)}?ratio=landscape`}
                alt="Audience insights dashboard"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <div className="lg:order-last">
              <div className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full mb-4">
                AUDIENCE INTELLIGENCE
              </div>
              <h3 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-white">
                Deep Audience Understanding
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                Get detailed persona profiles with demographic data, interests, and engagement
                patterns. Match your content to your audience with 85%+ accuracy.
              </p>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">✓</span>
                  <span>AI-generated persona cards with verified characteristics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">✓</span>
                  <span>Interest mapping and engagement prediction</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Analytics Growth with Image */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-block px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full mb-4">
                GROWTH TRACKING
              </div>
              <h3 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-white">
                Track What Works
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                Real-time analytics showing content performance, trending topics, and growth
                metrics. Identify your viral content patterns.
              </p>
              <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                  <span>Growth percentage tracking with historical comparison</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                  <span>Content performance scoring and viral indicators</span>
                </li>
              </ul>
            </div>
            <div className="relative aspect-video rounded-xl overflow-hidden border border-green-200 dark:border-green-800 shadow-lg">
              <Image
                loader={({ src }) => src}
                src={`/api/imagegen/dev/${encodeURIComponent(mediumImagePrompts.analyticsGrowth)}?ratio=landscape`}
                alt="Growth analytics dashboard"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>

        {/* Real Example - clean professional layout */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-5">
              <p className="text-sm font-semibold tracking-wider uppercase text-brand-green mb-6">
                {t("realExample.title")}
              </p>

              <div className="space-y-6">
                <div>
                  <p className="text-xs font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-500 mb-2">
                    Persona
                  </p>
                  <p className="text-lg font-medium text-zinc-900 dark:text-white">
                    {t("realExample.persona")}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-500 mb-2">
                    Situation
                  </p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {t("realExample.situation")}
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <p className="text-xs font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-500 mb-4">
                Solution
              </p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-6">
                {t("realExample.solution")}
              </p>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-3">
                  <span className="text-brand-green font-semibold">→</span>
                  <span className="text-sm font-medium text-zinc-900 dark:text-white">
                    {t("realExample.output1")}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-brand-green font-semibold">→</span>
                  <span className="text-sm font-medium text-zinc-900 dark:text-white">
                    {t("realExample.output2")}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-brand-green font-semibold">→</span>
                  <span className="text-sm font-medium text-zinc-900 dark:text-white">
                    {t("realExample.output3")}
                  </span>
                </li>
              </ul>

              <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">
                  {t("realExample.result")}
                </p>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 text-sm font-medium text-brand-green hover:underline"
                >
                  {t("realExample.linkText")} →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
