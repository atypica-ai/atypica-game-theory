"use client";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { createParamConfig, useListQueryParams } from "@/hooks/use-list-query-params";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn } from "@/lib/utils";
import { PlayIcon, Volume2Icon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetchFeaturedPodcasts } from "./actions";
import { HighlightPodcast } from "./HighlightPodcast";

type FeaturedPodcastItem = ExtractServerActionData<typeof fetchFeaturedPodcasts>[number];

export function FeaturedPodcastsClient({
  initialSearchParams,
}: {
  initialSearchParams: Record<string, string | number>;
}) {
  const locale = useLocale();
  const t = useTranslations("FeaturedPodcastsPage");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const {
    values: { page: currentPage },
    setParam,
  } = useListQueryParams<{
    page: number;
  }>({
    params: {
      page: createParamConfig.number(1),
    },
    initialValues: initialSearchParams,
  });

  // Use SWR for data fetching
  const { data, isLoading: loading } = useSWR(
    ["featured-podcasts", locale, currentPage],
    async () => {
      const result = await fetchFeaturedPodcasts({ locale, page: currentPage, pageSize: 10 });
      if (!result.success) {
        throw new Error("Failed to load featured podcasts");
      }
      return {
        featuredPodcasts: result.data,
        pagination: result.pagination,
      };
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  // Memoize derived data to prevent unnecessary recalculations
  const { featuredPodcasts, businessPodcasts, societyPodcasts, highlightPodcast } = useMemo(() => {
    const podcasts = data?.featuredPodcasts ?? [];

    // Get podcast kind from kindDetermination
    const getPodcastKind = (featuredPodcast: FeaturedPodcastItem) => {
      return featuredPodcast.kindDetermination?.kind;
    };

    const business = podcasts.filter((p) => getPodcastKind(p) === "opinionOriented");
    const society = podcasts.filter(
      (p) => getPodcastKind(p) === "deepDive" || getPodcastKind(p) === "debate",
    );
    const highlight =
      podcasts.length > 0 ? podcasts[Math.floor(Math.random() * podcasts.length)] : null;

    return {
      featuredPodcasts: podcasts,
      businessPodcasts: business,
      societyPodcasts: society,
      highlightPodcast: highlight,
    };
  }, [data]);

  const pagination = data?.pagination ?? null;

  // Get category filtered podcasts for More to Discover
  const categoryFilteredPodcasts =
    selectedCategory === "business"
      ? businessPodcasts
      : selectedCategory === "society"
        ? societyPodcasts
        : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Highlight Section - Featured Podcast */}
      {highlightPodcast && <HighlightPodcast podcast={highlightPodcast} />}

      {/* All Podcasts Section */}
      <section className="bg-zinc-50 dark:bg-zinc-800 px-4 py-20 md:py-28">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="font-EuclidCircularA font-medium text-4xl md:text-5xl tracking-tight text-foreground mb-4">
            {t("allPodcasts")}
          </h2>
          <p className="max-w-3xl mx-auto text-lg text-zinc-600 dark:text-zinc-400">
            {t("allPodcastsDescription")}
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Podcast List */}
          {loading ? (
            <div className="min-h-[50dvh] flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            </div>
          ) : featuredPodcasts.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {featuredPodcasts.map((featuredPodcast) => (
                <div
                  key={featuredPodcast.token}
                  className={cn(
                    "bg-card border border-border rounded-xl hover:shadow-md transition-shadow group relative",
                    "p-4 sm:p-6",
                  )}
                >
                  {/* Share Button - Top Right */}
                  {/*<Button
                    variant="outline"
                    size="sm"
                    className="absolute top-4 right-4 h-7 text-xs rounded-full shadow-none"
                  >
                    <ShareIcon className="size-3" />
                    <span className="max-sm:hidden">Share</span>
                  </Button>*/}

                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "size-8 sm:size-16 rounded-sm sm:rounded-xl",
                        "bg-linear-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-xs shrink-0",
                      )}
                    >
                      <Volume2Icon className="size-4 sm:size-6" />
                    </div>

                    <div className="flex-1 min-w-0 sm:pr-8">
                      <h3 className="font-semibold text-base sm:text-lg text-foreground mb-2 line-clamp-2 sm:line-clamp-1 group-hover:text-primary transition-colors">
                        {featuredPodcast.title}
                      </h3>
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-3 sm:line-clamp-2">
                        {featuredPodcast.description}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <Button variant="default" asChild className="text-xs h-7 shadow-none">
                          <Link href={featuredPodcast.url} target="_blank">
                            <PlayIcon className="size-4" />
                            {t("playPodcast")}
                          </Link>
                        </Button>

                        {/*<CalendarDaysIcon className="w-3.5 h-3.5" />
                        <span>{formatDate(featuredPodcast.generatedAt, locale)}</span>*/}
                        {/*<MessageSquareIcon className="w-3.5 h-3.5" />
                        <span>{PLACEHOLDER_REPLIES} replies</span>
                        <span>{PLACEHOLDER_DURATION}</span>*/}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Volume2Icon className="w-16 h-16 text-muted-foreground bg-muted rounded-full p-4 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">{t("noPodcastsYet")}</h3>
              <p className="text-muted-foreground mb-6">{t("noPodcastsYetDescription")}</p>
              <Button asChild>
                <Link href="/newstudy">{t("startNewStudy")}</Link>
              </Button>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(page) => setParam("page", page)}
              />
              <div className="text-sm text-muted-foreground">
                Total: {pagination.totalCount.toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* More to Discover Section */}
      <section className="container mx-auto px-4 py-20 md:py-28">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="font-EuclidCircularA font-medium text-4xl md:text-5xl tracking-tight text-foreground mb-4">
            {t("moreToDiscover")}
          </h2>
          <p className="max-w-3xl mx-auto text-lg text-zinc-600 dark:text-zinc-400">
            {t("moreToDiscoverDescription")}
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Business Category */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <button
              onClick={() =>
                setSelectedCategory(selectedCategory === "business" ? null : "business")
              }
              className="w-full p-8 hover:bg-accent/50 transition-colors group text-left"
            >
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-6 flex-1">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                    <Volume2Icon className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-2">{t("business")}</h3>
                    <p className="text-muted-foreground">{t("businessDescription")}</p>
                  </div>
                </div>
                <div className="text-muted-foreground">
                  {selectedCategory === "business" ? "−" : "+"}
                </div>
              </div>
            </button>

            {selectedCategory === "business" && (
              <div className="border-t border-border p-6 bg-muted/20">
                {categoryFilteredPodcasts.length > 0 ? (
                  <div className="space-y-3">
                    {categoryFilteredPodcasts.map((featuredPodcast) => (
                      <div
                        key={featuredPodcast.token}
                        className="bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-shadow flex items-center gap-3"
                      >
                        <div className="w-12 h-12 bg-linear-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white shrink-0">
                          <Volume2Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground line-clamp-1">
                            {featuredPodcast.title}
                          </h4>
                          {/*<p className="text-xs text-muted-foreground">{PLACEHOLDER_DURATION}</p>*/}
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={featuredPodcast.url} target="_blank">
                            <PlayIcon className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    {t("noBusinessPodcasts")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Society & Culture Category */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <button
              onClick={() => setSelectedCategory(selectedCategory === "society" ? null : "society")}
              className="w-full p-8 hover:bg-accent/50 transition-colors group text-left"
            >
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-6 flex-1">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                    <Volume2Icon className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {t("societyCulture")}
                    </h3>
                    <p className="text-muted-foreground">{t("societyCultureDescription")}</p>
                  </div>
                </div>
                <div className="text-muted-foreground">
                  {selectedCategory === "society" ? "−" : "+"}
                </div>
              </div>
            </button>

            {selectedCategory === "society" && (
              <div className="border-t border-border p-6 bg-muted/20">
                {categoryFilteredPodcasts.length > 0 ? (
                  <div className="space-y-3">
                    {categoryFilteredPodcasts.map((featuredPodcast) => (
                      <div
                        key={featuredPodcast.token}
                        className="bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-shadow flex items-center gap-3"
                      >
                        <div className="w-12 h-12 bg-linear-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white shrink-0">
                          <Volume2Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground line-clamp-1">
                            {featuredPodcast.title}
                          </h4>
                          {/*<p className="text-xs text-muted-foreground">{PLACEHOLDER_DURATION}</p>*/}
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={featuredPodcast.url} target="_blank">
                            <PlayIcon className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    {t("noSocietyCulturePodcasts")}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-2xl md:text-3xl font-bold mb-4">{t("ctaTitle")}</h3>
          <p className="text-muted-foreground mb-8">{t("ctaDescription")}</p>
          <Button asChild size="lg">
            <Link href="/newstudy">{t("createMyPodcast")}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
