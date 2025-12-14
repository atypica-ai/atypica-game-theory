"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

export function HeroSectionV3() {
  const t = useTranslations("CreatorPage.HeroSection");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const painPoints = [
    t("painPoint1"),
    t("painPoint2"),
    t("painPoint3"),
    t("painPoint4"),
  ];

  return (
    <section className="py-32 md:py-40 bg-white dark:bg-zinc-950">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Small label - minimal, no background */}
        <div
          className={cn(
            "mb-8 transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
          )}
        >
          <p className="text-sm font-medium tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
            {t("badge")}
          </p>
        </div>

        {/* Hero Title - BOLD and LARGE */}
        <h1
          className={cn(
            "font-EuclidCircularA font-bold",
            "text-5xl sm:text-6xl md:text-7xl lg:text-8xl",
            "tracking-tight leading-[0.95] mb-8",
            "text-zinc-900 dark:text-white",
            "transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
          style={{ transitionDelay: "0.1s" }}
        >
          {t("title")}
        </h1>

        {/* Subtitle - clean typography */}
        <p
          className={cn(
            "text-xl md:text-2xl leading-relaxed mb-16 max-w-4xl",
            "text-zinc-600 dark:text-zinc-400",
            "transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
          style={{ transitionDelay: "0.2s" }}
        >
          {t("subtitle")}
        </p>

        {/* Pain Points - minimal design with brand green accent */}
        <div
          className={cn(
            "mb-12 max-w-3xl",
            "transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
          style={{ transitionDelay: "0.3s" }}
        >
          <div className="space-y-4">
            {painPoints.map((point, index) => (
              <div
                key={index}
                className="flex items-start gap-4 group"
              >
                <div className="flex-shrink-0 w-1 h-1 mt-3 bg-brand-green rounded-full" />
                <p className="text-base md:text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                  {point}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Value Proposition - emphasized */}
        <div
          className={cn(
            "mb-8 max-w-4xl",
            "transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
          style={{ transitionDelay: "0.4s" }}
        >
          <p className="text-xl md:text-2xl font-medium text-zinc-900 dark:text-white leading-relaxed">
            {t("value")}
          </p>
        </div>

        {/* Tagline */}
        <p
          className={cn(
            "text-base md:text-lg mb-12 max-w-3xl",
            "text-zinc-600 dark:text-zinc-400",
            "transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
          style={{ transitionDelay: "0.5s" }}
        >
          {t("tagline")}
        </p>

        {/* CTA - brand green as the only color accent */}
        <div
          className={cn(
            "transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
          style={{ transitionDelay: "0.6s" }}
        >
          <Button
            size="lg"
            className={cn(
              "rounded-full h-14 px-10 text-base font-semibold",
              "bg-brand-green hover:brightness-95 text-zinc-900",
              "transition-all duration-200 group"
            )}
            asChild
          >
            <Link href="/newstudy" prefetch={true}>
              {t("ctaButton")}
              <ChevronRightIcon className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
