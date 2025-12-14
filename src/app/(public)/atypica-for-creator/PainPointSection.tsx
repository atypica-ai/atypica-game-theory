"use client";
import { useTranslations } from "next-intl";
import { SearchIcon, TrendingUpIcon, CopyIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export function PainPointSection() {
  const t = useTranslations("CreatorPage.PainPointSection");
  const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set());
  const sectionRef = useRef<HTMLElement | null>(null);

  const painPoints = [
    { key: "point1", icon: SearchIcon, borderColor: "#ef4444" }, // 红描边 - 更亮的红色
    { key: "point2", icon: TrendingUpIcon, borderColor: "#fdc700" }, // 黄描边
    { key: "point3", icon: CopyIcon, borderColor: "#60a5fa" }, // 蓝描边 - 更亮的游戏感蓝色
  ];

  useEffect(() => {
    if (typeof window === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute("data-index") || "0");
            setVisibleCards((prev) => new Set([...prev, index]));
          }
        });
      },
      { threshold: 0.1 }
    );

    const cards = sectionRef.current?.querySelectorAll("[data-card]");
    cards?.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-20 md:py-28 bg-zinc-50 dark:bg-zinc-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-EuclidCircularA font-medium text-4xl md:text-5xl tracking-tight mb-6">
            {t("title")}
          </h2>
          <p className="max-w-3xl mx-auto text-lg text-zinc-600 dark:text-zinc-400">
            {t("description")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {painPoints.map((point, index) => {
            const Icon = point.icon;
            const isVisible = visibleCards.has(index);
            return (
              <div
                key={point.key}
                data-card
                data-index={index}
                className={cn(
                  "bg-white dark:bg-zinc-800/50 rounded-2xl p-8 shadow-sm",
                  "hover-lift cursor-pointer border-2 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700",
                  "transition-all duration-500 relative overflow-hidden",
                  isVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-8"
                )}
                style={{
                  transitionDelay: `${index * 0.15}s`,
                  borderTop: `2px solid ${point.borderColor}`,
                }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-lg flex items-center justify-center font-bold text-xl flex-shrink-0",
                      "bg-zinc-50 dark:bg-zinc-800/50 border",
                      "hover-scale icon-bounce-hover transition-all duration-300",
                      "hover:bg-opacity-80"
                    )}
                    style={{
                      borderColor: point.borderColor,
                      color: point.borderColor,
                      borderWidth: "1.5px",
                    }}
                  >
                    {index + 1}
                  </div>
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                      "bg-zinc-50 dark:bg-zinc-800/50 border",
                      "hover-scale icon-rotate-hover transition-all duration-300"
                    )}
                    style={{
                      borderColor: point.borderColor,
                      borderWidth: "1.5px",
                    }}
                  >
                    <Icon
                      className="w-5 h-5"
                      style={{ color: point.borderColor }}
                    />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-3">
                  {t(`${point.key}.title`)}
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400">
                  {t(`${point.key}.description`)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}


