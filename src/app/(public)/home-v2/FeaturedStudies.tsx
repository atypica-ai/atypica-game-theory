"use client";
import { fetchPublicFeaturedStudies } from "@/app/admin/studies/actions";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExtractServerActionData } from "@/lib/serverAction";
import { proxiedImageLoader } from "@/lib/utils";
import { ExternalLinkIcon, FileTextIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type FeaturedStudy = ExtractServerActionData<typeof fetchPublicFeaturedStudies>[number];

export function FeaturedStudies() {
  const locale = useLocale();
  const t = useTranslations("HomePage.FeaturedStudies");
  const router = useRouter();
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
          <h2 className="text-2xl font-bold tracking-tight leading-tight">{t("title")}</h2>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <div className="max-w-6xl mx-auto grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="bg-background border">
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
        <h2 className="text-2xl font-bold tracking-tight leading-tight">{t("title")}</h2>
        <p className="text-muted-foreground">{t("noFeatured")}</p>
      </div>
    );
  }

  return (
    <div className="py-24 px-6 space-y-8">
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-bold tracking-tight leading-tight">{t("title")}</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">{t("description")}</p>
      </div>

      <div className="max-w-6xl mx-auto grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {studies.map((study) => (
          <Card key={study.id} className="group relative overflow-hidden pb-0">
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-3 overflow-hidden">
                <HippyGhostAvatar seed={study.id} className="shrink-0 size-8" />
                <div className="text-sm truncate">{study.analyst.role}</div>
              </div>
              <CardTitle className="text-base line-clamp-2 tracking-tight leading-tight">
                {study.analyst.topic}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                {study.analyst.studySummary}
              </p>
            </CardContent>
            {study.analyst.latestReport?.coverUrl ? (
              <div className="relative aspect-video rounded-t-xl overflow-hidden mt-4 mx-12 border">
                <Image
                  loader={proxiedImageLoader} // mainland 加载 us s3 的资源需要 proxy
                  src={study.analyst.latestReport?.coverUrl}
                  alt={`Cover for ${study.analyst.topic}`}
                  fill
                  sizes="100%"
                  className="object-cover"
                />
              </div>
            ) : null}
            <div
              className="absolute inset-0 bg-background/30 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-xl cursor-pointer"
              onClick={() => router.push(`/study/${study.studyUserChat.token}/share?replay=1`)}
            >
              <Button
                variant="secondary"
                size="sm"
                className="bg-transparent hover:bg-transparent rounded-full"
              >
                <FileTextIcon className="h-3 w-3" />
                <span>{t("viewStudy")}</span>
                <ExternalLinkIcon className="h-3 w-3" />
              </Button>
            </div>
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
