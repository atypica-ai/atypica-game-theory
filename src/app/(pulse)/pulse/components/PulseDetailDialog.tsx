"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "@/lib/utils";
import { XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
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
  const t = useTranslations("Pulse");
  if (!pulse) return null;

  const chartData = (pulse.history ?? [])
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-5)
    .map((point) => ({
      date: new Date(point.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      heat: point.heatScore,
    }));

  // Compute Y domain with padding so flat lines are visible
  const heatValues = chartData.map((d) => d.heat);
  const minHeat = Math.min(...heatValues);
  const maxHeat = Math.max(...heatValues);
  const yPadding = minHeat === maxHeat ? Math.max(minHeat * 0.1, 10) : 0;
  const yDomain: [number, number] = [
    Math.max(0, Math.floor(minHeat - yPadding)),
    Math.ceil(maxHeat + yPadding),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 space-y-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {pulse.category}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(pulse.createdAt))}
            </span>
          </div>

          <DialogHeader>
            <DialogTitle className="text-sm font-semibold leading-snug pr-8 break-words">
              {pulse.title}
            </DialogTitle>
          </DialogHeader>

          {pulse.heatScore !== undefined && (
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-border px-3 py-2">
                <div className="text-xs text-muted-foreground mb-0.5">{t("heatScore")}</div>
                <div className="text-sm font-semibold">{Math.round(pulse.heatScore).toLocaleString()}</div>
              </div>
              {pulse.heatDelta !== null && pulse.heatDelta !== undefined && (
                <div className="rounded-lg border border-border px-3 py-2">
                  <div className="text-xs text-muted-foreground mb-0.5">{t("change")}</div>
                  <div
                    className={cn(
                      "text-sm font-semibold",
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

        {/* Content - Scrollable */}
        <div className="px-6 pb-4 space-y-6 flex-1 overflow-y-auto">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {pulse.content}
          </p>

          {/* Heat Trend Chart */}
          {chartData.length >= 2 ? (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground font-medium">
                {t("heatTrend")}
              </div>
              <div className="h-40 rounded-lg border border-border p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "currentColor", fontSize: 10, opacity: 0.5 }}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                    />
                    <YAxis
                      domain={yDomain}
                      tick={{ fill: "currentColor", fontSize: 10, opacity: 0.5 }}
                      tickLine={false}
                      axisLine={false}
                      width={40}
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
                    />
                    <Area
                      type="monotone"
                      dataKey="heat"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      fill="currentColor"
                      fillOpacity={0.06}
                      dot={{
                        fill: "currentColor",
                        fillOpacity: 1,
                        r: 3,
                        stroke: "none",
                      }}
                      activeDot={{
                        fill: "currentColor",
                        fillOpacity: 1,
                        r: 4,
                        stroke: "none",
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-muted-foreground">
              {t("noHistoricalData")}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-border flex-shrink-0">
          <Button
            onClick={() => {
              if (onStartResearch) {
                onStartResearch(pulse.id);
              }
            }}
            size="sm"
          >
            <SparklesIcon className="h-3.5 w-3.5" />
            {t("startResearch")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
