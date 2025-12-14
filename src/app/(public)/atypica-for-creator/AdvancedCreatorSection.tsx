"use client";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { NetworkIcon, CogIcon, HandshakeIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function AdvancedCreatorSection() {
  const t = useTranslations("CreatorPage.AdvancedCreatorSection");
  const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set());
  const sectionRef = useRef<HTMLElement | null>(null);

  const features = [
    {
      key: "contentColumn",
      icon: NetworkIcon,
    },
    {
      key: "differentiation",
      icon: CogIcon,
    },
    {
      key: "paidContent",
      icon: HandshakeIcon,
    },
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
    <section ref={sectionRef} className="py-20 md:py-28 bg-white dark:bg-zinc-900 relative overflow-hidden">
      {/* 背景装饰网格 */}
      <div 
        className="absolute inset-0 opacity-30 dark:opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(24, 255, 25, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(24, 255, 25, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />
      
      {/* 多个粒子轨道动效 */}
      {[0, 1, 2].map((orbitIndex) => (
        <div 
          key={orbitIndex}
          className="absolute pointer-events-none"
          style={{
            top: `${20 + orbitIndex * 30}%`,
            left: orbitIndex % 2 === 0 ? "5%" : "85%",
            width: "80px",
            height: "80px",
            opacity: 0.25,
          }}
        >
          <div
            className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full"
            style={{
              background: "#18FF19",
              transform: "translate(-50%, -50%)",
              boxShadow: "0 0 20px rgba(24, 255, 25, 0.8)",
              animation: "glow-pulse 2.5s ease-in-out infinite",
              animationDelay: `${orbitIndex * 0.5}s`,
            }}
          />
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full"
              style={{
                background: "#18FF19",
                transform: "translate(-50%, -50%)",
                animation: `orbit ${4 + i * 0.5}s linear infinite`,
                animationDelay: `${orbitIndex * 0.3 + i * 0.2}s`,
              }}
            />
          ))}
        </div>
      ))}
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16 relative">
          {/* 标题装饰元素 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 opacity-5 dark:opacity-10 pointer-events-none">
            <div 
              className="absolute inset-0 rounded-full border-2"
              style={{
                borderColor: "#18FF19",
                animation: "rotate-slow 20s linear infinite",
              }}
            />
            <div 
              className="absolute inset-4 rounded-full border"
              style={{
                borderColor: "#18FF19",
                animation: "rotate-slow 15s linear infinite reverse",
              }}
            />
          </div>
          
          <p className="text-sm font-semibold text-blue-400 dark:text-[#18FF19] tracking-widest uppercase mb-4 relative z-10">
            {t("badge")}
          </p>
          <h2 className="font-EuclidCircularA font-medium text-4xl md:text-5xl tracking-tight mb-6 relative z-10">
            {t("title")}
          </h2>
          <p className="max-w-3xl mx-auto text-lg text-zinc-600 dark:text-zinc-400 relative z-10">
            {t("description")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const isVisible = visibleCards.has(index);
            return (
              <div
                key={feature.key}
                data-card
                data-index={index}
                className={cn(
                  "p-8 rounded-2xl shadow-lg",
                  "bg-gradient-to-br from-zinc-50 via-white to-zinc-50 dark:from-zinc-800/90 dark:via-zinc-800/80 dark:to-zinc-900/90",
                  "hover-lift cursor-pointer border advanced-card",
                  "transition-all duration-500 relative overflow-hidden",
                  "hover:shadow-2xl hover:shadow-[#18FF19]/10",
                  isVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-8"
                )}
                style={{
                  transitionDelay: `${index * 0.15}s`,
                  borderColor: "#18FF19",
                  borderWidth: "1.5px",
                  borderTop: `2px solid #18FF19`,
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(24, 255, 25, 0.1)",
                }}
              >
                {/* 装饰性几何图形 */}
                <div 
                  className="absolute top-4 right-4 w-16 h-16 opacity-10 dark:opacity-5"
                  style={{
                    background: "linear-gradient(135deg, #18FF19 0%, transparent 100%)",
                    borderRadius: "50%",
                    filter: "blur(20px)",
                  }}
                />
                <div 
                  className="absolute bottom-4 left-4 w-12 h-12 opacity-10 dark:opacity-5"
                  style={{
                    background: "linear-gradient(45deg, transparent 0%, #18FF19 100%)",
                    borderRadius: "50%",
                    filter: "blur(15px)",
                  }}
                />
                
                {/* 顶部装饰线条 */}
                <div 
                  className="absolute top-0 left-0 right-0 h-0.5 opacity-50"
                  style={{
                    background: "linear-gradient(90deg, transparent, #18FF19, transparent)",
                  }}
                />
                
                <div
                  className={cn(
                    "w-14 h-14 rounded-xl mb-6 flex items-center justify-center relative advanced-icon-container",
                    "bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800/80 dark:to-zinc-900/80 border-2",
                    "hover-scale icon-bounce-hover transition-all duration-300",
                    "shadow-md"
                  )}
                  style={{
                    borderColor: "#18FF19",
                  }}
                >
                  {/* 图标背景渐变 */}
                  <div 
                    className="absolute inset-0 rounded-xl opacity-20"
                    style={{
                      background: "radial-gradient(circle, #18FF19 0%, transparent 70%)",
                    }}
                  />
                  <Icon
                    className="w-7 h-7 text-zinc-500 dark:text-zinc-300 relative z-10"
                    style={{ 
                      strokeWidth: 2,
                    }}
                  />
                </div>
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold mb-4 relative">
                    {t(`${feature.key}.title`)}
                    {/* 标题下划线装饰 */}
                    <span 
                      className="absolute bottom-0 left-0 h-0.5 w-12 opacity-50"
                      style={{
                        background: "linear-gradient(90deg, #18FF19, transparent)",
                      }}
                    />
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
                    {t(`${feature.key}.description`)}
                  </p>
                  <div className="space-y-4 p-4 rounded-lg bg-zinc-50/50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700/50">
                    <h4 className="font-semibold text-sm text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                      <span className="w-1 h-4 bg-[#18FF19] rounded-full" />
                      {t(`${feature.key}.howToUse.title`)}
                    </h4>
                    <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {[1, 2].map((i) => (
                        <li
                          key={i}
                          className="flex items-start gap-3 transition-all duration-300 hover:translate-x-2 group"
                        >
                          <span 
                            className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-300 group-hover:scale-150"
                            style={{ 
                              background: "#18FF19",
                              boxShadow: "0 0 8px rgba(24, 255, 25, 0.5)",
                            }}
                          />
                          <span className="flex-1">{t(`${feature.key}.howToUse.step${i}`)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}


