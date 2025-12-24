"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const personaPanelPrompt = `
  Futuristic AI persona focus group dashboard on a dark grid.
  Multiple glowing persona cards in a panel, chat bubbles, voting buttons.
  Colors: neon green, electric blue, cyber yellow accents on deep charcoal.
  Style: sci-fi game interface, clean, no characters, only UI elements.
`;

export function AskAudienceSectionV3() {
  const t = useTranslations("CreatorPage.AskAudienceSection");

  // Simple 2-slide carousel for the right visual (HUD + real persona video)
  const [activeSlide, setActiveSlide] = useState<0 | 1>(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (hovered) return;
    const id = setInterval(() => {
      setActiveSlide((prev) => (prev === 0 ? 1 : 0));
    }, 5000);
    return () => clearInterval(id);
  }, [hovered]);

  return (
    <section className="py-32 md:py-40 bg-white dark:bg-zinc-950 relative overflow-hidden">
      <div className="container mx-auto px-4 max-w-screen-2xl relative z-10">
        {/* Section Label */}
        <p className="text-sm font-medium tracking-[0.2em] uppercase text-zinc-500 dark:text-zinc-400 mb-4">
          {t("badge")}
        </p>

        {/* Title */}
        <h2 className="font-EuclidCircularA font-bold text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl tracking-tight leading-tight mb-3 text-zinc-900 dark:text-white">
          {t("title")}
        </h2>

        {/* Direct link into AI Personas / Interviews，紧跟在标题后面 */}
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
            <Link href="/interviewProject" prefetch={true}>
              <span className="text-zinc-900 dark:text-white">{t("ctaInterview")}</span>
            </Link>
          </Button>
        </div>

        {/* Subtitle */}
        <p className="text-base md:text-lg xl:text-xl 2xl:text-2xl text-zinc-600 dark:text-zinc-400 mb-4 max-w-5xl leading-relaxed">
          {t("subtitle")}
        </p>

        {/* Value Proposition */}
        <p className="text-xl md:text-2xl xl:text-3xl 2xl:text-4xl font-semibold mb-10 max-w-4xl text-zinc-900 dark:text-white leading-tight">
          {t("value")}
        </p>

        {/* Main Content with visual */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 mb-16 items-center">
          {/* Left: Use Cases + Applications */}
          <div className="space-y-10">
            <div>
              <h3 className="text-lg font-bold mb-6 text-zinc-900 dark:text-white">
                {t("useCases.title")}
              </h3>
              <div className="space-y-4">
                <div className="border-l-2 border-brand-green pl-5">
                  <p className="text-sm md:text-base text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {t("useCases.case1")}
                  </p>
                </div>
                <div className="border-l-2 border-brand-green pl-5">
                  <p className="text-sm md:text-base text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {t("useCases.case2")}
                  </p>
                </div>
                <div className="border-l-2 border-brand-green pl-5">
                  <p className="text-sm md:text-base text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {t("useCases.case3")}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-6 text-zinc-900 dark:text-white">
                {t("applications.title")}
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-1.5 h-1.5 mt-2.5 bg-brand-green rounded-full" />
                  <span className="text-sm md:text-base text-zinc-700 dark:text-zinc-300">{t("applications.app1")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-1.5 h-1.5 mt-2.5 bg-brand-green rounded-full" />
                  <span className="text-sm md:text-base text-zinc-700 dark:text-zinc-300">{t("applications.app2")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-1.5 h-1.5 mt-2.5 bg-brand-green rounded-full" />
                  <span className="text-sm md:text-base text-zinc-700 dark:text-zinc-300">{t("applications.app3")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-1.5 h-1.5 mt-2.5 bg-brand-green rounded-full" />
                  <span className="text-sm md:text-base text-zinc-700 dark:text-zinc-300">{t("applications.app4")}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right: Futuristic persona panel visual + real video carousel */}
          <div
            className="relative w-full max-w-xl mx-auto"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <div className="relative aspect-video rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 shadow-[0_0_24px_rgba(59,130,246,0.4)]">
              {activeSlide === 0 ? (
                <Image
                  loader={({ src }) => src}
                  src={`/api/imagegen/dev/${encodeURIComponent(personaPanelPrompt)}?ratio=landscape`}
                  alt="AI persona focus group dashboard"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              ) : (
                <video
                  src="/_public/creator-images/aipersona_vedio/aipersona_vedio.mov"
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              )}
            </div>
            {/* Carousel dots */}
            <div className="mt-3 flex justify-center gap-2">
              {[0, 1].map((idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveSlide(idx as 0 | 1)}
                  className={cn(
                    "h-2.5 w-2.5 rounded-full border border-zinc-400 dark:border-zinc-500 transition-colors",
                    activeSlide === idx ? "bg-zinc-900 dark:bg-white" : "bg-transparent",
                  )}
                  aria-label={idx === 0 ? "Show AI persona HUD illustration" : "Show AI persona video example"}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Benefit Statement */}
        <div className="max-w-4xl mb-16">
          <p className="text-lg md:text-xl text-zinc-700 dark:text-zinc-300 leading-relaxed border-l-4 border-brand-green pl-8">
            {t("benefit")}
          </p>
        </div>

        {/* Real Example */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-12">
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-brand-green mb-4">
            {t("realExample.title")}
          </p>

          <p className="text-sm md:text-base text-zinc-700 dark:text-zinc-300 mb-6 leading-relaxed max-w-4xl">
            {t("realExample.description")}
          </p>

          <div className="pt-4">
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-zinc-500 mb-1">
              Result
            </p>
            <p className="text-sm font-medium text-zinc-900 dark:text-white">
              {t("realExample.result")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
