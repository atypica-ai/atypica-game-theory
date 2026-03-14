"use client";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

const stats = [
  { id: "personasCreated", value: "300K", numericValue: 300_000, suffix: "K" },
  { id: "interviewsConducted", value: "+1M", numericValue: 1_000_000, suffix: "M" },
  { id: "minutesPerResearch", value: "<30m", numericValue: 30, suffix: "" },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function AnimatedCounter({
  targetValue,
  suffix,
  duration,
}: {
  targetValue: number;
  suffix: string;
  duration: number;
}) {
  const [count, setCount] = useState(targetValue);
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 },
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    // Reset to 0 and start animation
    setCount(0);

    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for more natural animation
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * targetValue);

      setCount(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [isVisible, targetValue, duration]);

  const formatValue = (value: number) => {
    if (suffix === "K") {
      return `${(value / 1_000).toFixed(0)}K`;
    }
    if (suffix === "M") {
      return `${(value / 1_000_000).toFixed(0)}M`;
    }
    if (suffix === "") {
      return `${value}`;
    }
    return `${value}${suffix}`;
  };

  return (
    <div ref={elementRef} className="text-6xl md:text-7xl font-bold mb-2">
      {formatValue(count)}
    </div>
  );
}

export function StatsSection() {
  const t = useTranslations("HomePageV3.StatsSection");
  return (
    <section className="pb-20 md:pb-28 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="font-EuclidCircularA font-medium text-3xl md:text-4xl mb-4">
            {t("title")}
          </h2>
          <p className="font-EuclidCircularA font-medium text-3xl md:text-4xl">
            {t("subtitle")}{" "}
            <span className="italic font-InstrumentSerif">{t("subtitleHighlight")}</span>{" "}
            {t("subtitleEnd")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-4 py-2 rounded-full text-sm font-medium">
              {t("badges.aiPersonas")}
            </span>
            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium">
              {t("badges.expertInterviews")}
            </span>
            <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-4 py-2 rounded-full text-sm font-medium">
              {t("badges.behavioralInsights")}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {stats.map((stat) => (
            <div key={stat.id} className="text-center">
              {/* <AnimatedCounter
                targetValue={stat.numericValue}
                suffix={stat.suffix}
                duration={1500}
              /> */}
              <div className="text-6xl md:text-7xl font-bold mb-2">{stat.value}</div>
              <div className="text-zinc-600 dark:text-zinc-400 text-sm font-medium uppercase tracking-wider">
                {stat.id === "personasCreated" && t("stats.personasCreated")}
                {stat.id === "interviewsConducted" && t("stats.interviewsConducted")}
                {stat.id === "minutesPerResearch" && t("stats.minutesPerResearch")}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
