"use client";
import { fetchPublicFeaturedStudies } from "@/app/admin/featured-studies/actions";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExtractServerActionData } from "@/lib/serverAction";
import { ExternalLinkIcon, FileTextIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

type FeaturedStudy = ExtractServerActionData<typeof fetchPublicFeaturedStudies>[number];

export function FeaturedStudies() {
  const locale = useLocale();
  const t = useTranslations("HomePage.FeaturedStudies");
  const [studies, setStudies] = useState<FeaturedStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStudies = async () => {
      setLoading(true);
      const result = await fetchPublicFeaturedStudies({
        locale,
        limit: 6,
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
  }, [locale]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold heading-sans">{t("title")}</h2>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card
              key={i}
              className="bg-background border border-border transition-colors hover:border-primary"
            >
              <CardHeader className="space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-5 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-8 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center space-y-4">
        <div className="text-red-500 text-sm">Error loading featured studies: {error}</div>
      </div>
    );
  }

  if (studies.length === 0) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold heading-sans">{t("title")}</h2>
        <p className="text-muted-foreground">{t("noFeatured")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-bold heading-sans">{t("title")}</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">{t("description")}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {studies.map((study) => (
          <Card
            key={study.id}
            className="bg-background border border-border transition-colors hover:border-primary group cursor-pointer"
          >
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="shrink-0 w-8 h-8 flex items-center justify-center bg-muted border border-border">
                  <HippyGhostAvatar seed={study.id} className="size-5" />
                </div>
                <div className="text-xs truncate">{study.analyst.role}</div>
              </div>
              <CardTitle className="text-base line-clamp-2 leading-6 heading-sans">
                {study.analyst.topic}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                {study.analyst.studySummary}
              </p>
            </CardContent>
            <CardFooter className="mt-auto">
              <Button
                variant="ghost"
                size="sm"
                className="w-full group-hover:bg-muted transition-colors"
                asChild
              >
                <Link
                  href={`/study/${study.studyUserChat.token}/share?replay=1`}
                  target="_blank"
                  className="flex items-center gap-2"
                >
                  <FileTextIcon className="h-3 w-3" />
                  <span>View Study</span>
                  <ExternalLinkIcon className="h-3 w-3" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <Button variant="outline" size="lg" className="px-8" asChild>
          <Link href="/featured-studies">{t("viewMore")}</Link>
        </Button>
      </div>
    </div>
  );
}
