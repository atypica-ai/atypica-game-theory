"use client";
import { fetchPublicFeaturedStudies } from "@/app/admin/featured-studies/actions";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import HippyGhostAvatar from "./HippyGhostAvatar";

type FeaturedStudy = Awaited<ReturnType<typeof fetchPublicFeaturedStudies>>["data"][number];

export function FeaturedStudies() {
  const t = useTranslations("HomePage.FeaturedStudies");
  const [studies, setStudies] = useState<FeaturedStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStudies = async () => {
      setLoading(true);
      try {
        const result = await fetchPublicFeaturedStudies();
        setStudies(result.data);
      } catch (error) {
        setError((error as Error).message);
      }
      setLoading(false);
    };
    loadStudies();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-medium text-center">{t("title")}</h2>
        <p className="text-muted-foreground text-center">{t("description")}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-28" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">Error loading featured studies: {error}</div>;
  }

  if (studies.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-medium text-center">{t("title")}</h2>
        <p className="text-muted-foreground text-center">{t("noFeatured")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-medium text-center">{t("title")}</h2>
      <p className="text-muted-foreground text-center">{t("description")}</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {studies.map((study) => (
          <Link
            key={study.id}
            href={`/study/${study.studyUserChat.token}/share?replay=1`}
            className="flex"
            target="_blank"
          >
            <Card className="cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-start gap-2 overflow-hidden">
                  <HippyGhostAvatar seed={study.id} className="size-6" />
                  <div className="text-xs text-muted-foreground truncate">{study.analyst.role}</div>
                </div>
                <CardTitle className="line-clamp-1 leading-5">{study.analyst.topic}</CardTitle>
              </CardHeader>
              <CardContent className="mt-auto">
                <p className="line-clamp-3 text-xs text-muted-foreground">
                  {study.analyst.studySummary}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
