"use client";

import { fetchPublicFeaturedStudies } from "@/app/(public)/featured-studies/actions";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn } from "@/lib/utils";
import { PlayIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useState } from "react";

type FeaturedReport = ExtractServerActionData<typeof fetchPublicFeaturedStudies>[number];

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
  tag: string;
}

export function CaseStudiesSection({ tag }: CaseStudiesSectionProps) {
  const locale = useLocale();
  const t = useTranslations("Solutions.CaseStudiesSection");
  const [studies, setStudies] = useState<FeaturedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStudies = async () => {
      setLoading(true);
      const result = await fetchPublicFeaturedStudies({
        locale,
        pageSize: 6,
        random: true,
      });
      if (result.success) {
        setStudies(result.data);
      } else {
        setError(result.message);
      }
      setLoading(false);
    };
    loadStudies();
  }, [locale, tag]);

  const renderSkeletons = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-6 md:gap-8">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="flex flex-col h-full rounded-2xl shadow-none overflow-hidden">
          <div className="px-4 sm:px-5 pt-4 pb-4 sm:pb-5 flex flex-col gap-2.5">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-full rounded-md" />
            <Skeleton className="h-5 w-3/4 rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
          </div>
          <div className="relative aspect-video mx-4 sm:mx-5 mb-4 sm:mb-5 rounded-xl overflow-hidden">
            <Skeleton className="w-full h-full" />
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="container mx-auto px-6 sm:px-8 md:px-6 lg:px-4 max-w-screen-2xl">
        {/* Section title */}
        <div className="mb-12 text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
            {t("title")}
          </h2>
        </div>

        {loading ? (
          renderSkeletons()
        ) : error ? (
          <div className="text-center py-20 text-muted-foreground">
            <p>{t("errorMessage")}</p>
          </div>
        ) : studies.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p>{t("emptyMessage")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {studies.map((study) => (
              <Card
                key={study.id}
                className={cn(
                  "group relative overflow-hidden rounded-2xl shadow-none cursor-pointer py-0",
                  "flex flex-col justify-between",
                )}
              >
                {/* Card content */}
                <div className="px-4 sm:px-5 pt-4 flex flex-col gap-2.5">
                  <span
                    className={cn(
                      "text-xs uppercase tracking-wide font-medium py-1 px-2 rounded-full self-start",
                      getTagColorClasses(study.category),
                    )}
                  >
                    {study.category}
                  </span>
                  <h3 className="text-base md:text-lg font-semibold leading-snug text-card-foreground line-clamp-2">
                    {study.title}
                  </h3>
                </div>

                <div className="relative aspect-video mx-4 sm:mx-5 mb-4 sm:mb-5 rounded-xl overflow-hidden border bg-muted">
                  {study.coverUrl ? (
                    <Image
                      src={study.coverUrl}
                      alt={study.title}
                      fill
                      sizes="600px"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                          <PlayIcon
                            className="w-4 h-4 text-muted-foreground ml-0.5"
                            fill="currentColor"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
