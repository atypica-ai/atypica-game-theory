"use client";

import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronRightIcon } from "lucide-react";

export function CTASectionGameStyle() {
  const t = useTranslations("CreatorPage.CTASection");

  return (
    <section className="py-24 md:py-32 bg-zinc-950 text-white relative overflow-hidden">
      {/* 背景动画网格 */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(#18FF19 1px, transparent 1px),
              linear-gradient(90deg, #18FF19 1px, transparent 1px)
            `,
            backgroundSize: "80px 80px",
            animation: "grid-slide 20s linear infinite",
          }}
        />
      </div>

      {/* 浮动粒子 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              background: "#18FF19",
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: 0.4,
              animation: `float ${4 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
              boxShadow: "0 0 20px rgba(24, 255, 25, 0.8)",
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        {/* 醒目标题组 */}
        <div className="mb-12 max-w-4xl">
          <h2
            className="font-EuclidCircularA font-bold text-3xl md:text-4xl lg:text-5xl tracking-tight leading-[0.95] mb-6"
            style={{
              textShadow: "0 0 60px rgba(255, 255, 255, 0.3)",
            }}
          >
            {t("headline")}
          </h2>

          <p
            className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6 leading-tight"
            style={{
              color: "#18FF19",
              textShadow: "0 0 40px rgba(24, 255, 25, 0.6)",
            }}
          >
            {t("subheadline")}
          </p>

          <p className="text-base md:text-lg text-zinc-400 max-w-2xl">
            {t("tagline")}
          </p>
        </div>

        {/* 主要价值标题 */}
        <h3 className="text-xl md:text-2xl font-bold mb-8 max-w-3xl leading-tight">
          {t("title")}
        </h3>

        {/* 收益列表 - 大字体 */}
        <div className="mb-10 max-w-3xl">
          <ul className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <li
                key={i}
                className="flex items-start gap-3 group hover:translate-x-2 transition-transform duration-200"
              >
                <span
                  className="shrink-0 w-2 h-2 rounded-full mt-2 group-hover:scale-150 transition-transform duration-200"
                  style={{
                    background: "#18FF19",
                    boxShadow: "0 0 20px rgba(24, 255, 25, 0.8)",
                  }}
                />
                <span className="text-base md:text-lg leading-relaxed">
                  {t(`benefit${i}`)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* 结束陈述 */}
        <p className="text-sm md:text-base text-zinc-400 mb-10 max-w-3xl leading-relaxed">
          {t("closing")}
        </p>

        {/* CTA 按钮 - 超大发光 */}
        <div className="relative inline-block">
          {/* 发光环 */}
          <div
            className="absolute inset-0 rounded-full blur-2xl opacity-60 animate-pulse"
            style={{
              background: "#18FF19",
              transform: "scale(1.2)",
            }}
          />

          <Button
            size="lg"
            className={cn(
              "relative rounded-full h-12 md:h-14 px-8 md:px-12 text-sm md:text-base font-bold",
              "hover:scale-110 active:scale-95 transition-all duration-200 group",
              "overflow-hidden"
            )}
            style={{
              background: "#18FF19",
              color: "#000",
              boxShadow: "0 0 60px rgba(24, 255, 25, 0.6), 0 8px 32px rgba(0, 0, 0, 0.4)",
            }}
            asChild
          >
            <Link href="/newstudy" prefetch={true}>
              {t("ctaButton")}
              <ChevronRightIcon className="h-5 w-5 md:h-6 md:w-6 ml-3 group-hover:translate-x-2 transition-transform duration-200" />

              {/* 按钮内部闪光动画 */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background:
                    "radial-gradient(circle at center, rgba(255, 255, 255, 0.4), transparent 60%)",
                }}
              />

              {/* 扫光效果 */}
              <div
                className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent)",
                }}
              />
            </Link>
          </Button>
        </div>
      </div>

      {/* CSS 动画 */}
      <style jsx global>{`
        @keyframes grid-slide {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(80px, 80px);
          }
        }
      `}</style>
    </section>
  );
}

