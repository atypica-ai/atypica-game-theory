"use client";
import { Button } from "@/components/ui/button";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn } from "@/lib/utils";
import {
  CalendarDaysIcon,
  MessageSquareIcon,
  PlayIcon,
  ShareIcon,
  Volume2Icon,
} from "lucide-react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { fetchFeaturedPodcasts } from "./actions";
import { HighlightPodcast } from "./HighlightPodcast";

type FeaturedPodcastItem = ExtractServerActionData<typeof fetchFeaturedPodcasts>[number];

// Fixed placeholder values
const PLACEHOLDER_DURATION = "25 min";
const PLACEHOLDER_REPLIES = 0;

export function FeaturedPodcastsClient() {
  const locale = useLocale();
  const [featuredPodcasts, setFeaturedPodcasts] = useState<FeaturedPodcastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [podcastFilter, setPodcastFilter] = useState<"top" | "all">("top");

  const ITEMS_PER_PAGE = 5;

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

  const formatDate = (date: Date, locale: string) => {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

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

  // Pagination
  const totalPages = Math.ceil(displayPodcasts.length / ITEMS_PER_PAGE);
  const currentPodcasts = displayPodcasts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // Highlight podcast (random)
  const highlightPodcast =
    featuredPodcasts.length > 0
      ? featuredPodcasts[Math.floor(Math.random() * featuredPodcasts.length)]
      : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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
      <HighlightPodcast
        podcast={highlightPodcast?.podcast || null}
        analyst={highlightPodcast?.analyst || null}
        studyUserChat={highlightPodcast?.studyUserChat || null}
        locale={locale}
        placeholderDuration={PLACEHOLDER_DURATION}
        placeholderReplies={PLACEHOLDER_REPLIES}
      />

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
          <div className="inline-flex items-center gap-2 bg-muted p-1 rounded-lg mb-8 mx-auto">
            <button
              onClick={() => {
                setPodcastFilter("top");
                setCurrentPage(1);
              }}
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
              onClick={() => {
                setPodcastFilter("all");
                setCurrentPage(1);
              }}
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
            <>
              <div className="grid grid-cols-1 gap-4">
                {currentPodcasts.map((featuredPodcast) => (
                  <div
                    key={featuredPodcast.podcast.token}
                    className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow group relative"
                  >
                    {/* Share Button - Top Right */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-4 right-4 h-7 text-xs rounded-full shadow-none"
                    >
                      <ShareIcon className="size-3" />
                      <span className="max-sm:hidden">Share</span>
                    </Button>

                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        <Volume2Icon className="w-6 h-6" />
                      </div>

                      <div className="flex-1 min-w-0 pr-16">
                        <h3 className="font-semibold text-lg text-foreground mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                          {featuredPodcast.studyUserChat?.title || "Untitled Study"}
                        </h3>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                          {featuredPodcast.analyst.topic}
                        </p>

                        {/* Metadata */}
                        <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
                          <CalendarDaysIcon className="w-3.5 h-3.5" />
                          <span>
                            {formatDate(
                              featuredPodcast.podcast.generatedAt ||
                                featuredPodcast.podcast.createdAt,
                              locale,
                            )}
                          </span>
                          <MessageSquareIcon className="w-3.5 h-3.5" />
                          <span>{PLACEHOLDER_REPLIES} replies</span>
                          <span>{PLACEHOLDER_DURATION}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link
                              href={`/artifacts/podcast/${featuredPodcast.podcast.token}/share`}
                              target="_blank"
                            >
                              <PlayIcon className="h-4 w-4 mr-1.5" />
                              Play Podcast
                            </Link>
                          </Button>
                          {featuredPodcast.studyUserChat && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                              asChild
                            >
                              <Link href={`/study/${featuredPodcast.studyUserChat.token}/share`}>
                                View Study
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination (only for All Podcasts) */}
              {podcastFilter === "all" && totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      const showPage =
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1);

                      const showEllipsis =
                        (page === 2 && currentPage > 3) ||
                        (page === totalPages - 1 && currentPage < totalPages - 2);

                      if (showEllipsis) {
                        return (
                          <span key={page} className="px-2 text-muted-foreground">
                            ...
                          </span>
                        );
                      }

                      if (!showPage) return null;

                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="min-w-[2.5rem]"
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
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
                            {featuredPodcast.studyUserChat?.title || "Untitled Study"}
                          </h4>
                          <p className="text-xs text-muted-foreground">{PLACEHOLDER_DURATION}</p>
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
                            {featuredPodcast.studyUserChat?.title || "Untitled Study"}
                          </h4>
                          <p className="text-xs text-muted-foreground">{PLACEHOLDER_DURATION}</p>
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
