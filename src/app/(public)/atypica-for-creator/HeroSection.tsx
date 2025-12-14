"use client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

export function HeroSection() {
  const t = useTranslations("CreatorPage.HeroSection");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="py-20 md:py-32 overflow-hidden">
      <div className="container mx-auto px-4 text-center">
        <p
          className={cn(
            "text-sm font-semibold text-blue-600 dark:text-blue-400 tracking-widest uppercase mb-4",
            "transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
          )}
          style={{ transitionDelay: "0.1s" }}
        >
          {t("badge")}
        </p>
        <div className="relative inline-block max-w-5xl mx-auto mb-6">
          <h1
            className={cn(
              "font-EuclidCircularA",
              "font-medium tracking-tight leading-tight text-3xl sm:text-5xl md:text-6xl",
              "transition-all duration-700 relative z-10",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
            style={{ transitionDelay: "0.2s" }}
          >
            {t("title")}
          </h1>
          {/* Atypica风格动效 - 绿色粒子轨道系统 */}
          <div
            className={cn(
              "absolute top-1/2 -right-8 sm:-right-16 md:-right-24",
              "w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48",
              "transition-all duration-700",
              isVisible ? "opacity-100" : "opacity-0"
            )}
            style={{ transitionDelay: "0.4s" }}
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
            
            {/* 浮动粒子 */}
            {[0, 1, 2, 3].map((i) => (
              <div
                key={`particle-${i}`}
                className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full"
                style={{
                  background: "#18FF19",
                  transform: "translate(-50%, -50%)",
                  animation: `particle-float ${4 + i * 0.5}s ease-in-out infinite`,
                  animationDelay: `${i * 0.4}s`,
                  opacity: 0.6,
                }}
              />
            ))}
          </div>
        </div>
        <p
          className={cn(
            "max-w-4xl mx-auto text-sm sm:text-base md:text-lg text-zinc-600 dark:text-zinc-400 mb-12",
            "transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
          style={{ transitionDelay: "0.3s" }}
        >
          {t("subtitle")}
        </p>

        <div
          className={cn(
            "transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
          style={{ transitionDelay: "0.4s" }}
        >
          <Button
            size="lg"
            className="rounded-full has-[>svg]:px-8 px-8 h-12 hover:scale-105 active:scale-95 transition-transform duration-200 group bg-[#18FF19] hover:bg-[#14E614] text-zinc-900"
            asChild
          >
            <Link href="/newstudy" prefetch={true}>
              {t("ctaButton")}
              <ChevronRightIcon className="h-3 w-3 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}


