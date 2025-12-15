"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function AskAudienceSectionGameStyle() {
  const t = useTranslations("CreatorPage.AskAudienceSection");
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <section className="py-24 md:py-32 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              background: ["#3b82f6", "#a855f7", "#ec4899"][i % 3],
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: 0.3,
              animation: `float ${3 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
              boxShadow: "0 0 15px currentColor",
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
              background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(168, 85, 247, 0.1))",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              color: "#3b82f6",
            }}
          >
            {t("badge")}
          </span>
        </div>

        <h2 className="font-EuclidCircularA font-bold text-3xl md:text-4xl lg:text-5xl tracking-tight leading-tight mb-4 text-zinc-900 dark:text-white">
          {t("title")}
        </h2>

        <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-400 mb-10 max-w-3xl leading-relaxed">
          {t("subtitle")}
        </p>

        {/* 价值主张 - 醒目强调 */}
        <div
          className="mb-16 p-6 md:p-8 rounded-2xl mx-auto max-w-3xl relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(168, 85, 247, 0.08))",
            border: "2px solid rgba(59, 130, 246, 0.2)",
            boxShadow: "0 8px 32px rgba(59, 130, 246, 0.15)",
          }}
        >
          <p className="text-lg md:text-xl font-bold text-center text-zinc-900 dark:text-white leading-tight">
            {t("value")}
          </p>

          {/* 装饰粒子 */}
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: ["#3b82f6", "#a855f7", "#ec4899"][i],
                top: `${20 + i * 30}%`,
                right: `${10 + i * 5}%`,
                animation: `pulse ${2 + i * 0.5}s ease-in-out infinite`,
                animationDelay: `${i * 0.3}s`,
                boxShadow: "0 0 20px currentColor",
              }}
            />
          ))}
        </div>

        {/* 主要内容网格 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 mb-20">
          {/* 左侧：用例 */}
          <div>
            <h3 className="text-xl md:text-2xl font-bold mb-8 text-zinc-900 dark:text-white flex items-center gap-3">
              <span
                className="w-2 h-8 rounded-full"
                style={{
                  background: "linear-gradient(180deg, #3b82f6, #a855f7)",
                  boxShadow: "0 0 20px rgba(59, 130, 246, 0.5)",
                }}
              />
              {t("useCases.title")}
            </h3>

            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "p-6 rounded-xl border-l-4 transition-all duration-300 cursor-default",
                    "bg-white dark:bg-zinc-900",
                    hoveredItem === `case${i}` && "scale-105 shadow-2xl"
                  )}
                  style={{
                    borderLeftColor: ["#3b82f6", "#a855f7", "#ec4899"][i - 1],
                    boxShadow:
                      hoveredItem === `case${i}`
                        ? `0 0 30px ${["#3b82f640", "#a855f740", "#ec489940"][i - 1]}`
                        : "0 2px 8px rgba(0, 0, 0, 0.05)",
                  }}
                  onMouseEnter={() => setHoveredItem(`case${i}`)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white"
                      style={{
                        background: ["#3b82f6", "#a855f7", "#ec4899"][i - 1],
                        boxShadow: `0 4px 12px ${["#3b82f640", "#a855f740", "#ec489940"][i - 1]}`,
                      }}
                    >
                      {i}
                    </div>
                    <p className="text-base text-zinc-700 dark:text-zinc-300 leading-relaxed flex-1">
                      {t(`useCases.case${i}`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右侧：应用场景 */}
          <div>
            <h3 className="text-xl md:text-2xl font-bold mb-8 text-zinc-900 dark:text-white flex items-center gap-3">
              <span
                className="w-2 h-8 rounded-full"
                style={{
                  background: "linear-gradient(180deg, #ec4899, #f97316)",
                  boxShadow: "0 0 20px rgba(236, 72, 153, 0.5)",
                }}
              />
              {t("applications.title")}
            </h3>

            <ul className="space-y-5">
              {[1, 2, 3, 4].map((i) => (
                <li
                  key={i}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-lg transition-all duration-300",
                    "hover:bg-white dark:hover:bg-zinc-900",
                    hoveredItem === `app${i}` && "scale-105"
                  )}
                  onMouseEnter={() => setHoveredItem(`app${i}`)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <span
                    className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5"
                    style={{
                      background:
                        hoveredItem === `app${i}`
                          ? "linear-gradient(135deg, #ec4899, #f97316)"
                          : "rgba(236, 72, 153, 0.1)",
                      boxShadow:
                        hoveredItem === `app${i}` ? "0 0 20px rgba(236, 72, 153, 0.6)" : "none",
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: hoveredItem === `app${i}` ? "#fff" : "#ec4899",
                      }}
                    />
                  </span>
                  <span className="text-base text-zinc-700 dark:text-zinc-300">
                    {t(`applications.app${i}`)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 收益陈述 */}
        <div className="max-w-4xl mb-20">
          <div
            className="p-6 md:p-8 rounded-2xl border-l-4"
            style={{
              borderLeftColor: "#18FF19",
              background: "linear-gradient(135deg, rgba(24, 255, 25, 0.05), rgba(24, 255, 25, 0.08))",
              boxShadow: "0 4px 20px rgba(24, 255, 25, 0.1)",
            }}
          >
            <p className="text-lg md:text-xl text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {t("benefit")}
            </p>
          </div>
        </div>

        {/* 真实案例 */}
        <div
          className="border-t-2 pt-16"
          style={{ borderColor: "rgba(59, 130, 246, 0.2)" }}
        >
          <p
            className="text-sm font-semibold tracking-wider uppercase mb-6"
            style={{ color: "#3b82f6" }}
          >
            {t("realExample.title")}
          </p>

          <p className="text-base md:text-lg text-zinc-700 dark:text-zinc-300 mb-8 leading-relaxed max-w-4xl">
            {t("realExample.description")}
          </p>

          <div
            className="p-6 rounded-xl inline-block"
            style={{
              background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(168, 85, 247, 0.1))",
              border: "1px solid rgba(59, 130, 246, 0.2)",
            }}
          >
            <p className="text-xs font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-500 mb-2">
              Result
            </p>
            <p className="text-base font-semibold text-zinc-900 dark:text-white">
              {t("realExample.result")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

