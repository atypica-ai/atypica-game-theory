"use client";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle2Icon } from "lucide-react";

export function FeatureSection() {
  const t = useTranslations("CreatorPage.FeatureSection");
  const [activeTab, setActiveTab] = useState<"research" | "persona" | "podcast">("research");
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  
  const getBorderColor = (feature: typeof features[0]) => {
    return feature.accentColor === "text-[#18FF19]" ? "#18FF19" : feature.accentColor === "text-blue-500" ? "#3b82f6" : "#a855f7";
  };

  const features = [
    {
      id: "research",
      key: "aiResearch",
      color: "bg-[#18FF19]",
      accentColor: "text-[#18FF19]",
    },
    {
      id: "persona",
      key: "aiPersona",
      color: "bg-blue-500",
      accentColor: "text-blue-500",
    },
    {
      id: "podcast",
      key: "aiPodcast",
      color: "bg-[#a855f7]",
      accentColor: "text-[#a855f7]",
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden">
      {/* 粒子轨道动效 */}
      <div className="absolute top-1/4 right-8 w-24 h-24 opacity-30 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full"
          style={{
            background: "#18FF19",
            transform: "translate(-50%, -50%)",
            boxShadow: "0 0 20px rgba(24, 255, 25, 0.6)",
            animation: "glow-pulse 2s ease-in-out infinite",
          }}
        />
        {[0, 1].map((i) => (
          <div
            key={i}
            className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full"
            style={{
              background: "#18FF19",
              transform: "translate(-50%, -50%)",
              animation: `orbit ${3 + i * 0.5}s linear infinite`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="font-EuclidCircularA font-medium text-4xl md:text-5xl tracking-tight mb-6">
            {t("title")}
          </h2>
          <p className="max-w-3xl mx-auto text-lg text-zinc-600 dark:text-zinc-400">
            {t("description")}
          </p>
        </div>

        {/* Tab Navigation - 游戏化设计 */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {features.map((feature) => {
            const borderColor = getBorderColor(feature);
            const isActive = activeTab === feature.id;
            const isHovered = hoveredTab === feature.id;
            
            return (
              <button
                key={feature.id}
                onClick={() => setActiveTab(feature.id as typeof activeTab)}
                onMouseEnter={() => setHoveredTab(feature.id)}
                onMouseLeave={() => setHoveredTab(null)}
                className={cn(
                  "px-6 py-3 rounded-lg font-medium transition-all duration-300",
                  "hover:scale-105 active:scale-95 relative",
                  "border",
                  isActive
                    ? "bg-zinc-900 dark:bg-zinc-900 shadow-lg scale-105"
                    : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                )}
                style={{
                  borderColor: borderColor,
                  borderWidth: "1px",
                  color: isActive || isHovered ? borderColor : undefined,
                  boxShadow: isActive
                    ? feature.accentColor === "text-[#18FF19]"
                      ? "0 0 20px rgba(24, 255, 25, 0.4)"
                      : feature.accentColor === "text-blue-500"
                        ? "0 0 20px rgba(59, 130, 246, 0.4)"
                        : "0 0 20px rgba(168, 85, 247, 0.4)"
                    : undefined,
                }}
              >
                {t(`${feature.key}.title`)}
              </button>
            );
          })}
        </div>

        {/* Feature Content */}
        {features.map((feature) => {
          if (activeTab !== feature.id) return null;

          return (
            <div
              key={feature.id}
              className="max-w-6xl mx-auto animate-scale-in"
            >
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl p-8 md:p-12 hover-lift border-2 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 transition-all duration-300">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                  {/* Left: Text Content */}
                  <div className="animate-slide-in-left">
                    <div
                      className={cn(
                        "w-16 h-16 rounded-xl mb-6 shadow-lg overflow-hidden",
                        "hover-scale animate-float flex items-center justify-center",
                        feature.color
                      )}
                    >
                      <img
                        src={
                          feature.id === "research"
                            ? "/_public/creator-images/ai research icon.png"
                            : feature.id === "persona"
                              ? "/_public/creator-images/ai persona icon.png"
                              : "/_public/creator-images/ai podcast icon.png"
                        }
                        alt={`${t(`${feature.key}.title`)} icon`}
                        className="object-contain"
                        style={{
                          width: "80px",
                          height: "80px",
                          filter: feature.id === "research" 
                            ? "brightness(0) saturate(100%)" // 黑色，适合绿色背景
                            : feature.id === "persona"
                              ? "brightness(0) saturate(100%)" // 黑色，适合蓝色背景
                              : "brightness(0) invert(1)", // 白色，适合紫色背景
                          opacity: feature.id === "research" || feature.id === "persona" 
                            ? 0.25 // 深色但透明，让背景色透出
                            : 0.9, // 白色不透明
                        }}
                        onError={(e) => {
                          // 如果icon不存在，显示纯色背景
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                        }}
                      />
                    </div>
                    <h3 className="text-3xl font-bold mb-4">
                      {t(`${feature.key}.title`)}
                    </h3>
                    <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8">
                      {t(`${feature.key}.value`)}
                    </p>

                    <div className="space-y-6">
                      <div>
                        <h4 className="font-semibold text-lg mb-3">
                          {t(`${feature.key}.howToUse.title`)}
                        </h4>
                        <ul className="space-y-2 text-zinc-600 dark:text-zinc-400">
                          {[1, 2, 3].map((i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 transition-all duration-300 hover:translate-x-2"
                            >
                              <span className={cn("mt-1", feature.accentColor)}>•</span>
                              <span>{t(`${feature.key}.howToUse.step${i}`)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-lg mb-3">
                          {t(`${feature.key}.example.title`)}
                        </h4>
                        <Card className="p-6 bg-white dark:bg-zinc-900/50 hover-scale transition-transform duration-300">
                          <p className="text-zinc-700 dark:text-zinc-300 italic">
                            "{t(`${feature.key}.example.text`)}"
                          </p>
                        </Card>
                      </div>
                    </div>
                  </div>

                  {/* Right: Image */}
                  <div className="relative animate-slide-in-right">
                    <div
                      className={cn(
                        "aspect-square rounded-2xl shadow-2xl overflow-hidden",
                        "bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center",
                        "hover-scale animate-float border border-zinc-300 dark:border-zinc-600"
                      )}
                      style={{ animationDelay: "0.5s" }}
                    >
                      {/* 图片路径：public/_public/creator-images/ */}
                      <img
                        src={
                          feature.id === "research"
                            ? "/_public/creator-images/ai research.jpeg"
                            : feature.id === "persona"
                              ? "/_public/creator-images/ai persona.png"
                              : "/_public/creator-images/ai podcast.png"
                        }
                        alt={t(`${feature.key}.title`)}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // 如果图片不存在，显示占位符
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          const placeholder = target.nextElementSibling as HTMLElement;
                          if (placeholder) placeholder.style.display = "flex";
                        }}
                      />
                      <div className="text-center p-8 hidden items-center justify-center flex-col">
                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          {t("imagePlaceholder")}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          图片路径: /_public/creator-images/
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}


