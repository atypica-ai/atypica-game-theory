"use client";

import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { ChevronUpIcon, ChevronDownIcon, FlameIcon, CalendarDaysIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type HeatHistoryPoint = { date: string; heatScore: number };

interface PulseCardProps {
  pulse: {
    id: number;
    title: string;
    content: string;
    category: string;
    createdAt: Date;
    heatScore?: number;
    heatDelta?: number | null;
    history?: HeatHistoryPoint[];
  };
  angle?: string;
  highlighted?: boolean;
  onClick?: () => void;
}

function formatHeatDelta(delta: number | null | undefined): string {
  if (delta === null || delta === undefined) return "";
  const percentage = Math.round(delta * 100);
  if (percentage === 0) return "0%";
  return `${percentage > 0 ? "+" : ""}${percentage}%`;
}

export function PulseCard({ pulse, angle, highlighted, onClick }: PulseCardProps) {
  const t = useTranslations("Pulse");
  const heatDelta = pulse.heatDelta;

  let heatDeltaNum: number | null = null;
  if (typeof heatDelta === "number" && !isNaN(heatDelta) && isFinite(heatDelta)) {
    heatDeltaNum = heatDelta;
  } else if (typeof heatDelta === "string") {
    const parsed = parseFloat(heatDelta);
    if (!isNaN(parsed) && isFinite(parsed)) {
      heatDeltaNum = parsed;
    }
  }

  const hasDelta = heatDeltaNum !== null;
  const isNew = !hasDelta;
  const isPositive = hasDelta && heatDeltaNum! > 0;
  const isNegative = hasDelta && heatDeltaNum! < 0;
  const isZero = hasDelta && heatDeltaNum! === 0;
  return (
    <div
      data-pulse-id={pulse.id}
      onClick={onClick}
      className={cn(
        "border border-border rounded-lg p-4 flex flex-col gap-3 transition-all duration-300",
        "hover:border-foreground/20",
        highlighted && "border-primary",
        onClick && "cursor-pointer",
      )}
    >
      {/* Title + Category */}
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="text-sm font-semibold leading-snug line-clamp-2 flex-1 min-w-0">
          {pulse.title}
        </div>
        <Badge variant="outline" className="shrink-0 text-xs max-w-[120px] truncate">
          {pulse.category}
        </Badge>
      </div>

      {/* Content */}
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 flex-1">
        {pulse.content}
      </p>

      {/* Recommendation angle */}
      {angle && (
        <div className="text-xs italic text-muted-foreground">
          {angle}
        </div>
      )}

      {/* Footer: icon stats + delta */}
      <div className="flex items-center pt-3 border-t border-border text-xs text-muted-foreground gap-3">
        {pulse.heatScore !== undefined && pulse.heatScore > 0 && (
          <div className="flex items-center gap-1 shrink-0">
            <FlameIcon className="size-3" />
            <span>{Math.round(pulse.heatScore).toLocaleString()}</span>
          </div>
        )}
        {(pulse.history?.length ?? 0) > 0 && (
          <div className="flex items-center gap-1 shrink-0">
            <CalendarDaysIcon className="size-3" />
            <span>{pulse.history!.length}d</span>
          </div>
        )}

        {/* Delta — right-aligned */}
        <div className="ml-auto shrink-0">
          {isNew ? (
            <span className="text-xs font-medium text-muted-foreground">{t("new")}</span>
          ) : hasDelta ? (
            <span
              className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                isPositive && "text-foreground",
                isNegative && "text-destructive",
                isZero && "text-muted-foreground",
              )}
            >
              {isPositive && <ChevronUpIcon className="h-3 w-3" />}
              {isNegative && <ChevronDownIcon className="h-3 w-3" />}
              {formatHeatDelta(heatDeltaNum)}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
