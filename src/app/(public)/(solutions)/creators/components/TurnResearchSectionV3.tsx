"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Pause, Play } from "lucide-react";

// Small output format icons
const outputIconPrompts = {
  article: `Icon illustration: Document with text lines. Minimal, clean, neon red accent. Square icon style.`,
  podcast: `Icon illustration: Microphone with audio waves. Minimal, clean, neon blue accent. Square icon style.`,
};

// Medium-sized content transformation infographics
const contentFlowPrompts = {
  multiFormat: `
    Infographic: Content transformation pipeline flow.
    Show: Single research document branching into multiple format outputs (article, video script, social posts, email).
    Information: "1 RESEARCH INPUT", "10+ FORMATS", "80% TIME SAVED" badges with bold numbers.
    Colors: Neon red primary, electric blue secondary accents, bright cyber yellow highlight badges on dark background.
    Style: Flow diagram with arrows, format icons, metric callouts. Bold typography.
    Mood: Efficient, productive, transformative for content creators.
  `,
  socialStrategy: `
    Infographic: Social media content calendar strategy.
    Show: Grid calendar with color-coded post types, engagement metrics, platform icons.
    Information: "30 POSTS/MONTH", "5 PLATFORMS", weekly planning view with content types.
    Colors: Vibrant red, blue, and yellow palette, organized grid layout on a dark background.
    Style: Dashboard-style calendar infographic with data viz elements.
    Mood: Strategic, organized, multi-platform success.
  `,
  rawMaterial: `
    Wide horizontal banner: Podcast audio as raw material for content creation.
    Show: Audio waveform transforming into multiple content formats (YouTube Shorts, LinkedIn posts, blog articles, newsletters).
    Visual flow: Audio waves → text script → multiple content blocks spreading horizontally.
    Information: "ONE PODCAST", "WEEK OF CONTENT", "REUSE EVERYWHERE" labels.
    Colors: Futuristic game-style HUD, neon green primary with red, blue, yellow accents on dark grid background.
    Style: Wide horizontal banner format, height narrow, width wide, sci-fi interface style.
    Mood: Versatile, efficient, content multiplication.
  `,
};

export function TurnResearchSectionV3() {
  const t = useTranslations("CreatorPage.TurnResearchSection");
  const [hoveredOutput, setHoveredOutput] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"overview" | "reuse" | "examples">("overview");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          // ignore play errors (e.g. autoplay restrictions)
        });
    }
  };

  const formatTime = (time: number) => {
    if (!isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <section className="py-24 md:py-32 bg-white dark:bg-zinc-900">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Section Label */}
        <p className="text-sm font-medium tracking-wider uppercase text-zinc-500 dark:text-zinc-400 mb-4">
          {t("badge")}
        </p>

        {/* Title - follow global max heading size */}
        <h2 className="font-EuclidCircularA font-bold text-3xl md:text-4xl lg:text-5xl tracking-tight leading-tight mb-3 text-zinc-900 dark:text-white">
          {t("title")}
        </h2>

        {/* Quick link into AI Podcast / content reuse （紧跟标题后面）*/}
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
            <Link href="/podcasts" prefetch={true}>
              <span className="text-zinc-900 dark:text-white">{t("ctaPodcast")}</span>
            </Link>
          </Button>
        </div>

        {/* Subtitle */}
        <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-400 mb-10 max-w-3xl leading-relaxed">
          {t("subtitle")}
        </p>

        {/* View switcher to keep the section compact but interactive */}
        <div className="mb-10 flex flex-wrap gap-3 justify-center">
          {[
            { id: "overview", label: t("tabs.overview") },
            { id: "reuse", label: t("tabs.reuse") },
            { id: "examples", label: t("tabs.examples") },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as typeof activeView)}
              className={cn(
                "px-4 py-2 rounded-full text-xs md:text-sm font-medium border transition-all duration-300",
                activeView === tab.id
                  ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white border-brand-green shadow-[0_0_18px_rgba(24,255,25,0.3)]"
                  : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-brand-green/70 hover:bg-zinc-900 hover:text-white",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB: 1→10+ block + outputs + ideal for */}
        {activeView === "overview" && (
          <>
            {/* Transformation Flow with Interactive Cards */}
            <div className="mb-16">
              {/* Bold transformation statement */}
              <div className="bg-gradient-to-r from-red-500 via-blue-500 to-amber-400 p-[1px] rounded-2xl mb-8 max-w-2xl mx-auto">
                <div className="bg-white dark:bg-zinc-900 px-6 py-5 rounded-xl">
                  <div className="flex items-center justify-center gap-4 flex-wrap md:flex-nowrap">
                    <span className="text-4xl md:text-5xl font-bold text-red-500">1</span>
                    <span className="text-3xl text-zinc-400">→</span>
                    <span className="text-4xl md:text-5xl font-bold text-blue-400">10+</span>
                    <div className="ml-4">
                      <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Research
                      </p>
                      <p className="text-lg md:text-xl font-bold text-zinc-900 dark:text-white">
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
                    "bg-gradient-to-br from-red-50 to-red-100/30 dark:from-red-950/20 dark:to-red-900/10",
                    "border-red-200 dark:border-red-800",
                    "hover:shadow-2xl hover:-translate-y-2 hover:-rotate-1 hover:scale-[1.02]",
                    hoveredOutput === "article" && "ring-2 ring-red-400 dark:ring-red-600",
                  )}
                  onMouseEnter={() => setHoveredOutput("article")}
                  onMouseLeave={() => setHoveredOutput(null)}
                >
                  <div className="flex items-start gap-4">
                    {/* Small icon image */}
                    <div
                      className={cn(
                        "relative w-16 h-16 rounded-lg overflow-hidden border border-red-300 dark:border-red-700 flex-shrink-0",
                        "bg-white",
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
                    "bg-gradient-to-br from-blue-50 to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/10",
                    "border-blue-200 dark:border-blue-800",
                    "hover:shadow-2xl hover:-translate-y-2 hover:-rotate-1 hover:scale-[1.02]",
                    hoveredOutput === "podcast" && "ring-2 ring-blue-400 dark:ring-blue-600",
                  )}
                  onMouseEnter={() => setHoveredOutput("podcast")}
                  onMouseLeave={() => setHoveredOutput(null)}
                >
                  <div className="flex items-start gap-4">
                    {/* Small icon image */}
                    <div
                      className={cn(
                        "relative w-16 h-16 rounded-lg overflow-hidden border border-blue-300 dark:border-blue-700 flex-shrink-0",
                        "bg-white",
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

            {/* Featured real podcast episode from Atypica */}
            <div className="mb-10 mt-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 md:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-green mb-2">
                Real AI podcast example
              </p>
              <h3 className="text-sm md:text-base font-semibold text-zinc-900 dark:text-white mb-1">
                When Giants Fail: Why Meta Blew Its AI Lead
              </h3>
              <p className="text-xs md:text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                Generated from an Atypica research workflow — turn one deep dive into an episode your audience actually wants to hear.
              </p>

              {/* Compact podcast player styled like Insight Radio sticky player */}
              <audio
                ref={audioRef}
                src="/_public/creator-images/When%20Giants%20Fail_%20Why%20Meta%20Blew%20Its%20AI%20Lead.mp3"
                preload="metadata"
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                onEnded={() => {
                  setIsPlaying(false);
                  setCurrentTime(0);
                }}
                className="hidden"
              />

              <div className="mt-2 rounded-xl border border-zinc-200 bg-white text-zinc-900 dark:border-transparent dark:bg-zinc-950 dark:text-zinc-50 px-4 py-3">
                {/* Top row: title + links */}
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium line-clamp-1 text-zinc-900 dark:text-zinc-50">
                      When Giants Fail: Why Meta Blew Its AI Lead
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]">
                    <Link
                      href="https://atypica.ai/artifacts/podcast/eqxbaF7Yp7qKgTFN/share?utm_source=podcast&utm_medium=share"
                      target="_blank"
                      rel="noreferrer"
                      className="text-zinc-500 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white underline"
                    >
                      View Study
                    </Link>
                    <Link
                      href="/insight-radio"
                      target="_blank"
                      rel="noreferrer"
                      className="text-zinc-500 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white underline"
                    >
                      More Insight Radio
                    </Link>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-green transition-all duration-150"
                      style={{
                        width:
                          duration && isFinite(duration) && duration > 0
                            ? `${Math.min(100, (currentTime / duration) * 100)}%`
                            : "0%",
                      }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400">
                    <span>{formatTime(currentTime)}</span>
                    <span>-{formatTime(Math.max(0, duration - currentTime))}</span>
                  </div>
                </div>

                {/* Controls row */}
                <div className="flex items-center justify-center gap-6 text-[11px] text-zinc-500 dark:text-zinc-300">
                  <span className="text-xs">1x</span>
                  <button
                    type="button"
                    onClick={toggleAudio}
                    className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center",
                      "bg-brand-green text-zinc-900 shadow-[0_0_18px_rgba(34,197,94,0.7)]",
                      "hover:brightness-95 transition-transform duration-150",
                    )}
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4 ml-0.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Ideal For */}
            <div className="mb-10">
              <h3 className="text-xl font-bold mb-6 text-zinc-900 dark:text-white">
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
          </>
        )}

        {/* REUSE TAB: visual flows + formula */}
        {activeView === "reuse" && (
          <>
            <div className="mb-20 border-t border-zinc-200 dark:border-zinc-800 pt-10">
              <h3 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white">
                {t("reuseOptions.title")}
              </h3>

              {/* Wide horizontal banner image - raw material visualization */}
              <div className="mb-10 relative w-full">
                <div
                  className={cn(
                    "relative aspect-[16/3] rounded-xl overflow-hidden",
                    "border border-zinc-200 dark:border-zinc-800",
                    "bg-white dark:bg-zinc-900 shadow-lg",
                    "hover:shadow-xl hover:scale-[1.01] transition-all duration-300",
                  )}
                  style={{
                    animation: "fadeIn 0.8s ease-out",
                  }}
                >
                  <Image
                    loader={({ src }) => src}
                    src={`/api/imagegen/dev/${encodeURIComponent(contentFlowPrompts.rawMaterial)}?ratio=landscape`}
                    alt="Podcast audio as raw material for content creation"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 90vw"
                  />
                  {/* Subtle animated glow overlay on hover */}
                  <div className="pointer-events-none absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300">
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(90deg, rgba(24,255,25,0.1) 0%, rgba(59,130,246,0.1) 50%, rgba(250,204,21,0.1) 100%)",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Content Flow Visualization */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center mb-10">
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-red-200 bg-white dark:border-red-800 dark:bg-zinc-900 shadow-lg max-w-md mx-auto">
                  <Image
                    loader={({ src }) => src}
                    src={`/api/imagegen/dev/${encodeURIComponent(contentFlowPrompts.multiFormat)}?ratio=landscape`}
                    alt="Multi-format content transformation"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                  {/* simple overlay label so there's always some visual even if image fails */}
                  <div className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/50 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-zinc-200">
                    1 → 10+ formats map
                  </div>
                </div>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 dark:text-red-400 font-semibold text-lg">
                      →
                    </span>
                    <span className="text-base text-zinc-700 dark:text-zinc-300">
                      {t("reuseOptions.option1")}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 dark:text-red-400 font-semibold text-lg">
                      →
                    </span>
                    <span className="text-base text-zinc-700 dark:text-zinc-300">
                      {t("reuseOptions.option2")}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 dark:text-red-400 font-semibold text-lg">
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
                    <span className="text-amber-500 dark:text-amber-400 font-semibold text-lg">→</span>
                    <span className="text-base text-zinc-700 dark:text-zinc-300">
                      {t("reuseOptions.option4")}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-amber-500 dark:text-amber-400 font-semibold text-lg">→</span>
                    <span className="text-base text-zinc-700 dark:text-zinc-300">
                      {t("reuseOptions.option5")}
                    </span>
                  </li>
                </ul>
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-amber-200 bg-white dark:border-amber-800 dark:bg-zinc-900 shadow-lg lg:order-last order-first max-w-md mx-auto">
                  <Image
                    loader={({ src }) => src}
                    src={`/api/imagegen/dev/${encodeURIComponent(contentFlowPrompts.socialStrategy)}?ratio=landscape`}
                    alt="Social media strategy calendar"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                  <div className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/50 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-zinc-200">
                    social calendar
                  </div>
                </div>
              </div>
            </div>

            {/* Formula - Bold Statement */}
            <div className="mb-8 text-center py-8 border-y border-zinc-200 dark:border-zinc-800">
              <p className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white leading-tight">
                {t("formula")}
              </p>
            </div>
          </>
        )}

        {/* EXAMPLES TAB: real examples gallery */}
        {activeView === "examples" && (
          <div className="mb-8">
            <h3 className="text-xl md:text-2xl font-bold mb-4 text-zinc-900 dark:text-white">
              {t("realExamples.title")}
            </h3>
            <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400 mb-8 max-w-3xl">
              {t("realExamples.description")}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Example 1 */}
              <Link
                href="https://atypica.ai/artifacts/podcast/eqxbaF7Yp7qKgTFN/share?utm_source=podcast&utm_medium=share"
                target="_blank"
                rel="noreferrer"
                className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 hover:-translate-y-1 transition-transform duration-300"
              >
                <div className="h-24 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900 flex items-center justify-between px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-brand-green/10 flex items-center justify-center text-brand-green text-lg">
                      🎧
                    </div>
                    <p className="text-[11px] md:text-xs text-white line-clamp-2">
                      别再用错误标准选AI浏览器
                    </p>
                  </div>
                  <span className="text-[10px] text-zinc-300 ml-2">Open</span>
                </div>
                <div className="p-4">
                  <p className="text-xs md:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed line-clamp-3">
                    {t("realExamples.example1")}
                  </p>
                </div>
              </Link>

              {/* Example 2 */}
              <Link
                href="https://atypica.musedam.cc/artifacts/podcast/TpfaXsrgesAiYy9j/share?utm_source=podcast&utm_medium=share"
                target="_blank"
                rel="noreferrer"
                className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 hover:-translate-y-1 transition-transform duration-300"
              >
                <div className="h-24 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 flex items-center justify-between px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center text-white text-lg">
                      🎙️
                    </div>
                    <p className="text-[11px] md:text-xs text-white line-clamp-2">
                      Insight Radio episode
                    </p>
                  </div>
                  <span className="text-[10px] text-zinc-200 ml-2">Open</span>
                </div>
                <div className="p-4">
                  <p className="text-xs md:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed line-clamp-3">
                    {t("realExamples.example2")}
                  </p>
                </div>
              </Link>

              {/* Example 3 */}
              <Link
                href="https://atypica.musedam.cc/artifacts/podcast/epKVADrAwJieCQGd/share?utm_source=podcast&utm_medium=share"
                target="_blank"
                rel="noreferrer"
                className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 hover:-translate-y-1 transition-transform duration-300"
              >
                <div className="h-24 bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 flex items-center justify-between px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-brand-green/20 flex items-center justify-center text-brand-green text-lg">
                      ▶
                    </div>
                    <p className="text-[11px] md:text-xs text-white line-clamp-2">
                      Career Resilience in an Uncertain Economy
                    </p>
                  </div>
                  <span className="text-[10px] text-zinc-200 ml-2">Open</span>
                </div>
                <div className="p-4">
                  <p className="text-xs md:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed line-clamp-3">
                    {t("realExamples.example3")}
                  </p>
                </div>
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
