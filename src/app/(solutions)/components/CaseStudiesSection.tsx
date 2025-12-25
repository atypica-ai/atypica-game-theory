"use client";

import { fetchPublicFeaturedItems } from "@/app/(public)/featured-studies/actions";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn } from "@/lib/utils";
import { PlayIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type FeaturedItem = ExtractServerActionData<typeof fetchPublicFeaturedItems>[number];

interface CaseStudiesSectionProps {
  tag: string;
  title: string;
}

export function CaseStudiesSection({ tag, title }: CaseStudiesSectionProps) {
  const locale = useLocale();
  const t = useTranslations("Solutions.CaseStudiesSection");
  const [featuredItems, setFeaturedItems] = useState<FeaturedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFeaturedItems = async () => {
      setLoading(true);
      const result = await fetchPublicFeaturedItems({
        resourceType: "all",
        locale,
        tag,
        pageSize: 6,
        random: true,
      });
      if (result.success) {
        setFeaturedItems(result.data);
      } else {
        setError(result.message);
      }
      setLoading(false);
    };
    loadFeaturedItems();
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
      <div className="container mx-auto px-4 sm:px-8">
        {/* Section title */}
        <div className="mb-12 text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
            {title}
          </h2>
        </div>

        {loading ? (
          renderSkeletons()
        ) : error ? (
          <div className="text-center py-20 text-muted-foreground">
            <p>{t("errorMessage")}</p>
          </div>
        ) : featuredItems.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p>{t("emptyMessage")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredItems.map((study) => (
              <Card
                key={study.id}
                className={cn(
                  "relative overflow-hidden rounded-2xl shadow-none py-0",
                  "flex flex-col justify-between",
                )}
              >
                {/* Card content */}
                <div className="px-4 sm:px-5 pt-4 flex flex-col gap-2.5">
                  <h3 className="text-base md:text-lg font-semibold leading-snug text-card-foreground line-clamp-2">
                    <Link href={study.url} target="_blank">
                      {study.title}
                    </Link>
                  </h3>
                </div>
                <Link
                  href={study.url}
                  target="_blank"
                  className="group block relative aspect-video mx-4 sm:mx-5 mb-4 sm:mb-5 rounded-xl overflow-hidden border bg-muted"
                >
                  {study.coverUrl ? (
                    <Image
                      src={study.coverUrl}
                      alt={study.title}
                      fill
                      sizes="600px"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted relative">
                      <div className="w-12 h-12 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                        <PlayIcon
                          className="w-4 h-4 text-muted-foreground ml-0.5"
                          fill="currentColor"
                        />
                      </div>
                    </div>
                  )}
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
