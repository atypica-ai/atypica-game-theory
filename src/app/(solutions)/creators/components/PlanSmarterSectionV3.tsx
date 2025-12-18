"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

// Medium-sized infographic images
const mediumImagePrompts = {
  planningWorkflow: `
    Futuristic HUD-style infographic: Content planning workflow visualization.
    Show: Weekly calendar layout as a holographic board, content idea nodes, drag-and-drop handles.
    Information: "PLAN 4 WEEKS AHEAD", "AUTO-SCHEDULE", timeline with glowing content blocks.
    Colors: Deep charcoal background, neon red accents with subtle blue and yellow highlights.
    Style: Sci-fi game dashboard UI on a grid, organized panels, clean lines.
    Mood: Productive, organized, empowering for content creators.
  `,
  audienceInsights: `
    Futuristic HUD-style infographic: Audience analysis dashboard with persona cards.
    Show: 3 holographic persona cards, demographic bars, interest tag clouds, engagement rings.
    Information: "AUDIENCE SEGMENTS", "85% MATCH", "TOP INTERESTS" labels with bold data.
    Colors: Electric blue gradient with red and yellow accent chips, dark grid background.
    Style: Sci-fi analytics dashboard, card-based layout, clean data viz.
    Mood: Strategic, data-driven, insightful.
  `,
  analyticsGrowth: `
    Futuristic HUD-style infographic: Growth analytics and trending metrics.
    Show: Upward neon line chart, glowing percentage badges, stacked performance bars.
    Information: "+150% GROWTH", "VIRAL CONTENT", performance metrics with numbers.
    Colors: Dark background with neon yellow primary, red and blue secondary accents, white charts.
    Style: Sci-fi KPI dashboard with bold numbers, chart visualizations, achievement badges.
    Mood: Success-oriented, motivating, data-backed confidence.
  `,
};

export function PlanSmarterSectionV3() {
  const t = useTranslations("CreatorsPage.PlanSmarterSection");
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"useCase1" | "useCase2" | "useCase3">("useCase1");

  // Quick-start topics built from existing examples
  const quickStartTopics: { id: string; label: string }[] = [
    { id: "topic-1", label: t("useCase1.example1") },
    { id: "topic-2", label: t("useCase1.example2") },
    { id: "topic-3", label: t("useCase3.example1") },
    { id: "topic-4", label: t("useCase3.example2") },
  ];

  const featureConfigs: {
    id: "useCase1" | "useCase2" | "useCase3";
    number: string;
    accent: "red" | "blue" | "yellow";
    mediumPromptKey: keyof typeof mediumImagePrompts;
  }[] = [
    { id: "useCase1", number: "01", accent: "red", mediumPromptKey: "planningWorkflow" },
    { id: "useCase2", number: "02", accent: "blue", mediumPromptKey: "audienceInsights" },
    { id: "useCase3", number: "03", accent: "yellow", mediumPromptKey: "analyticsGrowth" },
  ];

  const getAccentClasses = (accent: "red" | "blue" | "yellow") => {
    if (accent === "red") {
      return {
        badgeBg: "bg-red-100 dark:bg-red-900/30",
        badgeText: "text-red-700 dark:text-red-300",
        border: "border-red-200 dark:border-red-800",
        number: "text-red-500 dark:text-red-400",
      };
    }
    if (accent === "blue") {
      return {
        badgeBg: "bg-blue-100 dark:bg-blue-900/30",
        badgeText: "text-blue-700 dark:text-blue-300",
        border: "border-blue-200 dark:border-blue-800",
        number: "text-blue-600 dark:text-blue-400",
      };
    }
    return {
      badgeBg: "bg-amber-100 dark:bg-amber-900/30",
      badgeText: "text-amber-700 dark:text-amber-300",
      border: "border-amber-200 dark:border-amber-800",
      number: "text-amber-500 dark:text-amber-400",
    };
  };

  // Simple 2-slide carousel for useCase1 main image
  const [useCase1Slide, setUseCase1Slide] = useState<0 | 1>(0);
  const [useCase1Hovered, setUseCase1Hovered] = useState(false);

  useEffect(() => {
    if (useCase1Hovered) return;
    const id = setInterval(() => {
      setUseCase1Slide((prev) => (prev === 0 ? 1 : 0));
    }, 5000);
    return () => clearInterval(id);
  }, [useCase1Hovered]);

  return (
    <section className="py-32 md:py-40 bg-white dark:bg-zinc-950 relative overflow-hidden">
      {/* 轻量 game-like 背景网格 */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(24, 255, 25, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(24, 255, 25, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* 粒子轨道动效（参考 /atypica-for-creator） */}
      <div className="absolute top-1/4 right-8 w-24 h-24 opacity-40 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full"
          style={{
            background: "#18FF19",
            transform: "translate(-50%, -50%)",
            boxShadow: "0 0 20px rgba(24, 255, 25, 0.6)",
            animation: "glow-pulse 2s ease-in-out infinite",
          }}
        />
        {[0, 1].map((i) => (
          <div
            key={i}
            className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full"
            style={{
              background: "#18FF19",
              transform: "translate(-50%, -50%)",
              animation: `orbit ${3 + i * 0.5}s linear infinite`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        {/* Section Label */}
        <p className="text-xs font-medium tracking-[0.2em] uppercase text-zinc-500 dark:text-zinc-400 mb-4">
          {t("badge")}
        </p>

        {/* Title */}
        <h2 className="font-EuclidCircularA font-bold text-3xl md:text-4xl lg:text-5xl tracking-tight leading-tight mb-3 text-zinc-900 dark:text-white">
          {t("title")}
        </h2>

        {/* Direct jump into AI Research, 放在标题后面 */}
        <div className="mb-5">
          <Button
            size="lg"
            className={cn(
              "rounded-full h-11 px-6 text-sm font-semibold",
              "bg-brand-green hover:brightness-95 text-zinc-900 dark:text-white shadow-[0_0_20px_rgba(34,197,94,0.6)]",
              "transition-all duration-200",
            )}
            asChild
          >
            <Link href="/newstudy" prefetch={true}>
              <span className="text-zinc-900 dark:text-white">{t("ctaResearch")}</span>
            </Link>
          </Button>
        </div>

        {/* Subtitle */}
        <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-400 mb-6 max-w-3xl leading-relaxed">
          {t("subtitle")}
        </p>

        {/* Quick-start topics: tap to immediately start a study */}
        <div className="mb-8">
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
            {t("quickStartPrompt")}
          </p>
          <div className="flex flex-wrap gap-2">
            {quickStartTopics.map((topic) => (
              <Link
                key={topic.id}
                href={`/newstudy?topic=${encodeURIComponent(topic.label)}`}
                prefetch={true}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs md:text-sm",
                  "border border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/80 dark:text-zinc-200",
                  "hover:border-[#18FF19] hover:text-zinc-900 dark:hover:text-white",
                  "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_16px_rgba(24,255,25,0.35)]",
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#18FF19]" />
                <span className="line-clamp-1">{topic.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Tab Navigation - game-like pills */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {featureConfigs.map((feature) => {
            const isActive = activeTab === feature.id;

            return (
              <button
                key={feature.id}
                onClick={() => setActiveTab(feature.id)}
                onMouseEnter={() => setHoveredCard(feature.id)}
                onMouseLeave={() => setHoveredCard(null)}
                className={cn(
                  "px-6 py-3 rounded-lg font-medium transition-all duration-300 border text-sm md:text-base",
                  "hover:scale-105 active:scale-95 relative",
                  isActive
                    ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-lg"
                    : "bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900",
                )}
                style={{
                  borderColor:
                    feature.accent === "red"
                      ? "#f97373"
                      : feature.accent === "blue"
                        ? "#3b82f6"
                        : "#facc15",
                  boxShadow: isActive
                    ? feature.accent === "red"
                      ? "0 0 20px rgba(248, 115, 115, 0.55)"
                      : feature.accent === "blue"
                        ? "0 0 20px rgba(59, 130, 246, 0.55)"
                        : "0 0 20px rgba(250, 204, 21, 0.6)"
                    : hoveredCard === feature.id
                      ? "0 0 10px rgba(24, 255, 25, 0.2)"
                      : undefined,
                }}
              >
                {t(`${feature.id}.title`)}
              </button>
            );
          })}
        </div>

        {/* Active feature content */}
        {featureConfigs.map((feature) => {
          if (activeTab !== feature.id) return null;
          const accentClasses = getAccentClasses(feature.accent);

          return (
            <div key={feature.id} className="max-w-6xl mx-auto animate-scale-in">
              <div className="bg-white dark:bg-zinc-900/70 rounded-3xl p-8 md:p-10 lg:p-12 border border-zinc-200 dark:border-zinc-800 hover:border-[#18FF19]/40 transition-all duration-300 hover:shadow-[0_0_40px_rgba(24,255,25,0.25)]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
                  {/* Left: Text content */}
                  <div className="animate-slide-in-left">
                    <div className="flex items-center gap-3 mb-6">
                      <span className={cn("text-4xl font-bold", accentClasses.number)}>
                        {feature.number}
                      </span>
                      <div
                        className={cn(
                          "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                          accentClasses.badgeBg,
                          accentClasses.badgeText,
                        )}
                      >
                        {t("badge")}
                      </div>
                    </div>

                    <h3 className="text-2xl md:text-3xl font-bold mb-4 text-zinc-900 dark:text-white">
                      {t(`${feature.id}.title`)}
                    </h3>
                    <p className="text-sm md:text-base text-zinc-700 dark:text-zinc-300 mb-6 leading-relaxed">
                      {t(`${feature.id}.description`)}
                    </p>

                    {/* Use-case specific body, 复用现有文案 */}
                    {feature.id === "useCase2" ? (
                      <ul className="space-y-2 text-xs md:text-sm text-zinc-700 dark:text-zinc-300">
                        <li className="flex items-start gap-2">
                          <span className="mt-1 w-1 h-1 rounded-full bg-blue-400 shrink-0" />
                          <span>{t("useCase2.point1")}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-1 w-1 h-1 rounded-full bg-blue-400 shrink-0" />
                          <span>{t("useCase2.point2")}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-1 w-1 h-1 rounded-full bg-blue-400 shrink-0" />
                          <span>{t("useCase2.point3")}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-1 w-1 h-1 rounded-full bg-blue-400 shrink-0" />
                          <span>{t("useCase2.point4")}</span>
                        </li>
                      </ul>
                    ) : (
                      <div className="space-y-3 text-xs md:text-sm text-zinc-700 dark:text-zinc-300">
                        <p className="italic">&ldquo;{t(`${feature.id}.example1`)}&rdquo;</p>
                        <p className="italic">&ldquo;{t(`${feature.id}.example2`)}&rdquo;</p>
                      </div>
                    )}

                    <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                      <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-zinc-500 dark:text-zinc-400 mb-1">
                        Output
                      </p>
                      <p className="text-xs md:text-sm text-zinc-700 dark:text-zinc-200">
                        {feature.id === "useCase2"
                          ? t("useCase2.point4")
                          : t(`${feature.id}.output`)}
                      </p>
                    </div>
                  </div>

                  {/* Right: Image generated via Gemini Image */}
                  <div className="relative animate-slide-in-right w-full max-w-md mx-auto">
                    {feature.id === "useCase1" ? (
                      <div
                        className="relative"
                        onMouseEnter={() => setUseCase1Hovered(true)}
                        onMouseLeave={() => setUseCase1Hovered(false)}
                      >
                        <div
                          className={cn(
                            "relative aspect-square rounded-2xl shadow-2xl overflow-hidden",
                            "bg-white dark:bg-zinc-900 flex items-center justify-center",
                            "hover-scale animate-float border border-zinc-200 dark:border-zinc-800",
                          )}
                        >
                          {useCase1Slide === 0 ? (
                            <Image
                              src={`/api/imagegen/dev/${encodeURIComponent(
                                mediumImagePrompts[feature.mediumPromptKey],
                              )}?ratio=square`}
                              alt={t(`${feature.id}.title`)}
                              fill
                              className="object-cover"
                              sizes="(max-width: 1024px) 100vw, 50vw"
                            />
                          ) : (
                            <Image
                              src="/_public/creator-images/ai research_report.jpg"
                              alt="AI research report real example"
                              fill
                              className="object-cover"
                              sizes="(max-width: 1024px) 100vw, 50vw"
                            />
                          )}
                        </div>
                        {/* Dots for manual switch */}
                        <div className="mt-3 flex justify-center gap-2">
                          {[0, 1].map((idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setUseCase1Slide(idx as 0 | 1)}
                              className={cn(
                                "h-2.5 w-2.5 rounded-full border border-zinc-400 dark:border-zinc-500 transition-colors",
                                useCase1Slide === idx
                                  ? "bg-zinc-900 dark:bg-white"
                                  : "bg-transparent",
                              )}
                              aria-label={
                                idx === 0
                                  ? "Show planning workflow infographic"
                                  : "Show AI research report example"
                              }
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "relative aspect-square rounded-2xl shadow-2xl overflow-hidden",
                          "bg-white dark:bg-zinc-900 flex items-center justify-center",
                          "hover-scale animate-float border border-zinc-200 dark:border-zinc-800",
                        )}
                      >
                        <Image
                          src={`/api/imagegen/dev/${encodeURIComponent(
                            mediumImagePrompts[feature.mediumPromptKey],
                          )}?ratio=square`}
                          alt={t(`${feature.id}.title`)}
                          fill
                          className="object-cover"
                          sizes="(max-width: 1024px) 100vw, 50vw"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
