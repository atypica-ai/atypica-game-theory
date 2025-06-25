"use client";
import { fetchPublicFeaturedStudies } from "@/app/admin/featured-studies/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn, proxiedImageLoader } from "@/lib/utils";
import { PlayIcon } from "lucide-react";
import { useLocale } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type FeaturedStudy = ExtractServerActionData<typeof fetchPublicFeaturedStudies>[number];

export function UseCases() {
  const locale = useLocale();
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

  const renderSkeletons = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="rounded-2xl bg-white dark:bg-zinc-900/50 overflow-hidden shadow-lg">
          <Skeleton className="w-full aspect-[4/3]" />
          <div className="p-6">
            <Skeleton className="h-5 w-1/3 mb-4 rounded-md" />
            <Skeleton className="h-7 w-full rounded-md" />
            <Skeleton className="h-7 w-3/4 mt-2 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <section className="bg-white dark:bg-zinc-950 py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 md:mb-16">
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 tracking-widest uppercase">
            Our Work
          </p>
          <h2 className="font-EuclidCircularA font-medium text-4xl md:text-5xl tracking-tight mt-4">
            AI Persona Research Studies
          </h2>
          <p className="max-w-3xl mx-auto mt-5 text-lg text-zinc-600 dark:text-zinc-400">
            Explore real case studies showcasing how Real Person Agents and expert interviews
            provide deep consumer insights for better business decisions.
          </p>
        </div>

        {loading ? (
          renderSkeletons()
        ) : error ? (
          <div className="text-center text-red-500 bg-red-50 dark:bg-red-900/20 p-8 rounded-lg">
            <p className="font-semibold text-lg">Something went wrong.</p>
            <p className="text-sm mt-2">{error}</p>
          </div>
        ) : studies.length === 0 ? (
          <div className="text-center text-zinc-500 dark:text-zinc-400 py-16 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl">
            <h3 className="text-xl font-semibold text-zinc-800 dark:text-white">
              No Featured Studies Available
            </h3>
            <p className="mt-2">Please check back later to see our work in action.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {studies.map((study) => (
              <Card
                key={study.id}
                className={cn(
                  "group relative overflow-hidden rounded-2xl shadow-none",
                  "transition-all duration-300 hover:-translate-y-1",
                  "flex flex-col py-0",
                )}
              >
                <Link
                  href={`/study/${study.studyUserChat.token}/share?replay=1`}
                  className="absolute inset-0 z-10"
                >
                  <span className="sr-only">View Case Study: {study.analyst.topic}</span>
                </Link>
                <div className="relative aspect-[16/9] overflow-hidden">
                  {study.analyst.latestReport?.coverUrl ? (
                    <Image
                      loader={proxiedImageLoader}
                      src={study.analyst.latestReport.coverUrl}
                      alt={`Cover for ${study.analyst.topic}`}
                      fill
                      // sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      sizes="100%"
                      className="object-contain transition-transform duration-200 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                          <PlayIcon
                            className="w-4 h-4 text-zinc-500 dark:text-zinc-400 ml-0.5"
                            fill="currentColor"
                          />
                        </div>
                        <div className="absolute inset-0 rounded-full bg-zinc-300/20 dark:bg-zinc-600/20 animate-pulse"></div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-6 flex-grow flex flex-col">
                  <span className="text-xs capitalize bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-medium py-1 px-2.5 rounded-full self-start mb-3">
                    {study.analyst.kind}
                  </span>
                  <h3 className="text-lg font-bold line-clamp-2 leading-snug flex-grow">
                    {study.analyst.topic}
                  </h3>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="text-center mt-16">
          <Button
            variant="outline"
            size="lg"
            asChild
            className="rounded-lg h-12 px-8 text-base border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            <Link href="/featured-studies">View All Studies</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
