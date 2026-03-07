"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { TriangleUpIcon, TriangleDownIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

interface PulseCardProps {
  pulse: {
    id: number;
    title: string;
    content: string;
    category: string;
    createdAt: Date;
    heatDelta?: number | null;
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
  const locale = useLocale();
  const t = useTranslations("PulsePage");
  const heatDelta = pulse.heatDelta;

  // Normalize heatDelta: handle number, string, null, undefined
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
    <Card
      data-pulse-id={pulse.id}
      onClick={onClick}
      className={cn(
        "transition-all duration-500 flex flex-col h-full",
        highlighted && "border-primary",
        onClick && "cursor-pointer"
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2 min-w-0">
          <CardTitle className="text-base font-semibold line-clamp-2 flex-1 min-w-0">
            {pulse.title}
          </CardTitle>
          <Badge variant="outline" className="shrink-0 text-xs max-w-[120px] truncate">
            {pulse.category}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <p className="text-sm text-muted-foreground line-clamp-3 flex-1 mb-3">
          {pulse.content}
        </p>
        <div className="flex items-center justify-between mt-auto gap-2">
          <div className="text-xs text-muted-foreground">
            {formatDate(pulse.createdAt, locale)}
          </div>
          {isNew ? (
            <div className="text-xs font-medium shrink-0 text-muted-foreground">
              {t("new")}
            </div>
          ) : hasDelta ? (
            <div
              className={cn(
                "flex items-center gap-1 text-xs font-medium shrink-0",
                isPositive && "text-foreground",
                isNegative && "text-destructive",
                isZero && "text-muted-foreground",
              )}
            >
              {isPositive && <TriangleUpIcon className="h-3 w-3" />}
              {isNegative && <TriangleDownIcon className="h-3 w-3" />}
              <span>{formatHeatDelta(heatDeltaNum)}</span>
            </div>
          ) : null}
        </div>
        {angle && (
          <div className="text-xs italic mt-2 text-muted-foreground">
            {angle}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
