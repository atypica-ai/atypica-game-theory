"use client";

import { fetchUserPodcasts, getPodcastPlaybackUrl } from "@/app/(podcast)/podcasts/actions";
import { Button } from "@/components/ui/button";
import { ExtractServerActionData } from "@/lib/serverAction";
import { 
  ArrowRightIcon, 
  CalendarDaysIcon,
  Loader2Icon, 
  MessageSquareIcon,
  PauseIcon, 
  PlayIcon, 
  SearchIcon,
  ShareIcon,
  Volume2Icon 
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type PodcastItem = ExtractServerActionData<typeof fetchUserPodcasts>[number];

// Placeholder data for demonstration
const placeholderFeaturedPodcast = {
  id: "featured-1",
  title: "Test Podcast",
  subtitle: "Product Research Sample",
  description: "This is a sample podcast demonstrating the AI-generated research audio feature. Real podcasts will appear here once you complete your studies.",
  duration: "10 min",
  hasAudio: true,
  replies: 0,
  generatedAt: new Date(),
};

const placeholderAllPodcasts = [
  {
    id: "all-1",
    title: "Understanding Gen Z Consumer Behavior",
    description: "Deep dive into the purchasing patterns and preferences of Generation Z consumers.",
    duration: "28 min",
    category: "business",
    hasAudio: true,
    replies: 24,
    generatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: "all-2", 
    title: "The Psychology of Brand Loyalty",
    description: "Exploring what makes customers stick with brands and how to build lasting relationships.",
    duration: "32 min",
    category: "business",
    hasAudio: true,
    replies: 18,
    generatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: "all-3",
    title: "Social Media Trends Analysis",
    description: "Latest trends in social media usage and their impact on society.",
    duration: "25 min",
    category: "society",
    hasAudio: true,
    replies: 31,
    generatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: "all-4",
    title: "Remote Work Culture Evolution",
    description: "How remote work is reshaping workplace dynamics and company culture.",
    duration: "35 min",
    category: "society",
    hasAudio: true,
    replies: 15,
    generatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: "all-5",
    title: "E-commerce Conversion Strategies",
    description: "Proven tactics to increase online store conversion rates and reduce cart abandonment.",
    duration: "30 min",
    category: "business",
    hasAudio: true,
    replies: 42,
    generatedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
  },
  {
    id: "all-6",
    title: "Cultural Shifts in Post-Pandemic Era",
    description: "Analyzing how the pandemic has permanently changed social behaviors and cultural norms.",
    duration: "27 min",
    category: "society",
    hasAudio: true,
    replies: 22,
    generatedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
  },
  {
    id: "all-7",
    title: "Sustainable Business Practices",
    description: "How companies are integrating sustainability into their core business strategies.",
    duration: "29 min",
    category: "business",
    hasAudio: true,
    replies: 19,
    generatedAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000),
  },
  {
    id: "all-8",
    title: "Digital Nomad Lifestyle Trends",
    description: "The rise of location-independent work and its impact on global communities.",
    duration: "26 min",
    category: "society",
    hasAudio: true,
    replies: 27,
    generatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
  },
  {
    id: "all-9",
    title: "AI in Marketing Automation",
    description: "How artificial intelligence is transforming marketing campaigns and customer engagement.",
    duration: "33 min",
    category: "business",
    hasAudio: true,
    replies: 38,
    generatedAt: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000),
  },
  {
    id: "all-10",
    title: "Mental Health Awareness Movement",
    description: "The growing conversation around mental health in modern society.",
    duration: "31 min",
    category: "society",
    hasAudio: true,
    replies: 45,
    generatedAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000),
  },
];

export function PodcastsClient() {
  const locale = useLocale();
  const t = useTranslations("PodcastsPage");
  const [podcasts, setPodcasts] = useState<PodcastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1); // Current page for pagination
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null); // For More to Discover
  const [podcastFilter, setPodcastFilter] = useState<"top" | "all">("top"); // Filter for Top vs All podcasts
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const ITEMS_PER_PAGE = 9; // Show 9 podcasts per page (3x3 grid)

  const loadPodcasts = useCallback(async () => {
    try {
      const result = await fetchUserPodcasts();
      if (!result.success) throw result;
      setPodcasts(result.data);
    } catch (error) {
      toast.error((error as Error).message || t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const playAudio = useCallback(
    async (podcastToken: string) => {
      if (playingAudio === podcastToken) {
        // Stop current audio
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        setPlayingAudio(null);
        return;
      }

      try {
        // Get signed URL for the podcast
        const result = await getPodcastPlaybackUrl({ podcastToken });
        if (!result.success || !result.data) {
          toast.error(t("playFailed"));
          return;
        }

        // Stop any currently playing audio
        if (audioRef.current) {
          audioRef.current.pause();
        }

        // Create new audio element
        const audio = new Audio(result.data);
        audioRef.current = audio;

        audio.addEventListener("ended", () => {
          setPlayingAudio(null);
        });

        audio.addEventListener("error", () => {
          toast.error(t("playFailed"));
          setPlayingAudio(null);
        });

        audio
          .play()
          .then(() => {
            setPlayingAudio(podcastToken);
          })
          .catch(() => {
            toast.error(t("playFailed"));
            setPlayingAudio(null);
          });
      } catch (error) {
        toast.error(t("playFailed"));
        console.error("Play audio error:", error);
      }
    },
    [playingAudio, t],
  );

  useEffect(() => {
    loadPodcasts();
  }, [loadPodcasts]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Filter podcasts based on search query
  const filteredPodcasts = podcasts.filter(podcast => 
    podcast.analyst.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (podcast.analyst.studyUserChat?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  // Use placeholder data for demo, or real data if available
  const allPodcastsToDisplay = podcasts.length > 0 ? filteredPodcasts : placeholderAllPodcasts;
  
  // Apply Top/All filter
  const filterAppliedPodcasts = podcastFilter === "top"
    ? [...allPodcastsToDisplay].sort((a: any, b: any) => (b.replies || 0) - (a.replies || 0))
    : allPodcastsToDisplay;
  
  // Filter by search query for placeholders
  const searchFilteredPodcasts = searchQuery
    ? filterAppliedPodcasts.filter((p: any) =>
        p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.analyst?.topic?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filterAppliedPodcasts;

  // Get category filtered podcasts for More to Discover
  const categoryFilteredPodcasts = selectedCategory
    ? placeholderAllPodcasts.filter((p) => p.category === selectedCategory)
    : [];

  // Pagination calculations
  const totalPodcasts = searchFilteredPodcasts.length;
  const totalPages = Math.ceil(totalPodcasts / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentPodcasts = searchFilteredPodcasts.slice(startIndex, endIndex);

  const formatDate = (date: Date, locale: string) => {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

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
      {/* Hero Section - Featured Podcast */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="bg-card border border-border rounded-2xl p-8 md:p-12 relative overflow-hidden shadow-lg">
              {/* Share Button - Top Right */}
              <div className="absolute top-6 right-6 z-20">
                <Button variant="outline" size="sm" className="h-7 text-xs rounded-full shadow-none">
                  <ShareIcon className="size-3" />
                  <span className="max-sm:hidden">Share</span>
                </Button>
              </div>

              <div className="relative z-10">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
                  <div className="flex-1">
                    <h1 className="font-EuclidCircularA font-medium text-4xl md:text-5xl lg:text-6xl tracking-tight text-foreground mb-4">
                      {placeholderFeaturedPodcast.title}
                    </h1>
                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-handwriting text-primary mb-6">
                      {placeholderFeaturedPodcast.subtitle}
                    </h2>
                    <p className="text-lg text-muted-foreground mb-6 max-w-2xl">
                      {placeholderFeaturedPodcast.description}
                    </p>
                    
                    {/* Metadata */}
                    <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <CalendarDaysIcon className="w-4 h-4" />
                        <span>{formatDate(placeholderFeaturedPodcast.generatedAt, locale)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquareIcon className="w-4 h-4" />
                        <span>{placeholderFeaturedPodcast.replies} replies</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>{placeholderFeaturedPodcast.duration}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                      >
                        View Study
                      </Button>
                    </div>
                  </div>

                  {/* Play Button */}
                  <div className="flex-shrink-0">
                    <Button
                      size="icon"
                      className="h-20 w-20 md:h-24 md:w-24 rounded-full bg-foreground hover:bg-foreground/90 text-background shadow-lg"
                      onClick={() => playAudio('featured')}
                    >
                      <PlayIcon className="size-8 md:size-10 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* All Podcasts Section */}
      <section className="bg-zinc-50 dark:bg-zinc-800 py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="font-EuclidCircularA font-medium text-4xl md:text-5xl tracking-tight text-foreground mb-4">
              All Podcasts
            </h2>
            <p className="max-w-3xl mx-auto text-lg text-zinc-600 dark:text-zinc-400">
              Browse and search through all your research podcasts
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Filter Tabs and Search Bar */}
            <div className="mb-8 space-y-6">
              {/* Filter Tabs */}
              <div className="flex items-center justify-center">
                <div className="inline-flex items-center gap-2 bg-muted p-1 rounded-lg">
                  <button
                    onClick={() => {
                      setPodcastFilter("top");
                      setCurrentPage(1);
                    }}
                    className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
                      podcastFilter === "top"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Top Podcasts
                  </button>
                  <button
                    onClick={() => {
                      setPodcastFilter("all");
                      setCurrentPage(1);
                    }}
                    className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
                      podcastFilter === "all"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All Podcasts
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="flex items-center justify-center">
                <div className="relative w-full max-w-md">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search podcasts..."
                    value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1); // Reset to first page on search
                  }}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Podcast List */}
            {searchFilteredPodcasts.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-4">
                  {currentPodcasts.map((podcast: any) => {
                    const isPlaying = playingAudio === podcast.id;
                    const podcastTitle = podcast.title || podcast.analyst?.topic || "Untitled";
                    const podcastDescription = podcast.description || podcast.analyst?.studyUserChat?.title || "";
                    const podcastDate = podcast.generatedAt || podcast.createdAt || new Date();
                    const podcastReplies = podcast.replies || 0;
                    const podcastDuration = podcast.duration || "N/A";

                    return (
                      <div
                        key={podcast.id}
                        className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow group relative"
                      >
                        {/* Share Button - Top Right */}
                        <div className="absolute top-4 right-4 z-10">
                          <Button variant="outline" size="sm" className="h-7 text-xs rounded-full shadow-none">
                            <ShareIcon className="size-3" />
                            <span className="max-sm:hidden">Share</span>
                          </Button>
                        </div>

                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            <Volume2Icon className="w-6 h-6" />
                          </div>

                          <div className="flex-1 min-w-0 pr-16">
                            <h3 className="font-semibold text-lg text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                              {podcastTitle}
                            </h3>
                            {podcastDescription && (
                              <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                                {podcastDescription}
                              </p>
                            )}
                            
                            {/* Metadata */}
                            <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <CalendarDaysIcon className="w-3.5 h-3.5" />
                                <span>{formatDate(podcastDate, locale)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageSquareIcon className="w-3.5 h-3.5" />
                                <span>{podcastReplies} replies</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span>{podcastDuration}</span>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => playAudio(podcast.id || podcast.token)}
                              >
                                <PlayIcon className="h-4 w-4 mr-1.5" />
                                {isPlaying ? "Playing..." : "Play Episode"}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                              >
                                View Study
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        // Show first page, last page, current page, and pages around current
                        const showPage = 
                          page === 1 || 
                          page === totalPages || 
                          (page >= currentPage - 1 && page <= currentPage + 1);
                        
                        const showEllipsis = 
                          (page === 2 && currentPage > 3) ||
                          (page === totalPages - 1 && currentPage < totalPages - 2);

                        if (showEllipsis) {
                          return <span key={page} className="px-2 text-muted-foreground">...</span>;
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
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            ) : searchQuery ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <SearchIcon className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Results Found</h3>
                <p className="text-muted-foreground mb-6">Try adjusting your search terms</p>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Volume2Icon className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Podcasts Yet</h3>
                <p className="text-muted-foreground mb-6">Start a new study and generate your first podcast!</p>
                <Button asChild>
                  <Link href="/newstudy">Start New Study</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* More to Discover Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
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
                onClick={() => setSelectedCategory(selectedCategory === "business" ? null : "business")}
                className="w-full p-8 hover:bg-accent/50 transition-colors group text-left"
              >
                <div className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-6 flex-1">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
                      <Volume2Icon className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-foreground mb-2">Business</h3>
                      <p className="text-muted-foreground">Market insights, strategy, and industry analysis</p>
                    </div>
                  </div>
                  <div className="text-muted-foreground">
                    {selectedCategory === "business" ? "−" : "+"}
                  </div>
                </div>
              </button>
              
              {selectedCategory === "business" && (
                <div className="border-t border-border p-6 bg-muted/20">
                  <div className="space-y-3">
                    {categoryFilteredPodcasts.map((podcast) => (
                      <div
                        key={podcast.id}
                        className="bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-shadow flex items-center gap-3"
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                          <Volume2Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground line-clamp-1">{podcast.title}</h4>
                          <p className="text-xs text-muted-foreground">{podcast.duration}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => playAudio(podcast.id)}
                        >
                          <PlayIcon className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
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
                      <h3 className="text-xl font-semibold text-foreground mb-2">Society & Culture</h3>
                      <p className="text-muted-foreground">Social trends, cultural shifts, and human behavior</p>
                    </div>
                  </div>
                  <div className="text-muted-foreground">
                    {selectedCategory === "society" ? "−" : "+"}
                  </div>
                </div>
              </button>
              
              {selectedCategory === "society" && (
                <div className="border-t border-border p-6 bg-muted/20">
                  <div className="space-y-3">
                    {categoryFilteredPodcasts.map((podcast) => (
                      <div
                        key={podcast.id}
                        className="bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-shadow flex items-center gap-3"
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                          <Volume2Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground line-clamp-1">{podcast.title}</h4>
                          <p className="text-xs text-muted-foreground">{podcast.duration}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => playAudio(podcast.id)}
                        >
                          <PlayIcon className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Hidden audio element */}
      <audio ref={audioRef} />
    </div>
  );
}