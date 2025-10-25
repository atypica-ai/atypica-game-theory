"use client";
import { Button } from "@/components/ui/button";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn } from "@/lib/utils";
import { PlayIcon, SquareArrowOutUpLeftIcon, Volume2Icon } from "lucide-react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchFeaturedPodcasts } from "./actions";
import { HighlightPodcast } from "./HighlightPodcast";

type FeaturedPodcastItem = ExtractServerActionData<typeof fetchFeaturedPodcasts>[number];

export function FeaturedPodcastsClient() {
  const locale = useLocale();
  const [featuredPodcasts, setFeaturedPodcasts] = useState<FeaturedPodcastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [podcastFilter, setPodcastFilter] = useState<"top" | "all">("top");

  const loadFeaturedPodcasts = useCallback(async () => {
    try {
      const result = await fetchFeaturedPodcasts({ locale });
      if (result.success) {
        setFeaturedPodcasts(result.data);
      }
    } catch (error) {
      console.error("Failed to load featured podcasts:", error);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    loadFeaturedPodcasts();
  }, [loadFeaturedPodcasts]);

  // Get podcast kind from extra
  const getPodcastKind = (featuredPodcast: FeaturedPodcastItem) => {
    return featuredPodcast.podcast.extra?.kindDetermination?.kind;
  };

  // Categorize podcasts by kind
  const businessPodcasts = featuredPodcasts.filter((p) => getPodcastKind(p) === "opinionOriented");
  const societyPodcasts = featuredPodcasts.filter(
    (p) => getPodcastKind(p) === "deepDive" || getPodcastKind(p) === "debate",
  );

  // Get category filtered podcasts for More to Discover
  const categoryFilteredPodcasts =
    selectedCategory === "business"
      ? businessPodcasts
      : selectedCategory === "society"
        ? societyPodcasts
        : [];

  // Apply Top/All filter
  const displayPodcasts = podcastFilter === "top" ? featuredPodcasts.slice(0, 5) : featuredPodcasts;

  // Highlight podcast (random)
  const highlightPodcast = useMemo(() => {
    return featuredPodcasts.length > 0
      ? featuredPodcasts[Math.floor(Math.random() * featuredPodcasts.length)]
      : null;
  }, [featuredPodcasts]);

  if (loading) {
    return (
      <div className="min-h-[50dvh] bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading podcasts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Highlight Section - Featured Podcast */}
      {highlightPodcast && (
        <HighlightPodcast
          podcast={highlightPodcast.podcast}
          analyst={highlightPodcast.analyst}
          studyUserChat={highlightPodcast.studyUserChat}
          locale={locale}
        />
      )}

      {/* All Podcasts Section */}
      <section className="bg-zinc-50 dark:bg-zinc-800 px-4 py-20 md:py-28">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="font-EuclidCircularA font-medium text-4xl md:text-5xl tracking-tight text-foreground mb-4">
            All Podcasts
          </h2>
          <p className="max-w-3xl mx-auto text-lg text-zinc-600 dark:text-zinc-400">
            Browse and search through all your research podcasts
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Filter Tabs */}
          <div className="flex items-center gap-2 bg-muted p-1 rounded-lg mb-8 w-fit mx-auto">
            <button
              onClick={() => setPodcastFilter("top")}
              className={cn(
                "px-6 py-2 text-sm font-medium rounded-md transition-colors",
                podcastFilter === "top"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Top Podcasts
            </button>
            <button
              onClick={() => setPodcastFilter("all")}
              className={cn(
                "px-6 py-2 text-sm font-medium rounded-md transition-colors",
                podcastFilter === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              All Podcasts
            </button>
          </div>

          {/* Podcast List */}
          {displayPodcasts.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {displayPodcasts.map((featuredPodcast) => (
                <div
                  key={featuredPodcast.podcast.token}
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
                        "bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-xs shrink-0",
                      )}
                    >
                      <Volume2Icon className="size-4 sm:size-6" />
                    </div>

                    <div className="flex-1 min-w-0 sm:pr-8">
                      <h3 className="font-semibold text-base sm:text-lg text-foreground mb-2 line-clamp-2 sm:line-clamp-1 group-hover:text-primary transition-colors">
                        {featuredPodcast.studyUserChat.title}
                      </h3>
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-3 sm:line-clamp-2">
                        {featuredPodcast.analyst.topic}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs shadow-none max-sm:hidden"
                          asChild
                        >
                          <Link
                            href={`/study/${featuredPodcast.studyUserChat.token}/share`}
                            target="_blank"
                          >
                            <SquareArrowOutUpLeftIcon className="size-3" />
                            View Study Process
                          </Link>
                        </Button>

                        <Button variant="default" asChild className="text-xs h-7 shadow-none">
                          <Link
                            href={`/artifacts/podcast/${featuredPodcast.podcast.token}/share`}
                            target="_blank"
                          >
                            <PlayIcon className="size-4" />
                            Play Podcast
                          </Link>
                        </Button>

                        {/*<CalendarDaysIcon className="w-3.5 h-3.5" />
                        <span>{formatDate(featuredPodcast.podcast.generatedAt, locale)}</span>*/}
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
              <h3 className="text-lg font-semibold text-foreground mb-2">No Podcasts Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start a new study and generate your first podcast!
              </p>
              <Button asChild>
                <Link href="/newstudy">Start New Study</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* More to Discover Section */}
      <section className="container mx-auto px-4 py-20 md:py-28">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="font-EuclidCircularA font-medium text-4xl md:text-5xl tracking-tight text-foreground mb-4">
            More to Discover
          </h2>
          <p className="max-w-3xl mx-auto text-lg text-zinc-600 dark:text-zinc-400">
            Explore different categories of research podcasts
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
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
                    <Volume2Icon className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-2">Business</h3>
                    <p className="text-muted-foreground">
                      Market insights, strategy, and industry analysis
                    </p>
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
                        key={featuredPodcast.podcast.token}
                        className="bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-shadow flex items-center gap-3"
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                          <Volume2Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground line-clamp-1">
                            {featuredPodcast.studyUserChat.title}
                          </h4>
                          {/*<p className="text-xs text-muted-foreground">{PLACEHOLDER_DURATION}</p>*/}
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            href={`/artifacts/podcast/${featuredPodcast.podcast.token}/share`}
                            target="_blank"
                          >
                            <PlayIcon className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    No business podcasts available yet.
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
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
                    <Volume2Icon className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Society & Culture
                    </h3>
                    <p className="text-muted-foreground">
                      Social trends, cultural shifts, and human behavior
                    </p>
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
                        key={featuredPodcast.podcast.token}
                        className="bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-shadow flex items-center gap-3"
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                          <Volume2Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground line-clamp-1">
                            {featuredPodcast.studyUserChat.title}
                          </h4>
                          {/*<p className="text-xs text-muted-foreground">{PLACEHOLDER_DURATION}</p>*/}
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            href={`/artifacts/podcast/${featuredPodcast.podcast.token}/share`}
                            target="_blank"
                          >
                            <PlayIcon className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    No society & culture podcasts available yet.
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
          <h3 className="text-2xl md:text-3xl font-bold mb-4">Ready to create your own podcast?</h3>
          <p className="text-muted-foreground mb-8">
            Start a new research and generate your first AI podcast in minutes.
          </p>
          <Button asChild size="lg">
            <Link href="/newstudy">Create My Podcast</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
