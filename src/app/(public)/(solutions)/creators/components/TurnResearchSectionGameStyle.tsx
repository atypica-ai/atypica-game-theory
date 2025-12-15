"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";

// 小图标
const outputIconPrompts = {
  article: `Icon: Document with text lines and article layout. Clean, minimal, coral-orange accent (#ff6b35). Square format, modern flat design.`,
  podcast: `Icon: Microphone with audio waveforms. Clean, minimal, teal accent (#14b8a6). Square format, modern flat design.`,
};

// 信息图
const contentFlowPrompts = {
  multiFormat: `
    Create a content transformation flow diagram.
    Show one research document branching into multiple outputs: article, video script, social posts, email newsletter.
    Include bold text labels: "1 RESEARCH", "10+ FORMATS", "80% TIME SAVED" in large numbers.
    Use warm coral-orange (#ff6b35) to teal (#14b8a6) gradient with yellow highlight badges.
    Style: Flow diagram with arrows, format icons, metric callouts, bold typography.
    Make it energetic and transformative.
  `,
  socialStrategy: `
    Create a social media calendar strategy view.
    Show weekly grid calendar with color-coded post types, platform icons (Instagram, Twitter, TikTok), engagement metrics.
    Include text labels: "30 POSTS/MONTH", "5 PLATFORMS", content type indicators.
    Use vibrant multi-color palette: Instagram pink, Twitter blue, TikTok teal, organized grid.
    Style: Dashboard calendar infographic with data visualization.
    Make it strategic and organized.
  `,
};

export function TurnResearchSectionGameStyle() {
  const t = useTranslations("CreatorPage.TurnResearchSection");
  const [hoveredOutput, setHoveredOutput] = useState<string | null>(null);

  const outputs = [
    {
      id: "article",
      emoji: "📝",
      color: "#ff6b35",
      bgGradient: "from-orange-50 to-orange-100/30 dark:from-orange-950/20 dark:to-orange-900/10",
      borderColor: "orange-300 dark:border-orange-700",
      icon: outputIconPrompts.article,
    },
    {
      id: "podcast",
      emoji: "🎙️",
      color: "#14b8a6",
      bgGradient: "from-teal-50 to-teal-100/30 dark:from-teal-950/20 dark:to-teal-900/10",
      borderColor: "teal-300 dark:border-teal-700",
      icon: outputIconPrompts.podcast,
    },
  ];

  return (
    <section className="py-24 md:py-32 bg-white dark:bg-zinc-950 relative overflow-hidden">
      {/* 背景装饰 */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            background: i % 2 === 0 ? "#ff6b35" : "#14b8a6",
            left: `${10 + Math.random() * 80}%`,
            top: `${10 + Math.random() * 80}%`,
            opacity: 0.2,
            animation: `float ${3 + Math.random() * 2}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
            boxShadow: `0 0 15px ${i % 2 === 0 ? "rgba(255, 107, 53, 0.5)" : "rgba(20, 184, 166, 0.5)"}`,
          }}
        />
      ))}

      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        {/* Section 标题 */}
        <div className="mb-4">
          <span
            className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
            style={{
              background: "linear-gradient(135deg, rgba(255, 107, 53, 0.1), rgba(20, 184, 166, 0.1))",
              border: "1px solid rgba(255, 107, 53, 0.3)",
              color: "#ff6b35",
            }}
          >
            {t("badge")}
          </span>
        </div>

        <h2 className="font-EuclidCircularA font-bold text-3xl md:text-4xl lg:text-5xl tracking-tight leading-tight mb-4 text-zinc-900 dark:text-white">
          {t("title")}
        </h2>

        <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-400 mb-12 max-w-3xl leading-relaxed">
          {t("subtitle")}
        </p>

        {/* 转化声明 - 醒目 */}
        <div className="mb-16">
          <div
            className="p-2 rounded-3xl mx-auto max-w-3xl"
            style={{
              background: "linear-gradient(135deg, #ff6b35, #14b8a6)",
            }}
          >
            <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl">
              <div className="flex items-center justify-center gap-4 md:gap-6 flex-wrap">
                <div
                  className="text-5xl md:text-6xl font-bold"
                  style={{
                    color: "#ff6b35",
                    textShadow: "0 0 30px rgba(255, 107, 53, 0.5)",
                  }}
                >
                  1
                </div>
                <div className="text-4xl md:text-5xl text-zinc-400">→</div>
                <div
                  className="text-5xl md:text-6xl font-bold"
                  style={{
                    color: "#14b8a6",
                    textShadow: "0 0 30px rgba(20, 184, 166, 0.5)",
                  }}
                >
                  10+
                </div>
                <div className="ml-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Research
                  </p>
                  <p className="text-lg md:text-xl font-bold text-zinc-900 dark:text-white">
                    Multiple Outputs
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 输出格式卡片 */}
        <div className="mb-16">
          <h3 className="text-2xl md:text-3xl font-bold mb-8 text-zinc-900 dark:text-white">
            {t("outputs.title")}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {outputs.map((output, index) => (
              <div
                key={output.id}
                className={cn(
                  "relative p-6 rounded-2xl border-2 transition-all duration-300 cursor-default",
                  `bg-gradient-to-br ${output.bgGradient}`,
                  `border-${output.borderColor}`,
                  "hover:scale-105 hover:shadow-2xl"
                )}
                style={{
                  boxShadow:
                    hoveredOutput === output.id
                      ? `0 0 40px ${output.color}40`
                      : "0 4px 12px rgba(0, 0, 0, 0.05)",
                }}
                onMouseEnter={() => setHoveredOutput(output.id)}
                onMouseLeave={() => setHoveredOutput(null)}
              >
                <div className="flex items-start gap-4">
                  {/* 小图标 */}
                  <div
                    className={cn(
                      "relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0",
                      `border-2 border-${output.borderColor}`,
                      "transition-all duration-300"
                    )}
                    style={{
                      transform:
                        hoveredOutput === output.id ? "scale(1.2) rotate(10deg)" : "scale(1)",
                      boxShadow: hoveredOutput === output.id ? `0 0 30px ${output.color}60` : "none",
                    }}
                  >
                    <Image
                      loader={({ src }) => src}
                      src={`/api/imagegen/dev/${encodeURIComponent(output.icon)}?ratio=square`}
                      alt={`${output.id} output`}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>

                  <div className="flex-1">
                    <span className="text-4xl mb-3 block">{output.emoji}</span>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {t(`outputs.output${index + 1}`)}
                    </p>
                  </div>
                </div>

                {/* 悬停发光 */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 pointer-events-none"
                  style={{
                    opacity: hoveredOutput === output.id ? 1 : 0,
                    background: `radial-gradient(circle at center, ${output.color}20, transparent 70%)`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 理想用户类型 */}
        <div className="mb-20">
          <h3 className="text-xl font-bold mb-6 text-zinc-900 dark:text-white">
            {t("idealFor.title")}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 hover:scale-105 transition-transform duration-200"
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: "#18FF19", boxShadow: "0 0 10px rgba(24, 255, 25, 0.5)" }}
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{t(`idealFor.type${i}`)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 内容流可视化 */}
        <div className="mb-28">
          <h3 className="text-2xl md:text-3xl font-bold mb-12 text-zinc-900 dark:text-white">
            {t("reuseOptions.title")}
          </h3>

          {/* 多格式转化 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center mb-16">
            <div
              className="relative aspect-video rounded-2xl overflow-hidden border-2 shadow-2xl hover:scale-105 transition-transform duration-300"
              style={{
                borderColor: "#ff6b35",
                boxShadow: "0 0 40px rgba(255, 107, 53, 0.3)",
              }}
            >
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
              {[1, 2, 3].map((i) => (
                <li key={i} className="flex items-start gap-3 group">
                  <span
                    className="font-semibold text-xl group-hover:scale-125 transition-transform duration-200"
                    style={{ color: "#ff6b35" }}
                  >
                    →
                  </span>
                  <span className="text-base text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                    {t(`reuseOptions.option${i}`)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* 社交策略 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <ul className="space-y-4 lg:order-first">
              {[4, 5].map((i) => (
                <li key={i} className="flex items-start gap-3 group">
                  <span
                    className="font-semibold text-xl group-hover:scale-125 transition-transform duration-200"
                    style={{ color: "#14b8a6" }}
                  >
                    →
                  </span>
                  <span className="text-base text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                    {t(`reuseOptions.option${i}`)}
                  </span>
                </li>
              ))}
            </ul>

            <div
              className="relative aspect-video rounded-2xl overflow-hidden border-2 shadow-2xl lg:order-last order-first hover:scale-105 transition-transform duration-300"
              style={{
                borderColor: "#14b8a6",
                boxShadow: "0 0 40px rgba(20, 184, 166, 0.3)",
              }}
            >
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

        {/* 公式陈述 - 强调 */}
        <div
          className="mb-28 text-center py-16 rounded-3xl"
          style={{
            background: "linear-gradient(135deg, rgba(255, 107, 53, 0.05), rgba(20, 184, 166, 0.05))",
            border: "2px solid rgba(255, 107, 53, 0.2)",
          }}
        >
          <p className="text-3xl md:text-4xl lg:text-5xl font-bold text-zinc-900 dark:text-white leading-tight px-4">
            {t("formula")}
          </p>
        </div>

        {/* 真实案例 */}
        <div>
          <h3 className="text-2xl md:text-3xl font-bold mb-6 text-zinc-900 dark:text-white">
            {t("realExamples.title")}
          </h3>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-12 max-w-4xl">
            {t("realExamples.description")}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-6 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 hover:border-[#18FF19] hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 bg-white dark:bg-zinc-900"
                style={{
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                }}
              >
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {t(`realExamples.example${i}`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

