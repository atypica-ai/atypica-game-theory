"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

export function HeroSectionGameStyle() {
  const t = useTranslations("CreatorPage.HeroSection");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const painPoints = [t("painPoint1"), t("painPoint2"), t("painPoint3"), t("painPoint4")];

  return (
    <section className="py-24 md:py-32 relative overflow-hidden bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      {/* 背景装饰粒子 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              background: "#18FF19",
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: 0.3,
              animation: `float ${4 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
              boxShadow: "0 0 20px rgba(24, 255, 25, 0.5)",
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        {/* 小标签 - 带发光效果 */}
        <div
          className={cn(
            "mb-6 text-center transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
          )}
        >
          <span
            className="inline-block px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider"
            style={{
              background: "linear-gradient(135deg, rgba(24, 255, 25, 0.1), rgba(24, 255, 25, 0.2))",
              border: "1px solid rgba(24, 255, 25, 0.3)",
              color: "#18FF19",
              boxShadow: "0 0 20px rgba(24, 255, 25, 0.2)",
            }}
          >
            {t("badge")}
          </span>
        </div>

        {/* 主标题 - 带粒子轨道装饰 */}
        <div className="relative mb-6">
          <h1
            className={cn(
              "font-EuclidCircularA font-bold text-center",
              "text-3xl sm:text-4xl md:text-5xl lg:text-6xl",
              "tracking-tight leading-[1.1]",
              "bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 dark:from-white dark:via-zinc-100 dark:to-white",
              "bg-clip-text text-transparent",
              "transition-all duration-700",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
            style={{ transitionDelay: "0.1s" }}
          >
            {t("title")}
          </h1>

          {/* 右侧粒子轨道装饰 */}
          <div
            className={cn(
              "absolute -right-4 md:-right-12 top-0 w-32 h-32 md:w-48 md:h-48",
              "transition-all duration-700",
              isVisible ? "opacity-100 scale-100" : "opacity-0 scale-75"
            )}
            style={{ transitionDelay: "0.3s" }}
          >
            {/* 中心发光点 */}
            <div
              className="absolute top-1/2 left-1/2 w-4 h-4 rounded-full"
              style={{
                background: "#18FF19",
                transform: "translate(-50%, -50%)",
                boxShadow: "0 0 40px rgba(24, 255, 25, 0.8), 0 0 80px rgba(24, 255, 25, 0.4)",
                animation: "glow-pulse 2s ease-in-out infinite",
              }}
            />

            {/* 轨道粒子 */}
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
                style={{
                  background: "#18FF19",
                  transform: "translate(-50%, -50%)",
                  animation: `orbit ${3 + i * 0.5}s linear infinite`,
                  animationDelay: `${i * 0.3}s`,
                  boxShadow: "0 0 10px rgba(24, 255, 25, 0.8)",
                }}
              />
            ))}
          </div>
        </div>

        {/* 副标题 */}
        <p
          className={cn(
            "text-center text-base md:text-lg max-w-3xl mx-auto mb-10",
            "text-zinc-600 dark:text-zinc-400",
            "transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
          style={{ transitionDelay: "0.2s" }}
        >
          {t("subtitle")}
        </p>

        {/* 痛点 - 游戏化卡片 */}
        <div
          className={cn(
            "grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto mb-10",
            "transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
          style={{ transitionDelay: "0.3s" }}
        >
          {painPoints.map((point, index) => (
            <div
              key={index}
              className="group relative p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-[#18FF19] dark:hover:border-[#18FF19] transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-default"
              style={{
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
              }}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                  style={{
                    background: "rgba(24, 255, 25, 0.1)",
                    border: "2px solid rgba(24, 255, 25, 0.3)",
                  }}
                >
                  <span className="text-[10px] font-bold" style={{ color: "#18FF19" }}>
                    {index + 1}
                  </span>
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {point}
                </p>
              </div>

              {/* 悬停发光效果 */}
              <div
                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle at center, rgba(24, 255, 25, 0.05), transparent 70%)",
                }}
              />
            </div>
          ))}
        </div>

        {/* 价值主张 - 强调块 */}
        <div
          className={cn(
            "max-w-3xl mx-auto mb-8 p-5 rounded-xl relative overflow-hidden",
            "transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
          style={{
            transitionDelay: "0.4s",
            background: "linear-gradient(135deg, rgba(24, 255, 25, 0.05), rgba(24, 255, 25, 0.1))",
            border: "1px solid rgba(24, 255, 25, 0.2)",
          }}
        >
          <p className="text-base md:text-lg font-semibold text-center text-zinc-900 dark:text-white leading-relaxed">
            {t("value")}
          </p>

          {/* 装饰性发光点 */}
          <div
            className="absolute top-4 right-4 w-2 h-2 rounded-full"
            style={{
              background: "#18FF19",
              boxShadow: "0 0 20px rgba(24, 255, 25, 0.6)",
              animation: "pulse 2s ease-in-out infinite",
            }}
          />
        </div>

        {/* Tagline */}
        <p
          className={cn(
            "text-center text-sm md:text-base text-zinc-600 dark:text-zinc-400 mb-8 max-w-2xl mx-auto",
            "transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
          style={{ transitionDelay: "0.5s" }}
        >
          {t("tagline")}
        </p>

        {/* CTA按钮 - 游戏化设计 */}
        <div
          className={cn(
            "text-center transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
          style={{ transitionDelay: "0.6s" }}
        >
          <Button
            size="lg"
            className={cn(
              "rounded-full h-12 px-8 text-sm font-semibold",
              "hover:scale-105 active:scale-95 transition-all duration-200 group",
              "relative overflow-hidden"
            )}
            style={{
              background: "#18FF19",
              color: "#000",
              boxShadow: "0 0 30px rgba(24, 255, 25, 0.4), 0 4px 12px rgba(0, 0, 0, 0.1)",
            }}
            asChild
          >
            <Link href="/newstudy" prefetch={true}>
              {t("ctaButton")}
              <ChevronRightIcon className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />

              {/* 按钮发光动画 */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background:
                    "radial-gradient(circle at center, rgba(255, 255, 255, 0.3), transparent 70%)",
                }}
              />
            </Link>
          </Button>
        </div>
      </div>

      {/* 添加必要的关键帧动画 */}
      <style jsx global>{`
        @keyframes glow-pulse {
          0%,
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.7;
            transform: translate(-50%, -50%) scale(1.1);
          }
        }

        @keyframes orbit {
          0% {
            transform: translate(-50%, -50%) rotate(0deg) translateX(60px) rotate(0deg);
          }
          100% {
            transform: translate(-50%, -50%) rotate(360deg) translateX(60px) rotate(-360deg);
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-15px);
          }
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </section>
  );
}

