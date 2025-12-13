"use client";
import { fetchPublicFeaturedStudies } from "@/app/(public)/featured-studies/actions";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExtractServerActionData } from "@/lib/serverAction";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

type FeaturedReport = ExtractServerActionData<typeof fetchPublicFeaturedStudies>[number];

export function FeaturedStudies() {
  const locale = useLocale();
  const t = useTranslations("HomePage.FeaturedStudies");
  const [reports, setReports] = useState<FeaturedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      const result = await fetchPublicFeaturedStudies({
        locale,
        pageSize: 6,
        random: true,
      });
      if (result.success) {
        setReports(result.data);
      } else {
        setError(result.message);
      }
      setLoading(false);
    };
    loadReports();
  }, [locale]);

  if (loading) {
    return (
      <div className="space-y-4 max-w-6xl mx-auto">
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
    return <div className="text-red-500">Error loading featured reports: {error}</div>;
  }

  if (reports.length === 0) {
    return (
      <div className="space-y-4 max-w-6xl mx-auto">
        <h2 className="text-2xl font-medium text-center">{t("title")}</h2>
        <p className="text-muted-foreground text-center">{t("noFeatured")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <h2 className="text-3xl font-medium text-center">{t("title")}</h2>
      <p className="text-muted-foreground text-center">{t("description")}</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <Link key={report.id} href={report.url} className="flex" target="_blank">
            <Card className="cursor-pointer w-full">
              <CardHeader>
                <div className="flex items-center justify-start gap-2 overflow-hidden">
                  <HippyGhostAvatar seed={report.id} className="size-6" />
                  <div className="text-xs text-muted-foreground truncate">{report.category}</div>
                </div>
                <CardTitle className="line-clamp-1 leading-5">{report.title}</CardTitle>
              </CardHeader>
              <CardContent className="mt-auto">
                <p className="line-clamp-3 text-xs text-muted-foreground">{report.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <div className="mt-8 flex justify-center">
        <Button variant="outline" asChild>
          <Link href="/featured-studies">{t("viewMore")}</Link>
        </Button>
      </div>
    </div>
  );
}
