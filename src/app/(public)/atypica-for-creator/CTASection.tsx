"use client";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ChevronRightIcon, WorkflowIcon, BrainIcon, RocketIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export function CTASection() {
  const t = useTranslations("CreatorPage.CTASection");
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);

  // 使用描边而不是实色
  const benefits = [
    { icon: WorkflowIcon, key: "benefit1", borderColor: "#ef4444" }, // 红描边 - 更亮的红色
    { icon: BrainIcon, key: "benefit2", borderColor: "#fdc700" }, // 黄描边
    { icon: RocketIcon, key: "benefit3", borderColor: "#60a5fa" }, // 蓝描边 - 更亮的游戏感蓝色
  ];

  useEffect(() => {
    if (typeof window === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-20 md:py-32 bg-zinc-900 dark:bg-zinc-950 text-white relative overflow-hidden">
      {/* 粒子轨道动效 */}
      <div className="absolute top-1/2 right-12 w-28 h-28 opacity-40 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full"
          style={{
            background: "#18FF19",
            transform: "translate(-50%, -50%)",
            boxShadow: "0 0 30px rgba(24, 255, 25, 0.8)",
            animation: "glow-pulse 2s ease-in-out infinite",
          }}
        />
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full"
            style={{
              background: "#18FF19",
              transform: "translate(-50%, -50%)",
              animation: `orbit ${3 + i * 0.4}s linear infinite`,
              animationDelay: `${i * 0.3}s`,
              boxShadow: "0 0 8px rgba(24, 255, 25, 0.8)",
            }}
          />
        ))}
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h2
            className={cn(
              "font-EuclidCircularA font-medium text-4xl md:text-5xl tracking-tight mb-6",
              "transition-all duration-700",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
            style={{ transitionDelay: "0.1s" }}
          >
            {t("title")}
          </h2>
          <p
            className={cn(
              "text-xl text-zinc-300 mb-8",
              "transition-all duration-700",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
            style={{ transitionDelay: "0.2s" }}
          >
            {t("description")}
          </p>
          <div
            className={cn(
              "flex flex-col sm:flex-row items-center justify-center gap-4 mb-16",
              "transition-all duration-700",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
            style={{ transitionDelay: "0.3s" }}
          >
            <Button
              size="lg"
              className="rounded-full has-[>svg]:px-8 px-8 h-12 bg-[#18FF19] hover:bg-[#14E614] text-zinc-900 hover:scale-105 active:scale-95 transition-transform duration-200 group"
              asChild
            >
              <Link href="/newstudy" prefetch={true}>
                {t("ctaButton")}
                <ChevronRightIcon className="h-3 w-3 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={benefit.key}
                  className={cn(
                    "p-6 rounded-xl bg-zinc-800/50 backdrop-blur-sm border",
                    "hover-lift relative overflow-hidden",
                    "transition-all duration-500",
                    isVisible
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-8"
                  )}
                  style={{
                    transitionDelay: `${0.4 + index * 0.1}s`,
                    borderColor: benefit.borderColor,
                    borderWidth: "1px",
                    borderTop: `1.5px solid ${benefit.borderColor}`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-10 h-10 rounded-full bg-zinc-700/50 border flex items-center justify-center flex-shrink-0 mt-1 hover-scale icon-bounce-hover transition-all duration-300"
                      style={{ 
                        borderColor: benefit.borderColor,
                        borderWidth: "1.5px",
                      }}
                    >
                      <Icon className="w-5 h-5" style={{ color: benefit.borderColor }} />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{t(`${benefit.key}.title`)}</h3>
                      <p className="text-sm text-zinc-400">{t(`${benefit.key}.description`)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}


