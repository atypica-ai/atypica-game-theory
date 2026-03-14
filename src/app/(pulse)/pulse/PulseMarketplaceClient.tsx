"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ExtractServerActionData } from "@/lib/serverAction";
import { ChevronDownIcon, InboxIcon, Loader2Icon, SearchIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  fetchPulseHeatTreemapDataPublic,
  fetchPulsesByCategory,
  fetchUserRecommendations,
} from "./actions";
import { CategoryBar } from "./components/CategoryBar";
import { PulseCard } from "./components/PulseCard";
import { PulseDetailDialog } from "./components/PulseDetailDialog";
import { PulseHeatTreemap } from "./components/PulseHeatTreemap";
import { sortPulsesByHeatDeltaSimple } from "./utils/sorting";

type TRecommendations = ExtractServerActionData<typeof fetchUserRecommendations>;
type TPulses = ExtractServerActionData<typeof fetchPulsesByCategory>;
type THeatTreemapData = ExtractServerActionData<typeof fetchPulseHeatTreemapDataPublic>;

interface PulseMarketplaceClientProps {
  initialCategories: Array<{ name: string }>;
  isAuthenticated: boolean;
}

export function PulseMarketplaceClient({
  initialCategories,
  isAuthenticated,
}: PulseMarketplaceClientProps) {
  const t = useTranslations("Pulse");
  const locale = useLocale();

  // Fetch recommendations first to determine if Recommend tab should be shown
  const { data: recommendationsData } = useSWR<TRecommendations>(
    isAuthenticated ? "recommendations" : null,
    async () => {
      const result = await fetchUserRecommendations();
      if (!result.success) {
        throw new Error(result.message || "Failed to load recommendations");
      }
      return result.data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const hasRecommendations = (recommendationsData?.recommendations?.length ?? 0) > 0;
  const [selectedCategory, setSelectedCategory] = useState<"Recommend" | "ALL" | string>("ALL");

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [heatFilter, setHeatFilter] = useState<"all" | "high" | "medium" | "low">("all");

  // Highlight state for pulse card animation
  const [highlightedPulseId, setHighlightedPulseId] = useState<number | null>(null);

  // Dialog state for pulse detail
  const [selectedPulse, setSelectedPulse] = useState<(typeof pulses)[number] | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const router = useRouter();

  // If user switches to Recommend but there are no recommendations, switch back to ALL
  useEffect(() => {
    if (
      selectedCategory === "Recommend" &&
      recommendationsData !== undefined &&
      !hasRecommendations
    ) {
      setSelectedCategory("ALL");
    }
  }, [selectedCategory, recommendationsData, hasRecommendations]);

  // Fetch pulses when category changes (not Recommend)
  const { data: pulsesData, isLoading: isLoadingPulses } = useSWR<TPulses>(
    selectedCategory !== "Recommend" ? ["pulses", selectedCategory] : null,
    async () => {
      const result = await fetchPulsesByCategory(
        selectedCategory !== "ALL" ? selectedCategory : undefined,
      );
      if (!result.success) {
        throw new Error(result.message || "Failed to load pulses");
      }
      return result.data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  // Re-fetch recommendations if needed (when switching back to Recommend)
  // Only fetch if user is authenticated
  const { data: recommendationsDataRefetch, isLoading: isLoadingRecommendations } =
    useSWR<TRecommendations>(
      selectedCategory === "Recommend" && isAuthenticated ? "recommendations" : null,
      async () => {
        const result = await fetchUserRecommendations();
        if (!result.success) {
          throw new Error(result.message || "Failed to load recommendations");
        }
        return result.data;
      },
      {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
      },
    );

  // Use refetched data if available, otherwise use initial data
  const finalRecommendationsData = recommendationsDataRefetch || recommendationsData;

  // Fetch HEAT treemap data
  const { data: heatTreemapData, isLoading: isLoadingHeatTreemap } = useSWR<THeatTreemapData>(
    "pulse-heat-treemap",
    async () => {
      const result = await fetchPulseHeatTreemapDataPublic(30);
      if (!result.success) {
        throw new Error(result.message || "Failed to load HEAT treemap data");
      }
      return result.data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const recommendations = (finalRecommendationsData?.recommendations || []).sort((a, b) =>
    sortPulsesByHeatDeltaSimple(a.pulse, b.pulse),
  );
  const pulses = useMemo(() => pulsesData || [], [pulsesData]);

  // Apply filters
  const filteredPulses = useMemo(() => {
    let filtered = [...pulses];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (pulse) =>
          pulse.title.toLowerCase().includes(query) || pulse.content.toLowerCase().includes(query),
      );
    }

    // Time filter
    if (timeFilter !== "all") {
      const now = new Date();
      const filterDate = new Date();

      if (timeFilter === "today") {
        filterDate.setHours(0, 0, 0, 0);
      } else if (timeFilter === "week") {
        filterDate.setDate(now.getDate() - 7);
      } else if (timeFilter === "month") {
        filterDate.setMonth(now.getMonth() - 1);
      }

      filtered = filtered.filter((pulse) => new Date(pulse.createdAt) >= filterDate);
    }

    // Heat filter
    if (heatFilter !== "all") {
      filtered = filtered.filter((pulse) => {
        const delta = pulse.heatDelta;
        if (delta === null) return heatFilter === "low";

        const absDelta = Math.abs(delta);
        if (heatFilter === "high") return absDelta >= 0.3;
        if (heatFilter === "medium") return absDelta >= 0.1 && absDelta < 0.3;
        if (heatFilter === "low") return absDelta < 0.1;
        return true;
      });
    }

    return filtered;
  }, [pulses, searchQuery, timeFilter, heatFilter]);

  const isLoading = selectedCategory === "Recommend" ? isLoadingRecommendations : isLoadingPulses;

  // Handle pulse click from treemap
  const handlePulseClick = (pulseId: number) => {
    // Find the card element
    const cardElement = document.querySelector(`[data-pulse-id="${pulseId}"]`);
    if (!cardElement) return;

    // Scroll to the card with smooth behavior
    cardElement.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    // Highlight the card with soft glow
    setHighlightedPulseId(pulseId);

    // Remove highlight after animation completes
    setTimeout(() => {
      setHighlightedPulseId(null);
    }, 1500);
  };

  // Handle card click to open detail dialog
  const handleCardClick = (pulse: (typeof pulses)[number]) => {
    setSelectedPulse(pulse);
    setIsDetailDialogOpen(true);
  };

  // Handle start research from detail dialog
  const handleStartResearch = () => {
    // Find the pulse data
    const pulse = selectedPulse;
    if (!pulse) return;

    // Build research message based on locale
    const researchMessage = locale.startsWith("zh")
      ? `请开始研究关于"${pulse.title}"的课题。以下是相关详细信息：【${pulse.content}】。`
      : `Please start a research on the topic of \`${pulse.title}\`. Here are some details: 【${pulse.content}】.`;

    // Navigate to newstudy page with pre-filled message
    router.push(`/newstudy?brief=${encodeURIComponent(researchMessage)}`);
  };

  return (
    <div className="px-4 md:px-8 py-8 md:py-12">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="w-12 h-1 bg-ghost-green" />
          <h1 className="text-4xl md:text-5xl font-EuclidCircularA font-medium tracking-tight">
            {t("title")}
          </h1>
          <p className="text-base text-muted-foreground">{t("description")}</p>
        </div>

        {/* Pulse Heat Treemap Section */}
        {heatTreemapData && heatTreemapData.categories.length > 0 && (
          <div>
            {isLoadingHeatTreemap ? (
              <div className="flex items-center justify-center py-20">
                <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <PulseHeatTreemap
                categories={heatTreemapData.categories}
                updatedAt={heatTreemapData.updatedAt}
                onPulseClick={handlePulseClick}
              />
            )}
          </div>
        )}

        {/* Category Bar with Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
          <div className="flex-1 min-w-0">
            <CategoryBar
              categories={initialCategories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              showRecommend={hasRecommendations}
            />
          </div>

          {selectedCategory !== "Recommend" && (
            <div className="flex items-center gap-2 lg:shrink-0">
              <div className="relative w-48">
                <SearchIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t("searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                    {timeFilter === "all" && t("allTime")}
                    {timeFilter === "today" && t("today")}
                    {timeFilter === "week" && t("thisWeek")}
                    {timeFilter === "month" && t("thisMonth")}
                    <ChevronDownIcon className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTimeFilter("all")}>
                    {t("allTime")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTimeFilter("today")}>
                    {t("today")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTimeFilter("week")}>
                    {t("thisWeek")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTimeFilter("month")}>
                    {t("thisMonth")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                    {heatFilter === "all" && t("allHeat")}
                    {heatFilter === "high" && t("highHeat")}
                    {heatFilter === "medium" && t("mediumHeat")}
                    {heatFilter === "low" && t("lowHeat")}
                    <ChevronDownIcon className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setHeatFilter("all")}>
                    {t("allHeat")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setHeatFilter("high")}>
                    {t("highHeat")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setHeatFilter("medium")}>
                    {t("mediumHeat")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setHeatFilter("low")}>
                    {t("lowHeat")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : selectedCategory === "Recommend" ? (
          <div>
            {!isAuthenticated ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <InboxIcon className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">{t("signInForRecommendations")}</p>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <InboxIcon className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">{t("noRecommendations")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations.map((rec) => (
                  <PulseCard
                    key={rec.pulseId}
                    pulse={rec.pulse}
                    angle={rec.angle}
                    highlighted={highlightedPulseId === rec.pulseId}
                    onClick={() => handleCardClick(rec.pulse)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {filteredPulses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <InboxIcon className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  {pulses.length === 0 ? t("noPulsesInCategory") : t("noPulsesMatchFilters")}
                </p>
                {pulses.length > 0 && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setTimeFilter("all");
                      setHeatFilter("all");
                    }}
                    className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("clearFilters")}
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPulses.map((pulse) => (
                  <PulseCard
                    key={pulse.id}
                    pulse={pulse}
                    highlighted={highlightedPulseId === pulse.id}
                    onClick={() => handleCardClick(pulse)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <PulseDetailDialog
          open={isDetailDialogOpen}
          onOpenChange={setIsDetailDialogOpen}
          pulse={selectedPulse}
          onStartResearch={handleStartResearch}
        />
      </div>
    </div>
  );
}
