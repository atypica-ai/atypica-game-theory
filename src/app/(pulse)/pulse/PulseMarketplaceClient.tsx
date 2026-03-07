"use client";

import { useState, useEffect, useMemo } from "react";
import { CategoryBar } from "./components/CategoryBar";
import { PulseCard } from "./components/PulseCard";
import { PulseHeatTreemap } from "./components/PulseHeatTreemap";
import { PulseDetailDialog } from "./components/PulseDetailDialog";
import { fetchPulsesByCategory, fetchUserRecommendations, fetchPulseHeatTreemapDataPublic } from "./actions";
import { Loader2Icon, SearchIcon, ChevronDownIcon } from "lucide-react";
import useSWR from "swr";
import { ExtractServerActionData } from "@/lib/serverAction";
import { sortPulsesByHeatDeltaSimple } from "./utils/sorting";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";

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
  const t = useTranslations("PulsePage");
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
  const [selectedPulse, setSelectedPulse] = useState<typeof pulses[number] | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const router = useRouter();

  // If user switches to Recommend but there are no recommendations, switch back to ALL
  useEffect(() => {
    if (selectedCategory === "Recommend" && recommendationsData !== undefined && !hasRecommendations) {
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
  const { data: recommendationsDataRefetch, isLoading: isLoadingRecommendations } = useSWR<TRecommendations>(
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
  const pulses = pulsesData || [];

  // Apply filters
  const filteredPulses = useMemo(() => {
    let filtered = [...pulses];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (pulse) =>
          pulse.title.toLowerCase().includes(query) ||
          pulse.content.toLowerCase().includes(query)
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
  const handleCardClick = (pulse: typeof pulses[number]) => {
    setSelectedPulse(pulse);
    setIsDetailDialogOpen(true);
  };

  // Handle start research from detail dialog
  const handleStartResearch = (pulseId: number) => {
    // Find the pulse data
    const pulse = selectedPulse;
    if (!pulse) return;

    // Build research message based on locale
    const researchMessage = locale.startsWith('zh')
      ? `请开始研究关于"${pulse.title}"的课题。以下是相关详细信息：【${pulse.content}】。`
      : `Please start a research on the topic of \`${pulse.title}\`. Here are some details: 【${pulse.content}】.`;

    // Navigate to newstudy page with pre-filled message
    router.push(`/newstudy?brief=${encodeURIComponent(researchMessage)}`);
  };

  return (
    <div className="container mx-auto px-4 md:px-6 lg:px-12 xl:px-16 2xl:px-20 py-6 md:py-8 max-w-[96rem]">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-EuclidCircularA)" }}>
          Pulse Marketplace
        </h1>
        <p className="text-muted-foreground text-sm md:text-base" style={{ fontFamily: "var(--font-EuclidCircularA)" }}>
          Discover trending topics and personalized recommendations
        </p>
      </div>

      {/* Pulse Heat Treemap Section */}
      {heatTreemapData && heatTreemapData.categories.length > 0 && (
        <div className="mb-6 md:mb-8">
          {isLoadingHeatTreemap ? (
            <div className="flex items-center justify-center py-20">
              <Loader2Icon className="h-7 w-7 animate-spin text-muted-foreground" />
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
      <div className="mb-6 md:mb-8 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
        {/* Category Bar - Left */}
        <div className="flex-1 min-w-0">
          <CategoryBar
            categories={initialCategories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            showRecommend={hasRecommendations}
          />
        </div>

        {/* Filter and Search Bar - Right */}
        {selectedCategory !== "Recommend" && (
          <div className="flex items-center gap-2 lg:flex-shrink-0">
            {/* Search */}
            <div className="relative w-48">
              <SearchIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
              <input
                type="text"
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-border/50 bg-muted/30 pl-8 pr-3 py-1.5 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:border-border focus:bg-background transition-colors"
              />
            </div>

            {/* Time Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-3 py-1.5 text-xs text-foreground/80 hover:border-border hover:bg-background transition-colors outline-none">
                {timeFilter === "all" && t("allTime")}
                {timeFilter === "today" && t("today")}
                {timeFilter === "week" && t("thisWeek")}
                {timeFilter === "month" && t("thisMonth")}
                <ChevronDownIcon className="h-3 w-3 opacity-50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[--radix-dropdown-menu-trigger-width]">
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

            {/* Heat Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-3 py-1.5 text-xs text-foreground/80 hover:border-border hover:bg-background transition-colors outline-none">
                {heatFilter === "all" && t("allHeat")}
                {heatFilter === "high" && t("highHeat")}
                {heatFilter === "medium" && t("mediumHeat")}
                {heatFilter === "low" && t("lowHeat")}
                <ChevronDownIcon className="h-3 w-3 opacity-50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[--radix-dropdown-menu-trigger-width]">
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
        <div className="flex items-center justify-center py-12">
          <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : selectedCategory === "Recommend" ? (
        // Recommendations: Grid Layout (same as other categories)
        <div>
          {!isAuthenticated ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-2">{t("signInForRecommendations")}</p>
              <p className="text-sm text-muted-foreground">
                {t("recommendationsDescription")}
              </p>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-2">{t("noRecommendations")}</p>
              <p className="text-sm text-muted-foreground">
                {t("recommendationsDescription")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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
        // Regular Pulses: Grid Layout
        <div>
          {filteredPulses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {pulses.length === 0 ? t("noPulsesInCategory") : t("noPulsesMatchFilters")}
              </p>
              {pulses.length > 0 && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setTimeFilter("all");
                    setHeatFilter("all");
                  }}
                  className="mt-4 text-sm text-primary hover:underline"
                >
                  {t("clearFilters")}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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

      {/* Pulse Detail Dialog */}
      <PulseDetailDialog
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        pulse={selectedPulse}
        onStartResearch={handleStartResearch}
      />
    </div>
  );
}
