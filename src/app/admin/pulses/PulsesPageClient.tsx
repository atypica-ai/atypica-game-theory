"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ExtractServerActionData } from "@/lib/serverAction";
import { throwServerActionError } from "@/lib/serverAction";
import {
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  TrashIcon,
  TrendingUpIcon,
  XCircleIcon,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  createPulseCategory,
  deletePulseCategory,
  fetchPulseCategories,
  getAllAvailableDataSources,
  getPulseStatistics,
  triggerAllDataSourcesGathering,
  triggerDataSourceGathering,
  triggerExpirationTest,
  triggerHeatPipeline,
  updatePulseCategory,
} from "./actions";

type TPulseCategory = ExtractServerActionData<typeof fetchPulseCategories>[number];
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TPulseCategory | null>(null);
  const [formData, setFormData] = useState({ name: "", query: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [triggeringDataSource, setTriggeringDataSource] = useState<string | null>(null);
  const [triggeringAll, setTriggeringAll] = useState(false);
  const [processingHeat, setProcessingHeat] = useState(false);
  const [processingExpiration, setProcessingExpiration] = useState(false);

  const loadCategories = async () => {
    try {
      const result = await fetchPulseCategories();
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

  useEffect(() => {
    setIsLoading(true);
    Promise.all([loadCategories(), loadDataSources(), loadStatistics()]).finally(() => {
      setIsLoading(false);
    });
  }, []);

  const handleOpenDialog = (category?: TPulseCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({ name: category.name, query: category.query });
    } else {
      setEditingCategory(null);
      setFormData({ name: "", query: "" });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCategory(null);
    setFormData({ name: "", query: "" });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let result;
      if (editingCategory) {
        result = await updatePulseCategory(editingCategory.id, formData);
      } else {
        result = await createPulseCategory(formData);
      }

      if (!result.success) {
        throwServerActionError(result);
      }

      toast.success(editingCategory ? "Category updated" : "Category created");
      handleCloseDialog();
      await loadCategories();
    } catch {
      toast.error("Failed to save category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this category?")) {
      return;
    }

    try {
      const result = await deletePulseCategory(id);
      if (!result.success) {
        throwServerActionError(result);
      }

      toast.success("Category deleted");
      await loadCategories();
    } catch {
      toast.error("Failed to delete category");
    }
  };

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

  const handleTriggerHeatPipeline = async (categoryId?: number) => {
    setProcessingHeat(true);
    try {
      const result = await triggerHeatPipeline(categoryId);
      if (!result.success) {
        throwServerActionError(result);
      }

      toast.success(
        `HEAT pipeline completed: ${result.data.processed} processed, ${result.data.errors} errors`,
      );
      await loadStatistics();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to process HEAT pipeline";
      toast.error(errorMessage);
    } finally {
      setProcessingHeat(false);
    }
  };

  const handleTriggerExpiration = async (categoryId?: number) => {
    setProcessingExpiration(true);
    try {
      const result = await triggerExpirationTest(categoryId);
      if (!result.success) {
        throwServerActionError(result);
      }

      toast.success(`Expiration test completed: ${result.data.expired} expired, ${result.data.kept} kept`);
      await loadStatistics();
    } catch {
      toast.error("Failed to trigger expiration test");
    } finally {
      setProcessingExpiration(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pulse Marketplace</h1>
          <p className="text-muted-foreground">Manage pulse categories and test HEAT modules</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* Statistics Card */}
      <Card>
        <CardHeader>
          <CardTitle>Pulse Statistics</CardTitle>
          <CardDescription>Overview of pulse data and HEAT scores</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2Icon className="h-6 w-6 animate-spin" />
            </div>
          ) : statistics ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold">{statistics.total}</div>
                <div className="text-sm text-muted-foreground">Total Pulses</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold">{statistics.withHeat}</div>
                <div className="text-sm text-muted-foreground">With HEAT Score</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold">{statistics.expired}</div>
                <div className="text-sm text-muted-foreground">Expired</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold">{statistics.recentPulses.length}</div>
                <div className="text-sm text-muted-foreground">Recent Pulses</div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* HEAT Modules Testing */}
      <Card>
        <CardHeader>
          <CardTitle>HEAT Modules</CardTitle>
          <CardDescription>Test HEAT calculation and expiration modules</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg space-y-3">
              <div>
                <h3 className="font-semibold mb-1">HEAT Calculation Pipeline</h3>
                <p className="text-sm text-muted-foreground">
                  Fix identity → Gather posts → Calculate HEAT → Generate description
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  onClick={() => handleTriggerHeatPipeline()}
                  disabled={processingHeat || processingExpiration}
                  className="flex-1"
                >
                  {processingHeat ? (
                    <>
                      <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <TrendingUpIcon className="h-4 w-4 mr-2" />
                      Run HEAT Pipeline
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="p-4 border rounded-lg space-y-3">
              <div>
                <h3 className="font-semibold mb-1">Expiration Test</h3>
                <p className="text-sm text-muted-foreground">
                  Calculate HEAT delta → Apply expiration test → Mark expired pulses
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  onClick={() => handleTriggerExpiration()}
                  disabled={processingHeat || processingExpiration}
                  className="flex-1"
                >
                  {processingExpiration ? (
                    <>
                      <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <XCircleIcon className="h-4 w-4 mr-2" />
                      Run Expiration Test
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Pulses */}
      {statistics && statistics.recentPulses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Pulses</CardTitle>
            <CardDescription>Latest pulses with HEAT data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {statistics.recentPulses.map((pulse) => (
                <div
                  key={pulse.id}
                  className={`p-3 border rounded-lg ${pulse.expired ? "opacity-50" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{pulse.title}</h4>
                        {pulse.expired && (
                          <span className="text-xs px-2 py-0.5 bg-muted rounded">Expired</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {pulse.categoryName} • {pulse.postCount} posts
                      </p>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        {pulse.heatScore !== null && (
                          <span>HEAT: {pulse.heatScore.toFixed(0)}</span>
                        )}
                        {pulse.heatDelta !== null && (
                          <span className={pulse.heatDelta >= 0 ? "text-green-600" : "text-red-600"}>
                            Δ: {pulse.heatDelta >= 0 ? "+" : ""}
                            {pulse.heatDelta.toFixed(0)}
                          </span>
                        )}
                        <span>
                          {new Date(pulse.createdAt).toLocaleDateString()}{" "}
                          {new Date(pulse.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* DataSource Management */}
      <Card>
        <CardHeader>
          <CardTitle>Data Sources</CardTitle>
          <CardDescription>Trigger pulse gathering from data sources</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Group xTrend categories */}
          {dataSources.some((ds) => ds.isCategory && ds.baseName === "xTrend") && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">xTrend Categories</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTriggerDataSource("xTrend")}
                  disabled={triggeringDataSource !== null || triggeringAll}
                >
                  {triggeringDataSource === "xTrend" ? (
                    <>
                      <Loader2Icon className="h-3 w-3 mr-1 animate-spin" />
                      Gathering All...
                    </>
                  ) : (
                    <>
                      <RefreshCwIcon className="h-3 w-3 mr-1" />
                      Trigger All xTrend
                    </>
                  )}
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {dataSources
                  .filter((ds) => ds.isCategory && ds.baseName === "xTrend")
                  .map((ds) => {
                    const category = categories.find((c) => c.name === ds.categoryName);
                    return (
                      <div
                        key={ds.name}
                        className="border rounded-lg p-3 space-y-2 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{ds.categoryName}</h4>
                            {category?.query && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {category.query}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handleTriggerDataSource(ds.name)}
                          disabled={triggeringDataSource === ds.name || triggeringAll}
                        >
                          {triggeringDataSource === ds.name ? (
                            <>
                              <Loader2Icon className="h-3 w-3 mr-1 animate-spin" />
                              Gathering...
                            </>
                          ) : (
                            <>
                              <RefreshCwIcon className="h-3 w-3 mr-1" />
                              Trigger
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Other dataSources (non-category) */}
          {dataSources.some((ds) => !ds.isCategory) && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Other Data Sources</h3>
              <div className="flex flex-wrap gap-2">
                {dataSources
                  .filter((ds) => !ds.isCategory)
                  .map((ds) => (
                    <Button
                      key={ds.name}
                      variant="outline"
                      onClick={() => handleTriggerDataSource(ds.name)}
                      disabled={triggeringDataSource === ds.name || triggeringAll}
                    >
                      {triggeringDataSource === ds.name ? (
                        <>
                          <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                          Gathering...
                        </>
                      ) : (
                        <>
                          <RefreshCwIcon className="h-4 w-4 mr-2" />
                          Trigger {ds.name}
                        </>
                      )}
                    </Button>
                  ))}
              </div>
            </div>
          )}

          {/* Trigger All Button */}
          <div className="pt-4 border-t">
            <Button
              variant="default"
              className="w-full"
              onClick={handleTriggerAll}
              disabled={triggeringAll || triggeringDataSource !== null}
            >
              {triggeringAll ? (
                <>
                  <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                  Gathering All Data Sources...
                </>
              ) : (
                <>
                  <RefreshCwIcon className="h-4 w-4 mr-2" />
                  Trigger All Data Sources
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Categories List */}
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>
            Manage categories for xTrend dataSource (categories with queries)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2Icon className="h-6 w-6 animate-spin" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No categories found. Create one to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{category.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{category.query}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {category.pulseCount} pulse{category.pulseCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(category)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(category.id)}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Update category name and query for xTrend dataSource"
                : "Create a new category with query for xTrend dataSource"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Category Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., AI Tech, Fashion & Beauty"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="query">Query</Label>
                <Textarea
                  id="query"
                  value={formData.query}
                  onChange={(e) => setFormData({ ...formData, query: e.target.value })}
                  placeholder="Query string for xTrend dataSource"
                  required
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  This query will be used by xTrend to gather pulses from X/Twitter
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : editingCategory ? (
                  "Update"
                ) : (
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
