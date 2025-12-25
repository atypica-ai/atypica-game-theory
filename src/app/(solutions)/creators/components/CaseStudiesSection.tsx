"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useTranslations } from "next-intl";
import Link from "next/link";

type MockStudyKey = string;

type MockStudy = {
  id: MockStudyKey;
  tag: string;
  title: string;
  description: string;
  imagePrompt: string;
};

const IMAGE_BASE_URL = "/api/imagegen/dev";

// Tag color mapping - different shades for different tools using theme-aware colors
const getTagColorClasses = (tag: string): string => {
  const tagLower = tag.toLowerCase();
  // Use muted background with varying opacity for visual distinction
  if (tagLower.includes("research")) {
    return "bg-muted/50 text-muted-foreground";
  } else if (tagLower.includes("podcast")) {
    return "bg-muted/70 text-foreground";
  } else if (tagLower.includes("persona")) {
    return "bg-muted text-foreground";
  } else if (tagLower.includes("interview")) {
    return "bg-muted-foreground/20 text-foreground";
  } else if (tagLower.includes("sage")) {
    return "bg-muted-foreground/30 text-foreground";
  }
  // Default
  return "bg-muted/50 text-muted-foreground";
};

interface CaseStudiesSectionProps {
  namespace?: string;
}

export function CaseStudiesSection({ namespace = "CreatorPage.CaseStudiesSection" }: CaseStudiesSectionProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = useTranslations(namespace as any) as any;

  // Check if studies exist first (preferred mode)
  let studies: MockStudy[] = [];
  let placeholder = "";
  let hasPlaceholder = false;

  try {
    const studiesObj = t.raw("studies") as Record<string, Record<string, string>> | undefined;
    if (studiesObj && typeof studiesObj === "object" && Object.keys(studiesObj).length > 0) {
      // Studies exist, use them
      studies = Object.entries(studiesObj).map(([id, studyData]) => {
        const study = studyData as Record<string, string>;
        return {
          id: id as MockStudyKey,
          tag: study.tag || "",
          title: study.title || "",
          description: study.description || "",
          imagePrompt: study.imagePrompt || `professional dashboard for ${study.tag?.toLowerCase() || "research"} analysis, ${study.title?.toLowerCase() || ""}, modern analytics interface, clean design`,
        };
      });
    } else {
      // No studies, check for placeholder
      try {
        const placeholderValue = t.raw("placeholder");
        if (typeof placeholderValue === "string" && placeholderValue !== "") {
          placeholder = placeholderValue;
          hasPlaceholder = true;
        }
      } catch {
        // placeholder key doesn't exist either, will show "noCases"
        hasPlaceholder = false;
      }
    }
  } catch {
    // studies key doesn't exist, check for placeholder
    try {
      const placeholderValue = t.raw("placeholder");
      if (typeof placeholderValue === "string" && placeholderValue !== "") {
        placeholder = placeholderValue;
        hasPlaceholder = true;
      }
    } catch {
      // Neither studies nor placeholder exist, will show "noCases"
      hasPlaceholder = false;
    }
  }

  return (
    <section className="py-20 md:py-32 bg-background bg-gradient-to-b from-background via-background to-background relative overflow-hidden">
      <div className="container mx-auto px-6 sm:px-8 md:px-6 lg:px-4 max-w-screen-2xl">
        {/* Section title */}
        <div className="mb-12 text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
            {t("title")}
          </h2>
        </div>

        {hasPlaceholder ? (
          <div className="text-center py-20 text-muted-foreground">
            <p>{placeholder}</p>
          </div>
        ) : studies.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p>{t("noCases")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-6 md:gap-8">
          {studies.map((study) => (
            <Card
              key={study.id}
              className={cn(
                "group relative overflow-hidden rounded-2xl shadow-none",
                "transition-all duration-300 hover:scale-[1.02] cursor-pointer",
                "flex flex-col h-full",
              )}
            >
              {/* Card content */}
              <div className="relative z-10 flex flex-col h-full transition-all duration-300">
                        <div className="px-4 sm:px-5 pt-4 pb-4 sm:pb-5 flex flex-col gap-2.5">
                  <span className={cn("text-xs uppercase tracking-wide font-medium py-0.5 px-2 rounded-full self-start", getTagColorClasses(study.tag))}>
                    {study.tag}
                  </span>
                  <h3 className="text-base md:text-lg font-semibold leading-snug text-card-foreground line-clamp-2">
                    {study.title}
                  </h3>
                  <p className="text-xs md:text-sm text-muted-foreground line-clamp-3">
                    {study.description}
                  </p>
                </div>

                        <div className="relative aspect-video mx-4 sm:mx-5 mb-4 sm:mb-5 rounded-xl overflow-hidden border bg-muted">
                  {study.imagePrompt ? (
                    <Image
                      loader={({ src }) => src}
                      src={`${IMAGE_BASE_URL}/${encodeURIComponent(study.imagePrompt)}?ratio=landscape`}
                      alt={study.title}
                      fill
                      sizes="600px"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      unoptimized
                      onError={(e) => {
                        console.error("Image load error:", study.id, e);
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <span className="text-xs text-muted-foreground">Image placeholder</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Clickable link overlay to featured studies */}
              <Link
                href="/featured-studies"
                prefetch={true}
                className="absolute inset-0 z-30"
                aria-label={`View study: ${study.title}`}
              />
            </Card>
          ))}
        </div>
        )}
      </div>
    </section>
  );
}
