"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Search, Mic, BarChart3, MessageSquare, Sparkles, Users } from "lucide-react";

const iconMap = {
  aiResearch: Search,
  aiPodcast: Mic,
  insightAnalysis: BarChart3,
  aiSage: Sparkles,
  aiInterview: MessageSquare,
  aiPersona: Users,
};

interface UseCasesSectionProps {
  namespace?: string;
}

export function UseCasesSection({ namespace = "CreatorPage.UseCasesSection" }: UseCasesSectionProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      <div className="container mx-auto px-4 sm:px-6 md:px-4 max-w-screen-2xl relative z-10">
        {/* Section title */}
        <div className="mb-12 text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
            {t("title")}
          </h2>
        </div>

        {/* Grid Layout - 3 columns on large screens */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
          {scenarios.map((scenario) => {
            const IconComponent = iconMap[scenario.primaryTool.id as keyof typeof iconMap];

            return (
              <div
                key={scenario.id}
                className={cn(
                  "group relative bg-card rounded-2xl overflow-hidden",
                  "border",
                  "transition-all duration-300 hover:-translate-y-1 hover-shadow-xl",
                  "flex flex-col h-full",
                )}
              >
                {/* Card content */}
                <div className="relative z-10 flex flex-col h-full p-6 transition-all duration-300">
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
                        "inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full",
                        "bg-foreground text-background",
                        "text-sm md:text-base font-semibold transition-transform duration-200",
                        "group-hover:scale-105 hover:opacity-90",
                      )}
                    >
                      {IconComponent && <IconComponent className="w-4 h-4" />}
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
