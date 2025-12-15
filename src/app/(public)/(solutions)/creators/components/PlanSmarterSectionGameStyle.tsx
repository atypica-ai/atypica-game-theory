"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";

// 小图标提示词 - 简洁直接
const iconPrompts = {
  useCase1: `Icon: Content calendar with checkmarks and planning elements. Clean, minimal, bright purple accent (#a855f7). Square format, modern flat design.`,
  useCase2: `Icon: Target audience with user segments and analysis diagram. Clean, minimal, bright blue accent (#3b82f6). Square format, modern flat design.`,
  useCase3: `Icon: Growth chart trending upward with metrics. Clean, minimal, bright green accent (#18FF19). Square format, modern flat design.`,
};

// 中等信息图提示词
const mediumImagePrompts = {
  planningWorkflow: `
    Create a content planning dashboard infographic.
    Show a weekly calendar with colorful content blocks, scheduling timeline, and idea bubbles.
    Include text labels: "4 WEEKS AHEAD", "AUTO-SCHEDULE", "CONTENT TYPES".
    Use purple gradient background (#a855f7) with white UI cards.
    Style: Modern SaaS dashboard, organized grid, drag-and-drop interface visualization.
    Make it energetic and empowering for content creators.
  `,
  audienceInsights: `
    Create an audience intelligence dashboard.
    Show 3 persona cards with avatars, demographic bars, interest tags, and engagement scores.
    Include text labels: "AUDIENCE SEGMENTS", "85% MATCH", "TOP INTERESTS".
    Use blue-teal gradient (#3b82f6 to teal) with white cards and colored data bars.
    Style: Analytics infographic, card-based layout, professional data visualization.
    Make it strategic and insightful.
  `,
  analyticsGrowth: `
    Create a growth analytics visualization.
    Show upward trending chart, growth percentage badges, content performance bars.
    Include text labels: "+150% GROWTH", "VIRAL CONTENT", performance metrics with numbers.
    Use bright green gradient (#18FF19) with yellow success highlights and white charts.
    Style: Bold numbers, achievement badges, trending indicators.
    Make it motivating and success-oriented.
  `,
};

export function PlanSmarterSectionGameStyle() {
  const t = useTranslations("CreatorPage.PlanSmarterSection");
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const useCases = [
    {
      id: "useCase1",
      color: "#a855f7",
      glowColor: "rgba(168, 85, 247, 0.4)",
      bgGradient: "from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20",
      borderColor: "purple-300 dark:border-purple-700",
      textColor: "purple-600 dark:text-purple-400",
      icon: iconPrompts.useCase1,
    },
    {
      id: "useCase2",
      color: "#3b82f6",
      glowColor: "rgba(59, 130, 246, 0.4)",
      bgGradient: "from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20",
      borderColor: "blue-300 dark:border-blue-700",
      textColor: "blue-600 dark:text-blue-400",
      icon: iconPrompts.useCase2,
    },
    {
      id: "useCase3",
      color: "#18FF19",
      glowColor: "rgba(24, 255, 25, 0.4)",
      bgGradient: "from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20",
      borderColor: "green-300 dark:border-green-700",
      textColor: "text-[#18FF19]",
      icon: iconPrompts.useCase3,
    },
  ];

  return (
    <section className="py-24 md:py-32 bg-zinc-50 dark:bg-zinc-900 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute top-20 right-10 w-32 h-32 opacity-20 pointer-events-none">
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
        {/* Section 标题 */}
        <div className="mb-4">
          <span
            className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
            style={{
              background: "linear-gradient(135deg, rgba(24, 255, 25, 0.1), rgba(24, 255, 25, 0.2))",
              border: "1px solid rgba(24, 255, 25, 0.3)",
              color: "#18FF19",
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

        {/* 交互式用例卡片 - 游戏化设计 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
          {useCases.map((useCase, index) => (
            <div
              key={useCase.id}
              className={cn(
                "group relative p-6 rounded-2xl border-2 transition-all duration-300 cursor-default",
                `bg-gradient-to-br ${useCase.bgGradient}`,
                `border-${useCase.borderColor}`,
                "hover:scale-105 hover:shadow-2xl",
                hoveredCard === useCase.id && "ring-4"
              )}
              style={{
                boxShadow:
                  hoveredCard === useCase.id
                    ? `0 0 40px ${useCase.glowColor}, 0 20px 40px rgba(0, 0, 0, 0.1)`
                    : "0 4px 12px rgba(0, 0, 0, 0.05)",
                ringColor: hoveredCard === useCase.id ? useCase.color : "transparent",
              }}
              onMouseEnter={() => setHoveredCard(useCase.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {/* 大号数字 */}
              <div className="mb-6">
                <span
                  className="text-6xl font-bold"
                  style={{
                    color: useCase.color,
                    textShadow: `0 0 20px ${useCase.glowColor}`,
                  }}
                >
                  0{index + 1}
                </span>
              </div>

              {/* 小图标 - 悬停显示 */}
              <div
                className={cn(
                  "relative w-20 h-20 mb-6 rounded-xl overflow-hidden",
                  `border-2 border-${useCase.borderColor}`,
                  "transition-all duration-300",
                  hoveredCard === useCase.id
                    ? "opacity-100 scale-110 rotate-6"
                    : "opacity-70 scale-100 rotate-0"
                )}
                style={{
                  boxShadow: hoveredCard === useCase.id ? `0 0 30px ${useCase.glowColor}` : "none",
                }}
              >
                <Image
                  loader={({ src }) => src}
                  src={`/api/imagegen/dev/${encodeURIComponent(useCase.icon)}?ratio=square`}
                  alt={`Use case ${index + 1} icon`}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </div>

              {/* 标题和描述 */}
              <h3 className="text-lg font-bold mb-2 text-zinc-900 dark:text-white">
                {t(`useCase${index + 1}.title`)}
              </h3>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 mb-3 leading-relaxed">
                {t(`useCase${index + 1}.description`)}
              </p>

              {/* 示例或要点 */}
              {index === 0 || index === 2 ? (
                <div className="space-y-2 mb-4 text-xs text-zinc-600 dark:text-zinc-400 italic">
                  <p>&ldquo;{t(`useCase${index + 1}.example1`)}&rdquo;</p>
                  <p>&ldquo;{t(`useCase${index + 1}.example2`)}&rdquo;</p>
                </div>
              ) : (
                <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300 mb-4">
                  {[1, 2, 3, 4].map((pointNum) => (
                    <li key={pointNum} className="flex items-start gap-2">
                      <span
                        className="flex-shrink-0 w-1 h-1 mt-1.5 rounded-full"
                        style={{ background: useCase.color }}
                      />
                      <span>{t(`useCase${index + 1}.point${pointNum}`)}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* 输出说明 */}
              {(index === 0 || index === 2) && (
                <div className={`pt-4 border-t border-${useCase.borderColor}`}>
                  <p
                    className={`text-xs font-semibold tracking-wider uppercase ${useCase.textColor} mb-1`}
                  >
                    Output
                  </p>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300">
                    {t(`useCase${index + 1}.output`)}
                  </p>
                </div>
              )}

              {/* 悬停发光效果 */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at center, ${useCase.glowColor}, transparent 70%)`,
                }}
              />
            </div>
          ))}
        </div>

        {/* 工作流可视化 - 带信息图 */}
        <div className="space-y-20 mb-24">
          {/* 规划工作流 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="order-2 lg:order-1">
              <div
                className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4"
                style={{
                  background: "rgba(168, 85, 247, 0.1)",
                  color: "#a855f7",
                  border: "1px solid rgba(168, 85, 247, 0.3)",
                }}
              >
                WORKFLOW VISUALIZATION
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-3 text-zinc-900 dark:text-white">
                Visual Content Planning
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                See your entire content calendar at a glance. Drag-and-drop scheduling with
                AI-powered suggestions for optimal posting times.
              </p>
              <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
                <li className="flex items-start gap-3">
                  <span style={{ color: "#a855f7" }}>✓</span>
                  <span>4-week planning view with color-coded content types</span>
                </li>
                <li className="flex items-start gap-3">
                  <span style={{ color: "#a855f7" }}>✓</span>
                  <span>Auto-schedule based on audience activity patterns</span>
                </li>
              </ul>
            </div>

            <div
              className="order-1 lg:order-2 relative aspect-video rounded-2xl overflow-hidden border-2 shadow-2xl hover:scale-105 transition-transform duration-300"
              style={{
                borderColor: "#a855f7",
                boxShadow: "0 0 40px rgba(168, 85, 247, 0.3)",
              }}
            >
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

          {/* 受众洞察 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div
              className="relative aspect-video rounded-2xl overflow-hidden border-2 shadow-2xl hover:scale-105 transition-transform duration-300"
              style={{
                borderColor: "#3b82f6",
                boxShadow: "0 0 40px rgba(59, 130, 246, 0.3)",
              }}
            >
              <Image
                loader={({ src }) => src}
                src={`/api/imagegen/dev/${encodeURIComponent(mediumImagePrompts.audienceInsights)}?ratio=landscape`}
                alt="Audience insights dashboard"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>

            <div>
              <div
                className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4"
                style={{
                  background: "rgba(59, 130, 246, 0.1)",
                  color: "#3b82f6",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                }}
              >
                AUDIENCE INTELLIGENCE
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-3 text-zinc-900 dark:text-white">
                Deep Audience Understanding
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                Get detailed persona profiles with demographic data, interests, and engagement
                patterns. Match your content to your audience with 85%+ accuracy.
              </p>
              <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
                <li className="flex items-start gap-3">
                  <span style={{ color: "#3b82f6" }}>✓</span>
                  <span>AI-generated persona cards with verified characteristics</span>
                </li>
                <li className="flex items-start gap-3">
                  <span style={{ color: "#3b82f6" }}>✓</span>
                  <span>Interest mapping and engagement prediction</span>
                </li>
              </ul>
            </div>
          </div>

          {/* 增长分析 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="order-2 lg:order-1">
              <div
                className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4"
                style={{
                  background: "rgba(24, 255, 25, 0.1)",
                  color: "#18FF19",
                  border: "1px solid rgba(24, 255, 25, 0.3)",
                }}
              >
                GROWTH TRACKING
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-3 text-zinc-900 dark:text-white">
                Track What Works
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                Real-time analytics showing content performance, trending topics, and growth metrics.
                Identify your viral content patterns.
              </p>
              <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
                <li className="flex items-start gap-3">
                  <span style={{ color: "#18FF19" }}>✓</span>
                  <span>Growth percentage tracking with historical comparison</span>
                </li>
                <li className="flex items-start gap-3">
                  <span style={{ color: "#18FF19" }}>✓</span>
                  <span>Content performance scoring and viral indicators</span>
                </li>
              </ul>
            </div>

            <div
              className="order-1 lg:order-2 relative aspect-video rounded-2xl overflow-hidden border-2 shadow-2xl hover:scale-105 transition-transform duration-300"
              style={{
                borderColor: "#18FF19",
                boxShadow: "0 0 40px rgba(24, 255, 25, 0.3)",
              }}
            >
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

        {/* 真实案例 */}
        <div className="border-t-2 border-zinc-200 dark:border-zinc-800 pt-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-5">
              <p
                className="text-sm font-semibold tracking-wider uppercase mb-6"
                style={{ color: "#18FF19" }}
              >
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
                {[1, 2, 3].map((i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="font-semibold" style={{ color: "#18FF19" }}>
                      →
                    </span>
                    <span className="text-sm font-medium text-zinc-900 dark:text-white">
                      {t(`realExample.output${i}`)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">
                  {t("realExample.result")}
                </p>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
                  style={{ color: "#18FF19" }}
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

