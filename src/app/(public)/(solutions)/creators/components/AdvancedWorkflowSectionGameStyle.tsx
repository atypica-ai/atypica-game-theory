"use client";

import { useTranslations } from "next-intl";

export function AdvancedWorkflowSectionGameStyle() {
  const t = useTranslations("CreatorPage.AdvancedWorkflowSection");

  const workflows = [
    { number: "01", color: "#a855f7", glowColor: "rgba(168, 85, 247, 0.4)" },
    { number: "02", color: "#3b82f6", glowColor: "rgba(59, 130, 246, 0.4)" },
    { number: "03", color: "#18FF19", glowColor: "rgba(24, 255, 25, 0.4)" },
  ];

  return (
    <section className="py-24 md:py-32 bg-zinc-50 dark:bg-zinc-900 relative overflow-hidden">
      {/* 背景装饰网格 */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `linear-gradient(rgba(24, 255, 25, 0.5) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(24, 255, 25, 0.5) 1px, transparent 1px)`,
            backgroundSize: "100px 100px",
          }}
        />
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

        {/* 工作流列表 */}
        <div className="space-y-16">
          {workflows.map((workflow, index) => (
            <div
              key={index}
              className="group"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* 大号数字 */}
                <div className="lg:col-span-2">
                  <div
                    className="relative inline-block"
                    style={{
                      filter: "drop-shadow(0 0 30px currentColor)",
                    }}
                  >
                    <span
                      className="text-7xl md:text-8xl font-bold group-hover:scale-110 transition-transform duration-300 inline-block"
                      style={{
                        color: workflow.color,
                        textShadow: `0 0 40px ${workflow.glowColor}`,
                      }}
                    >
                      {workflow.number}
                    </span>

                    {/* 装饰圆环 */}
                    <div
                      className="absolute -inset-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"
                      style={{
                        background: `radial-gradient(circle, ${workflow.glowColor}, transparent 70%)`,
                      }}
                    />
                  </div>
                </div>

                {/* 内容 */}
                <div className="lg:col-span-10">
                  <h3 className="text-xl md:text-2xl font-bold mb-3 text-zinc-900 dark:text-white group-hover:translate-x-2 transition-transform duration-300">
                    {t(`workflow${index + 1}.title`)}
                  </h3>
                  <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400 mb-4 leading-relaxed">
                    {t(`workflow${index + 1}.description`)}
                  </p>

                  {/* 前置说明（仅workflow3） */}
                  {index === 2 && (
                    <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">
                      {t("workflow3.beforeLaunching")}
                    </p>
                  )}

                  {/* 行动步骤 */}
                  <ul className="space-y-3">
                    {Array.from(
                      { length: index === 0 ? 3 : index === 1 ? 4 : 3 },
                      (_, i) => i + 1
                    ).map((actionNum) => (
                      <li
                        key={actionNum}
                        className="flex items-start gap-3 group/item hover:translate-x-2 transition-transform duration-200"
                      >
                        <span
                          className="font-semibold text-lg mt-0.5 group-hover/item:scale-125 transition-transform duration-200"
                          style={{ color: workflow.color }}
                        >
                          →
                        </span>
                        <span className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                          {t(`workflow${index + 1}.actions.action${actionNum}`)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 分隔线 */}
              {index < workflows.length - 1 && (
                <div
                  className="mt-16 h-0.5"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${workflow.color}40, transparent)`,
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

