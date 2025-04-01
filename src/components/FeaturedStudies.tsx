"use client";
import { fetchPublicFeaturedStudies } from "@/app/admin/featured-studies/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type FeaturedStudy = NonNullable<
  Awaited<ReturnType<typeof fetchPublicFeaturedStudies>>["data"]
>[number];

export function FeaturedStudies() {
  const t = useTranslations("HomePage.FeaturedStudies");
  const router = useRouter();
  const [studies, setStudies] = useState<FeaturedStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStudies = async () => {
      setLoading(true);
      try {
        const result = await fetchPublicFeaturedStudies();
        if (result.success && result.data) {
          setStudies(result.data);
        }
      } catch (error) {
        console.error("Failed to load featured studies:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStudies();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <p className="text-muted-foreground">{t("description")}</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <p className="text-muted-foreground">{t("noFeatured")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-center">{t("title")}</h2>
      <p className="text-muted-foreground text-center">{t("description")}</p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {studies.map((study) => (
          <Card key={study.id} className="overflow-hidden ">
            <CardHeader>
              <CardTitle className="line-clamp-2 leading-5">{study.analyst.topic}</CardTitle>
              <CardDescription>{study.analyst.role}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <p className="line-clamp-3 text-sm text-muted-foreground">
                {study.analyst.studySummary}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {study.analyst.interviews.slice(0, 3).map((interview) => (
                  <span
                    key={interview.id}
                    className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
                  >
                    {interview.persona.name}
                  </span>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => router.push(`/study/${study.studyUserChat.token}/share?replay=1`)}
                variant="outline"
              >
                {t("viewStudy")}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
