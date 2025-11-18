"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCwIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { RegionFilter } from "@/lib/analytics/google/reporter";

import {
  fetchTopPageViewsAction,
  fetchTopPodcastPageViewsAction,
  fetchTopStudyPageViewsAction,
  PageViewWithPodcast,
  PageViewWithReport,
  PageViewWithStudy,
} from "./actions";
import { PodcastsList } from "./PodcastsList";
import { ReportsList } from "./ReportsList";
import { StudiesList } from "./StudiesList";

const DAY_OPTIONS = [
  { value: 7, label: "Last 7 days" },
  { value: 14, label: "Last 14 days" },
  { value: 30, label: "Last 30 days" },
  { value: 60, label: "Last 60 days" },
  { value: 90, label: "Last 90 days" },
];

export default function PageViewsPage() {
  const { status } = useSession();
  const router = useRouter();

  const [viewType, setViewType] = useState<"reports" | "studies" | "podcasts">("reports");
  const [regionFilter, setRegionFilter] = useState<RegionFilter>("all");
  const [topPageViews, setTopPageViews] = useState<PageViewWithReport[]>([]);
  const [topStudyViews, setTopStudyViews] = useState<PageViewWithStudy[]>([]);
  const [topPodcastViews, setTopPodcastViews] = useState<PageViewWithPodcast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [customDays, setCustomDays] = useState("");
  const [limit, setLimit] = useState(20);

  const fetchData = useCallback(
    async (
      filterDays?: number,
      filterLimit?: number,
      type?: "reports" | "studies" | "podcasts",
      region?: RegionFilter,
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const actualDays = filterDays ?? (customDays ? parseInt(customDays) : days);
        const actualLimit = filterLimit ?? limit;
        const fetchType = type ?? viewType;
        const actualRegion = region ?? regionFilter;

        if (fetchType === "reports") {
          const topResult = await fetchTopPageViewsAction(actualDays, actualLimit, actualRegion);

          if (!topResult.success) {
            setError(topResult.message ?? "Failed to fetch top page views");
            return;
          }

          setTopPageViews(topResult.data);
        } else if (fetchType === "studies") {
          const studyResult = await fetchTopStudyPageViewsAction(
            actualDays,
            actualLimit,
            actualRegion,
          );

          if (!studyResult.success) {
            setError(studyResult.message ?? "Failed to fetch top study views");
            return;
          }

          setTopStudyViews(studyResult.data);
        } else {
          const podcastResult = await fetchTopPodcastPageViewsAction(
            actualDays,
            actualLimit,
            actualRegion,
          );

          if (!podcastResult.success) {
            setError(podcastResult.message ?? "Failed to fetch top podcast views");
            return;
          }

          setTopPodcastViews(podcastResult.data);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    },
    [days, customDays, limit, viewType, regionFilter],
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/admin/statistics/pageviews");
    } else if (status === "authenticated") {
      fetchData();
    }
  }, [status, router, fetchData]);

  // Fetch data when viewType changes
  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
    }
  }, [viewType, status, fetchData]);

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  const actualDays = customDays ? parseInt(customDays) : days;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-2xl font-bold">Page Views Analytics</h1>
        <Button
          onClick={() => {
            const actualDays = customDays ? parseInt(customDays) : days;
            fetchData(actualDays, limit, viewType, regionFilter);
          }}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCwIcon className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      {error && <div className="rounded-lg bg-destructive/10 p-4 text-destructive">{error}</div>}

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* View Type Selection */}
          <div className="space-y-2">
            <Label>View Type</Label>
            <RadioGroup
              value={viewType}
              onValueChange={(value: "reports" | "studies" | "podcasts") => setViewType(value)}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="reports" id="reports" />
                <Label htmlFor="reports">Reports</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="studies" id="studies" />
                <Label htmlFor="studies">Studies</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="podcasts" id="podcasts" />
                <Label htmlFor="podcasts">Podcasts</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Region Filter Selection */}
          <div className="space-y-2">
            <Label>Region Filter</Label>
            <RadioGroup
              value={regionFilter}
              onValueChange={(value: RegionFilter) => setRegionFilter(value)}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="region-all" />
                <Label htmlFor="region-all">All Regions</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="mainland" id="region-mainland" />
                <Label htmlFor="region-mainland">Mainland (CN+HK+TW)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="global" id="region-global" />
                <Label htmlFor="region-global">Global (Exclude CN+HK+TW)</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="days-select">Time Period</Label>
              <Select
                value={days.toString()}
                onValueChange={(value) => {
                  setDays(parseInt(value));
                  setCustomDays("");
                }}
              >
                <SelectTrigger className="w-[180px]" id="days-select">
                  <SelectValue placeholder="Select time period" />
                </SelectTrigger>
                <SelectContent>
                  {DAY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-days">Or Custom Days</Label>
              <Input
                id="custom-days"
                type="number"
                placeholder="e.g., 45"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                className="w-[120px]"
                min="1"
                max="365"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="limit-select">Top Results</Label>
              <Select
                value={limit.toString()}
                onValueChange={(value) => {
                  setLimit(parseInt(value));
                }}
              >
                <SelectTrigger className="w-[120px]" id="limit-select">
                  <SelectValue placeholder="Select limit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">Top 10</SelectItem>
                  <SelectItem value="20">Top 20</SelectItem>
                  <SelectItem value="50">Top 50</SelectItem>
                  <SelectItem value="100">Top 100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => {
                const actualDays = customDays ? parseInt(customDays) : days;
                fetchData(actualDays, limit, viewType, regionFilter);
              }}
              disabled={isLoading}
            >
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Content Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Top{" "}
            {viewType === "reports"
              ? "Reports"
              : viewType === "studies"
                ? "Studies"
                : "Podcasts"}{" "}
            by Users ({actualDays} day
            {actualDays !== 1 ? "s" : ""}) - Showing {limit} results
          </CardTitle>
        </CardHeader>
        <CardContent>
          {viewType === "reports" ? (
            <ReportsList data={topPageViews} isLoading={isLoading} />
          ) : viewType === "studies" ? (
            <StudiesList data={topStudyViews} isLoading={isLoading} />
          ) : (
            <PodcastsList data={topPodcastViews} isLoading={isLoading} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
