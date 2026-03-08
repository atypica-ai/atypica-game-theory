"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ExtractServerActionData, throwServerActionError } from "@/lib/serverAction";
import { Loader2Icon, PlayIcon, RefreshCwIcon, TrendingUpIcon, XCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getAllAvailableDataSources,
  getDistinctCategories,
  getPulseStatistics,
  getXTrendCategoryConfig,
  triggerAllDataSourcesGathering,
  triggerDataSourceGathering,
  triggerExpirationTest,
  triggerFullPipeline,
  triggerHeatPipeline,
  updateXTrendCategoryConfig,
} from "./actions";

type TPulseCategory = ExtractServerActionData<typeof getDistinctCategories>[number];
type TDataSource = ExtractServerActionData<typeof getAllAvailableDataSources>[number];
type TPulseStatistics = ExtractServerActionData<typeof getPulseStatistics>;

interface PulsesPageClientProps {
  initialSearchParams: Record<string, string | number | boolean>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function PulsesPageClient({ initialSearchParams }: PulsesPageClientProps) {
  const [categories, setCategories] = useState<TPulseCategory[]>([]);
  const [dataSources, setDataSources] = useState<TDataSource[]>([]);
  const [statistics, setStatistics] = useState<TPulseStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [triggeringDataSource, setTriggeringDataSource] = useState<string | null>(null);
  const [triggeringAll, setTriggeringAll] = useState(false);
  const [runningFullPipeline, setRunningFullPipeline] = useState(false);
  const [processingHeat, setProcessingHeat] = useState(false);
  const [processingExpiration, setProcessingExpiration] = useState(false);
  const [categoryConfigJson, setCategoryConfigJson] = useState<string>("");
  const [categoryConfigError, setCategoryConfigError] = useState<string | null>(null);
  const [savingCategoryConfig, setSavingCategoryConfig] = useState(false);

  const loadCategories = async () => {
    try {
      const result = await getDistinctCategories();
      if (!result.success) {
        throwServerActionError(result);
      }
      setCategories(result.data);
    } catch {
      toast.error("Failed to load categories");
    }
  };

  const loadDataSources = async () => {
    try {
      const result = await getAllAvailableDataSources();
      if (!result.success) {
        throwServerActionError(result);
      }
      setDataSources(result.data);
    } catch {
      toast.error("Failed to load dataSources");
    }
  };

  const loadStatistics = async () => {
    try {
      const result = await getPulseStatistics();
      if (!result.success) {
        throwServerActionError(result);
      }
      setStatistics(result.data);
    } catch {
      toast.error("Failed to load statistics");
    }
  };

  const loadCategoryConfig = async () => {
    try {
      const result = await getXTrendCategoryConfig();
      if (result.success) {
        const categories = result.data.categories;
        if (categories.length > 0) {
          setCategoryConfigJson(JSON.stringify(categories, null, 2));
        } else {
          // Show suggested starter config when no categories are configured
          setCategoryConfigJson(
            JSON.stringify(
              [
                {
                  name: "AI Tech",
                  query: "AI agents OR LLM OR Claude OR GPT OR OpenAI OR Anthropic OR Gemini",
                },
                {
                  name: "Creator Economy",
                  query:
                    "creator economy OR newsletter OR indie hacker OR solopreneur OR build in public",
                },
                {
                  name: "Consumer Trends",
                  query: "trending product OR viral brand OR consumer behavior OR Gen Z shopping",
                },
                {
                  name: "Web3 & Crypto",
                  query: "crypto OR DeFi OR NFT OR blockchain OR Bitcoin OR Ethereum",
                },
              ],
              null,
              2,
            ),
          );
        }
      }
    } catch {
      toast.error("Failed to load category config");
    }
  };

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      loadCategories(),
      loadDataSources(),
      loadStatistics(),
      loadCategoryConfig(),
    ]).finally(() => {
      setIsLoading(false);
    });
  }, []);

  const handleTriggerDataSource = async (dataSourceName: string) => {
    setTriggeringDataSource(dataSourceName);
    try {
      const result = await triggerDataSourceGathering(dataSourceName);
      if (!result.success) {
        throwServerActionError(result);
      }

      toast.success(`Gathered ${result.data.pulseCount} pulses from ${dataSourceName}`);
      await Promise.all([loadCategories(), loadDataSources(), loadStatistics()]);
    } catch {
      toast.error(`Failed to trigger ${dataSourceName}`);
    } finally {
      setTriggeringDataSource(null);
    }
  };

  const handleTriggerAll = async () => {
    setTriggeringAll(true);
    try {
      const result = await triggerAllDataSourcesGathering();
      if (!result.success) {
        throwServerActionError(result);
      }

      toast.success(`Gathered ${result.data.totalPulses} pulses from all dataSources`);
      await Promise.all([loadCategories(), loadDataSources(), loadStatistics()]);
    } catch {
      toast.error("Failed to trigger all dataSources");
    } finally {
      setTriggeringAll(false);
    }
  };

  const handleTriggerHeatPipeline = async (category?: string) => {
    setProcessingHeat(true);
    try {
      const result = await triggerHeatPipeline(category);
      if (!result.success) {
        throwServerActionError(result);
      }

      toast.success(
        `HEAT pipeline completed: ${result.data.processed} processed, ${result.data.errors} errors`,
      );
      await loadStatistics();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to process HEAT pipeline";
      toast.error(errorMessage);
    } finally {
      setProcessingHeat(false);
    }
  };

  const handleRunFullPipeline = async () => {
    setRunningFullPipeline(true);
    try {
      const result = await triggerFullPipeline();
      if (!result.success) {
        throwServerActionError(result);
      }
      const { totalPulses, heatProcessed, heatErrors, expired, kept } = result.data;
      toast.success(
        `Pipeline done: ${totalPulses} gathered, ${heatProcessed} HEAT scored (${heatErrors} errors), ${expired} expired / ${kept} kept`,
      );
      await Promise.all([loadCategories(), loadDataSources(), loadStatistics()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Pipeline failed");
    } finally {
      setRunningFullPipeline(false);
    }
  };

  const handleSaveCategoryConfig = async () => {
    setCategoryConfigError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(categoryConfigJson);
    } catch {
      setCategoryConfigError("Invalid JSON");
      return;
    }
    if (
      !Array.isArray(parsed) ||
      parsed.some((c) => typeof c.name !== "string" || typeof c.query !== "string")
    ) {
      setCategoryConfigError('Must be an array of { "name": string, "query": string }');
      return;
    }
    setSavingCategoryConfig(true);
    try {
      const result = await updateXTrendCategoryConfig(parsed as { name: string; query: string }[]);
      if (!result.success) {
        throwServerActionError(result);
      }
      toast.success("Category config saved");
      await loadDataSources();
    } catch {
      toast.error("Failed to save category config");
    } finally {
      setSavingCategoryConfig(false);
    }
  };

  const handleTriggerExpiration = async (category?: string) => {
    setProcessingExpiration(true);
    try {
      const result = await triggerExpirationTest(category);
      if (!result.success) {
        throwServerActionError(result);
      }

      toast.success(
        `Expiration test completed: ${result.data.expired} expired, ${result.data.kept} kept`,
      );
      await loadStatistics();
    } catch {
      toast.error("Failed to trigger expiration test");
    } finally {
      setProcessingExpiration(false);
    }
  };

  const anyBusy =
    runningFullPipeline ||
    processingHeat ||
    processingExpiration ||
    triggeringAll ||
    triggeringDataSource !== null;

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-base font-semibold">Pulse</h1>
        <p className="text-sm text-muted-foreground">管理数据源和触发 pipeline</p>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
          Loading...
        </div>
      ) : (
        statistics && (
          <div className="flex gap-6 text-sm">
            <span>
              <span className="font-medium">{statistics.total}</span>{" "}
              <span className="text-muted-foreground">total</span>
            </span>
            <span>
              <span className="font-medium">{statistics.withHeat}</span>{" "}
              <span className="text-muted-foreground">with HEAT</span>
            </span>
            <span>
              <span className="font-medium">{statistics.expired}</span>{" "}
              <span className="text-muted-foreground">expired</span>
            </span>
          </div>
        )
      )}

      {/* Pipeline actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Full pipeline */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Full Pipeline</p>
              <p className="text-xs text-muted-foreground">Gather → HEAT → Expiration</p>
            </div>
            <Button size="sm" onClick={handleRunFullPipeline} disabled={anyBusy}>
              {runningFullPipeline ? (
                <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PlayIcon className="h-3.5 w-3.5" />
              )}
              <span className="ml-1.5">{runningFullPipeline ? "Running..." : "Run"}</span>
            </Button>
          </div>

          <div className="border-t" />

          {/* Individual steps */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">HEAT Pipeline</p>
              <p className="text-xs text-muted-foreground">
                Gather posts → Calculate HEAT → Generate description
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleTriggerHeatPipeline()}
              disabled={anyBusy}
            >
              {processingHeat ? (
                <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <TrendingUpIcon className="h-3.5 w-3.5" />
              )}
              <span className="ml-1.5">{processingHeat ? "Running..." : "Run"}</span>
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Expiration Test</p>
              <p className="text-xs text-muted-foreground">
                Apply delta threshold → Mark expired pulses
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleTriggerExpiration()}
              disabled={anyBusy}
            >
              {processingExpiration ? (
                <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircleIcon className="h-3.5 w-3.5" />
              )}
              <span className="ml-1.5">{processingExpiration ? "Running..." : "Run"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Sources */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Data Sources</CardTitle>
            <Button size="sm" variant="outline" onClick={handleTriggerAll} disabled={anyBusy}>
              {triggeringAll ? (
                <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCwIcon className="h-3.5 w-3.5" />
              )}
              <span className="ml-1.5">{triggeringAll ? "Gathering..." : "Trigger All"}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {dataSources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data sources configured.</p>
          ) : (
            <div className="space-y-1">
              {dataSources.map((ds) => (
                <div key={ds.name} className="flex items-center justify-between py-1.5">
                  <span className="text-sm">{ds.isCategory ? ds.categoryName : ds.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => handleTriggerDataSource(ds.name)}
                    disabled={anyBusy}
                  >
                    {triggeringDataSource === ds.name ? (
                      <Loader2Icon className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCwIcon className="h-3 w-3" />
                    )}
                    <span className="ml-1">
                      {triggeringDataSource === ds.name ? "..." : "Trigger"}
                    </span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* xTrend Category Config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">xTrend Categories</CardTitle>
          <CardDescription className="text-xs">
            {`JSON 数组，每项包含 "name" 和 "query"。保存后 Data Sources 自动更新。`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={categoryConfigJson}
            onChange={(e) => {
              setCategoryConfigJson(e.target.value);
              setCategoryConfigError(null);
            }}
            className="font-mono text-xs min-h-40 resize-y"
            placeholder='[{"name": "AI Tech", "query": "AI agents OR LLM OR Claude OR GPT"}]'
          />
          {categoryConfigError && <p className="text-xs text-destructive">{categoryConfigError}</p>}
          <Button size="sm" onClick={handleSaveCategoryConfig} disabled={savingCategoryConfig}>
            {savingCategoryConfig && <Loader2Icon className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Save
          </Button>
        </CardContent>
      </Card>

      {/* Categories in DB */}
      {categories.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Categories in DB</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <div
                  key={cat.category}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-xs"
                >
                  <span className="font-medium">{cat.category}</span>
                  <span className="text-muted-foreground">{cat.pulseCount}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Pulses */}
      {statistics && statistics.recentPulses.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Recent Pulses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {statistics.recentPulses.map((pulse) => (
                <div
                  key={pulse.id}
                  className={`flex items-start justify-between py-1.5 ${pulse.expired ? "opacity-40" : ""}`}
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm truncate">{pulse.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {pulse.categoryName} · {pulse.postCount} posts
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    {pulse.heatScore !== null && <span>{pulse.heatScore.toFixed(0)}</span>}
                    {pulse.heatDelta !== null && (
                      <span
                        className={
                          pulse.heatDelta >= 0 ? "text-foreground" : "text-muted-foreground"
                        }
                      >
                        {pulse.heatDelta >= 0 ? "+" : ""}
                        {(pulse.heatDelta * 100).toFixed(0)}%
                      </span>
                    )}
                    {pulse.expired && (
                      <span className="px-1.5 py-0.5 rounded bg-muted">expired</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
