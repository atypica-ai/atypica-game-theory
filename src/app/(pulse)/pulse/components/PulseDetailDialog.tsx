"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { SparklesIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type HeatHistoryPoint = { date: string; heatScore: number };

interface PulseDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pulse: {
    id: number;
    title: string;
    content: string;
    category: string;
    createdAt: Date;
    heatScore?: number;
    heatDelta?: number | null;
    history?: HeatHistoryPoint[];
  } | null;
  onStartResearch?: (pulseId: number) => void;
}

export function PulseDetailDialog({
  open,
  onOpenChange,
  pulse,
  onStartResearch,
}: PulseDetailDialogProps) {
  const t = useTranslations("PulsePage");
  if (!pulse) return null;

  // Prepare chart data - only show last 5 days
  let chartData = pulse.history
    ?.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-5)
    .map((point) => ({
      date: new Date(point.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      heat: point.heatScore,
    })) || [];

  // If no data or too little data, use mock data for visualization (5 days only)
  if (chartData.length < 2) {
    chartData = [
      { date: "Jan 20", heat: 580 },
      { date: "Jan 21", heat: 720 },
      { date: "Jan 22", heat: 690 },
      { date: "Jan 23", heat: 750 },
      { date: "Jan 24", heat: 820 },
    ];
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] p-0 gap-0 bg-card border-border flex flex-col overflow-hidden">
        {/* Header Section - Fixed */}
        <div className="p-8 space-y-6 flex-shrink-0">
          {/* Meta Tags */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-medium border-border text-muted-foreground uppercase tracking-wide">
              {pulse.category}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDate(pulse.createdAt, "en-US")}
            </span>
          </div>

          {/* Title */}
          <DialogHeader>
            <DialogTitle className="text-base font-semibold leading-tight pr-8 text-foreground break-words">
              {pulse.title}
            </DialogTitle>
          </DialogHeader>

          {/* Heat Metrics */}
          {pulse.heatScore !== undefined && (
            <div className="flex items-center gap-4">
              <div className="bg-muted border border-border rounded-xl px-4 py-3">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1 font-medium">{t("heatScore")}</div>
                <div className="text-2xl font-bold text-foreground">{Math.round(pulse.heatScore).toLocaleString()}</div>
              </div>
              {pulse.heatDelta !== null && pulse.heatDelta !== undefined && (
                <div className="bg-muted border border-border rounded-xl px-4 py-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1 font-medium">{t("change")}</div>
                  <div
                    className={cn(
                      "text-2xl font-bold",
                      pulse.heatDelta >= 0 ? "text-foreground" : "text-destructive"
                    )}
                  >
                    {pulse.heatDelta >= 0 ? "+" : ""}{(pulse.heatDelta * 100).toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content Section - Scrollable */}
        <div className="px-8 pb-6 space-y-8 flex-1 overflow-y-auto">
          {/* Description */}
          <div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {pulse.content}
            </p>
          </div>

          {/* Heat Score History Chart */}
          {chartData.length > 0 ? (
            <div className="space-y-3">
              <div className="inline-flex items-center bg-muted rounded-lg px-3 py-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  {t("heatTrend")}
                </span>
              </div>
              <div className="w-[500px] h-48 rounded-lg border border-border bg-card p-4 mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--foreground))"
                      tick={{ fill: "hsl(var(--foreground))", fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: "hsl(var(--foreground))", strokeWidth: 1 }}
                      interval={0}
                    />
                    <YAxis
                      stroke="hsl(var(--foreground))"
                      tick={{ fill: "hsl(var(--foreground))", fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: "hsl(var(--foreground))", strokeWidth: 1 }}
                      width={35}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                        color: "hsl(var(--popover-foreground))",
                        fontSize: "11px",
                        padding: "6px 10px",
                      }}
                      labelStyle={{
                        color: "hsl(var(--popover-foreground))",
                        fontWeight: 500,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="heat"
                      stroke="#808080"
                      strokeWidth={0.5}
                      strokeDasharray="4 2"
                      fill="transparent"
                      dot={{
                        fill: "hsl(var(--primary))",
                        fillOpacity: 1,
                        r: 3.5
                      }}
                      activeDot={{
                        fill: "hsl(var(--primary))",
                        fillOpacity: 1,
                        r: 5,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {t("noHistoricalData")}
            </div>
          )}
        </div>

        {/* Footer Action - Fixed */}
        <div className="flex items-center justify-end px-8 py-6 border-t border-border flex-shrink-0">
          <Button
            onClick={() => {
              if (onStartResearch) {
                onStartResearch(pulse.id);
              }
            }}
            className="gap-2"
            size="default"
          >
            <SparklesIcon className="h-4 w-4" />
            {t("startResearch")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
