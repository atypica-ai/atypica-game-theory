"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const heroImagePrompt = `
  Futuristic creator control room UI on a dark grid background.
  Three panels labeled AI Research, AI Persona, AI Podcast with glowing red, blue, and yellow neon outlines.
  Minimal but vibrant dashboard elements, charts and blocks.
  Style: sci-fi game HUD, clean lines, subtle glow, no characters.
  Colors: deep charcoal background, neon red, electric blue, cyber yellow accents, a little brand green.
`;

export function HeroSectionV3() {
  const t = useTranslations("CreatorsPage.HeroSection");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const painPoints = [t("painPoint1"), t("painPoint2"), t("painPoint3"), t("painPoint4")];

  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      {/* Colored neon grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20 dark:opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(rgba(248, 113, 113, 0.09) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.09) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Scattered color sparkles - positioned more conservatively */}
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className="pointer-events-none absolute w-32 h-32 rounded-full blur-3xl opacity-30"
          style={{
            top: `${15 + row * 20}%`,
            left: row === 1 ? "70%" : "15%",
            background:
              row === 0
                ? "radial-gradient(circle at center, rgba(248,113,113,0.3), transparent 70%)"
                : row === 1
                  ? "radial-gradient(circle at center, rgba(59,130,246,0.3), transparent 70%)"
                  : "radial-gradient(circle at center, rgba(250,204,21,0.3), transparent 70%)",
          }}
        />
      ))}

      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Small label - with subtle glow to echo game feel */}
          <div
            className={cn(
              "mb-4 transition-all duration-700",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2",
            )}
          >
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-1 text-[11px] font-semibold tracking-[0.22em] uppercase text-zinc-800 dark:text-zinc-100"
              style={{
                background:
                  "linear-gradient(135deg, rgba(248,113,113,0.08), rgba(59,130,246,0.08), rgba(250,204,21,0.08))",
                border: "1px solid rgba(148,163,184,0.5)",
                boxShadow:
                  "0 0 18px rgba(248,113,113,0.2), 0 0 18px rgba(59,130,246,0.2), 0 0 16px rgba(250,204,21,0.25)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {t("badge")}
            </span>
          </div>

          {/* Hero Title + subtle particle orbit decoration */}
          <div className="relative mb-6 inline-block">
            <h1
              className={cn(
                "font-EuclidCircularA font-bold",
                "text-5xl md:text-6xl lg:text-7xl",
                "tracking-tight leading-[0.95]",
                "text-zinc-900 dark:text-white",
                "transition-all duration-700",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
              )}
              style={{ transitionDelay: "0.1s" }}
            >
              {t("title")}
            </h1>

            {/* Right-side brand green accent */}
            <div
              className={cn(
                "pointer-events-none absolute -right-10 md:-right-14 top-1/2 h-14 w-14 md:h-16 md:w-16",
                "transition-all duration-700",
                isVisible ? "opacity-100 scale-100" : "opacity-0 scale-75",
              )}
              style={{ transitionDelay: "0.25s" }}
            >
              <div
                className="absolute top-1/2 left-1/2 h-2.5 w-2.5 rounded-full"
                style={{
                  background: "#22c55e",
                  transform: "translate(-50%, -50%)",
                  boxShadow: "0 0 26px rgba(34,197,94,0.9)",
                  animation: "glow-pulse 2s ease-in-out infinite",
                }}
              />
              {/* Multi-color orbiting particles */}
              {[0, 1, 2].map((i) => {
                const colors = ["#f97373", "#3b82f6", "#facc15"];
                const shadows = [
                  "0 0 16px rgba(248,115,115,0.9)",
                  "0 0 16px rgba(59,130,246,0.9)",
                  "0 0 16px rgba(250,204,21,0.9)",
                ];
                return (
                  <div
                    key={i}
                    className="absolute top-1/2 left-1/2 h-1 w-1 rounded-full"
                    style={{
                      background: colors[i],
                      transform: "translate(-50%, -50%)",
                      animation: `orbit ${3 + i * 0.6}s linear infinite`,
                      animationDelay: `${i * 0.25}s`,
                      boxShadow: shadows[i],
                    }}
                  />
                );
              })}
              {/* Floating sparkles */}
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={`particle-${i}`}
                  className="absolute top-1/2 left-1/2 h-1 w-1 rounded-sm"
                  style={{
                    background:
                      i % 3 === 0
                        ? "rgba(248,113,113,0.9)"
                        : i % 3 === 1
                          ? "rgba(59,130,246,0.9)"
                          : "rgba(250,204,21,0.9)",
                    transform: "translate(-50%, -50%)",
                    animation: `float ${4 + i * 0.4}s ease-in-out infinite`,
                    animationDelay: `${i * 0.3}s`,
                    opacity: 0.8,
                    boxShadow: "0 0 10px rgba(24, 255, 25, 0.6)",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Subtitle - clean typography */}
          <p
            className={cn(
              "text-xl md:text-2xl leading-relaxed mb-10 mx-auto max-w-3xl",
              "text-zinc-600 dark:text-zinc-400",
              "transition-all duration-700",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
            )}
            style={{ transitionDelay: "0.2s" }}
          >
            {t("subtitle")}
          </p>

          {/* Pain Points - 2x2 futuristic cards */}
          <div
            className={cn(
              "mb-10 mx-auto",
              "transition-all duration-700",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
            )}
            style={{ transitionDelay: "0.3s" }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {painPoints.map((point, index) => (
                <div
                  key={index}
                  className="group relative overflow-hidden rounded-xl border border-border bg-card/70 px-4 py-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_0_24px_rgba(59,130,246,0.4)]"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-muted text-[11px] font-semibold text-muted-foreground">
                      #{index + 1}
                    </div>
                    <p className="text-sm md:text-base text-foreground/80 leading-relaxed group-hover:text-foreground transition-colors">
                      {point}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Value Proposition - emphasized */}
          <div
            className={cn(
              "mb-6 mx-auto",
              "transition-all duration-700",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
            )}
            style={{ transitionDelay: "0.4s" }}
          >
            <p className="text-base md:text-lg font-medium text-zinc-900 dark:text-white leading-relaxed">
              {t("value")}
            </p>
          </div>

          {/* Tagline */}
          <p
            className={cn(
              "text-sm md:text-base mb-10 mx-auto",
              "text-zinc-600 dark:text-zinc-500",
              "transition-all duration-700",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
            )}
            style={{ transitionDelay: "0.5s" }}
          >
            {t("tagline")}
          </p>

          {/* CTA - brand green as the only color accent */}
          <div
            className={cn(
              "transition-all duration-700",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
            )}
            style={{ transitionDelay: "0.6s" }}
          >
            <Button
              size="lg"
              className="bg-primary text-primary-foreground rounded-full shadow-[0_0_28px_rgba(34,197,94,0.7)] h-12 px-6 group"
              asChild
            >
              <Link href="/newstudy" prefetch={true}>
                <span>{t("ctaButton")}</span>
                <ChevronRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
            </Button>
          </div>
          {/* Futuristic hero illustration panel */}
          <div
            className={cn(
              "mt-12 mx-auto max-w-4xl relative",
              "transition-all duration-700",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
            )}
            style={{ transitionDelay: "0.7s" }}
          >
            <div className="relative rounded-3xl overflow-hidden border border-border bg-muted/50">
              {/* Neon frame overlay */}
              <div className="pointer-events-none absolute inset-0 z-10">
                <div
                  className="absolute inset-0 rounded-3xl hidden dark:block"
                  style={{
                    boxShadow:
                      "0 0 30px rgba(248,113,113,0.4), 0 0 40px rgba(59,130,246,0.4), 0 0 30px rgba(250,204,21,0.4)",
                  }}
                />
                <div
                  className="absolute inset-px rounded-[1.4rem]"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(248,113,113,0.3), rgba(59,130,246,0.3), rgba(250,204,21,0.35))",
                    opacity: 0.35,
                    mixBlendMode: "screen",
                  }}
                />
              </div>

              <div className="relative aspect-video">
                <Image
                  src={`/api/imagegen/dev/${encodeURIComponent(heroImagePrompt)}?ratio=landscape`}
                  alt="Futuristic creator control room UI"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 70vw"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
