"use client";

import { cn } from "@/lib/utils";
import { BarChart3, MessageSquare, Mic, Search, Sparkles, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

const iconMap = {
  aiResearch: Search,
  aiPodcast: Mic,
  insightAnalysis: BarChart3,
  aiSage: Sparkles,
  aiInterview: MessageSquare,
  aiPersona: Users,
};

interface UseCasesSectionProps {
  namespace: string;
}

export function UseCasesSection({ namespace }: UseCasesSectionProps) {
  const t = useTranslations(namespace as any) as any;

  // Helper function to properly encode URL with topic parameter
  const buildHref = (baseHref: string, question: string): string => {
    // Check if href is for /personas (no topic parameter needed)
    if (baseHref.startsWith("/personas")) {
      return baseHref;
    }

    // For /newstudy, ensure topic parameter is properly encoded
    if (baseHref.startsWith("/newstudy")) {
      const [path, queryString] = baseHref.split("?");
      const params = new URLSearchParams();

      // Parse existing query parameters using URLSearchParams for proper handling
      if (queryString) {
        // Use URLSearchParams to properly parse (handles encoding automatically)
        try {
          const tempUrl = new URL(`http://dummy.com?${queryString}`);
          for (const [key, value] of tempUrl.searchParams.entries()) {
            if (key !== "topic") {
              // Preserve other parameters (like fast-insight)
              params.set(key, value);
            }
          }
        } catch {
          // Fallback: manual parsing if URL parsing fails
          const pairs = queryString.split("&");
          for (const pair of pairs) {
            const equalIndex = pair.indexOf("=");
            if (equalIndex > 0) {
              const key = pair.substring(0, equalIndex);
              const value = pair.substring(equalIndex + 1);
              if (key !== "topic") {
                params.set(key, decodeURIComponent(value));
              }
            }
          }
        }
      }

      // Set topic parameter with properly encoded question
      params.set("topic", question);

      return `${path}?${params.toString()}`;
    }

    return baseHref;
  };

  const scenarios = [
    {
      id: "scenario1",
      question: t("scenario1.question"),
      primaryTool: {
        id: t("scenario1.primaryTool.id") as keyof typeof iconMap,
        label: t("scenario1.primaryTool.label"),
        href: buildHref(t("scenario1.primaryTool.href"), t("scenario1.question")),
      },
    },
    {
      id: "scenario2",
      question: t("scenario2.question"),
      primaryTool: {
        id: t("scenario2.primaryTool.id") as keyof typeof iconMap,
        label: t("scenario2.primaryTool.label"),
        href: buildHref(t("scenario2.primaryTool.href"), t("scenario2.question")),
      },
    },
    {
      id: "scenario3",
      question: t("scenario3.question"),
      primaryTool: {
        id: t("scenario3.primaryTool.id") as keyof typeof iconMap,
        label: t("scenario3.primaryTool.label"),
        href: buildHref(t("scenario3.primaryTool.href"), t("scenario3.question")),
      },
    },
  ] as const;

  return (
    <section className="py-20 md:py-32 bg-background relative overflow-hidden">
      <div className="container mx-auto px-6 sm:px-8 md:px-6 lg:px-4 max-w-screen-2xl relative z-10">
        {/* Section title */}
        <div className="mb-12 text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
            {(() => {
              const title = t("title");
              // Emphasize KEYWORDS with extra bold (no green) - works for both EN and ZH
              if (
                title.includes("研究、优化、发布") ||
                title === "Research it. Optimize it. Ship it."
              ) {
                // Creators
                if (title.includes("研究、优化、发布")) {
                  return (
                    <>
                      <span className="font-black text-[1.15em]">研究</span>、
                      <span className="font-black text-[1.15em]">优化</span>、
                      <span className="font-black text-[1.15em]">发布</span>
                    </>
                  );
                }
                return (
                  <>
                    <span className="font-black text-[1.15em]">Research</span> it.{" "}
                    <span className="font-black text-[1.15em]">Optimize</span> it.{" "}
                    <span className="font-black text-[1.15em]">Ship</span> it.
                  </>
                );
              } else if (title.includes("参与更深") || title === "Engage deeper, earn more") {
                // Influencers
                if (title.includes("参与更深")) {
                  return (
                    <>
                      <span className="font-black text-[1.15em]">参与</span>更深，
                      <span className="font-black text-[1.15em]">赚取</span>更多
                    </>
                  );
                }
                return (
                  <>
                    <span className="font-black text-[1.15em]">Engage</span> deeper,{" "}
                    <span className="font-black text-[1.15em]">earn</span> more
                  </>
                );
              } else if (title.includes("测试它") || title === "Test it. Validate it. Win it.") {
                // Marketers
                if (title.includes("测试它")) {
                  return (
                    <>
                      <span className="font-black text-[1.15em]">测试</span>它。
                      <span className="font-black text-[1.15em]">验证</span>它。
                      <span className="font-black text-[1.15em]">赢得</span>它。
                    </>
                  );
                }
                return (
                  <>
                    <span className="font-black text-[1.15em]">Test</span> it.{" "}
                    <span className="font-black text-[1.15em]">Validate</span> it.{" "}
                    <span className="font-black text-[1.15em]">Win</span> it.
                  </>
                );
              } else if (
                title.includes("倾听用户") ||
                title === "Listen to users. Build what matters."
              ) {
                // Product Managers
                if (title.includes("倾听用户")) {
                  return (
                    <>
                      倾听<span className="font-black text-[1.15em]">用户</span>。构建
                      <span className="font-black text-[1.15em]">重要</span>内容。
                    </>
                  );
                }
                return (
                  <>
                    Listen to <span className="font-black text-[1.15em]">users</span>. Build what{" "}
                    <span className="font-black text-[1.15em]">matters</span>.
                  </>
                );
              } else if (
                title.includes("证明你的概念") ||
                title === "Prove your concept. Fund your future."
              ) {
                // Startup Owners
                if (title.includes("证明你的概念")) {
                  return (
                    <>
                      证明你的<span className="font-black text-[1.15em]">概念</span>。资助你的
                      <span className="font-black text-[1.15em]">未来</span>。
                    </>
                  );
                }
                return (
                  <>
                    Prove your <span className="font-black text-[1.15em]">concept</span>. Fund your{" "}
                    <span className="font-black text-[1.15em]">future</span>.
                  </>
                );
              } else if (
                title.includes("研究它。证明它") ||
                title === "Research it. Prove it. Present it."
              ) {
                // Consultants
                if (title.includes("研究它。证明它")) {
                  return (
                    <>
                      <span className="font-black text-[1.15em]">研究</span>它。
                      <span className="font-black text-[1.15em]">证明</span>它。
                      <span className="font-black text-[1.15em]">呈现</span>它。
                    </>
                  );
                }
                return (
                  <>
                    <span className="font-black text-[1.15em]">Research</span> it.{" "}
                    <span className="font-black text-[1.15em]">Prove</span> it.{" "}
                    <span className="font-black text-[1.15em]">Present</span> it.
                  </>
                );
              }
              return title;
            })()}
          </h2>
        </div>

        {/* Grid Layout - 3 columns on large screens */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-6 md:gap-8 lg:gap-12">
          {scenarios.map((scenario) => {
            const IconComponent = iconMap[scenario.primaryTool.id as keyof typeof iconMap];

            return (
              <div
                key={scenario.id}
                className={cn(
                  "group relative bg-card rounded-2xl overflow-hidden",
                  "border",
                  "transition-all duration-300 hover:scale-[1.02]",
                  "flex flex-col h-full",
                )}
              >
                {/* Card content */}
                <div className="relative z-10 flex flex-col h-full p-5 sm:p-6 transition-all duration-300">
                  {/* First Row: Question - Top aligned */}
                  <div>
                    <h3
                      className={cn(
                        "text-lg md:text-xl font-semibold leading-snug",
                        "text-card-foreground",
                      )}
                    >
                      {scenario.question}
                    </h3>
                  </div>

                  {/* Spacer - Flexible space in the middle with minimum height */}
                  <div className="flex-1 min-h-[30px] md:min-h-[40px]" />

                  {/* Second Row: Primary tool CTA - Bottom aligned */}
                  <div>
                    <Link
                      href={scenario.primaryTool.href}
                      prefetch={true}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full",
                        "bg-foreground text-background",
                        "text-xs sm:text-sm md:text-base font-semibold transition-transform duration-200",
                        "group-hover:scale-105 hover:opacity-90",
                      )}
                    >
                      {IconComponent && <IconComponent className="w-3.5 sm:w-4 h-3.5 sm:h-4" />}
                      <span>{scenario.primaryTool.label}</span>
                    </Link>
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
