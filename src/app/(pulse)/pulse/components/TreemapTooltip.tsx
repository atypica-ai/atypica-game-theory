"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { MiniHeatChart } from "./MiniHeatChart";
import { getHeatDeltaColorClass } from "../lib/treemapColors";
import { useTranslations } from "next-intl";

interface Pulse {
  id: number;
  title: string;
  category: { name: string };
  heatScore: number | null;
  heatDelta: number | null;
  createdAt: Date;
}

interface HeatHistoryPoint {
  date: string;
  heatScore: number;
}

interface TreemapTooltipProps {
  pulse: Pulse;
  heatHistory: Record<number, HeatHistoryPoint[]>;
  position: { x: number; y: number };
}

/**
 * Tooltip component for treemap tiles - Finviz Style
 * Prominent white border (2-3px), dark background, positioned dynamically
 */
export function TreemapTooltip({ pulse, heatHistory, position }: TreemapTooltipProps) {
  const t = useTranslations("PulsePage");
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const history = heatHistory[pulse.id];
  const deltaColor = getHeatDeltaColorClass(pulse.heatDelta ?? 0);

  // Adjust position to avoid overflow - Finviz style: tooltip offset from cursor
  useEffect(() => {
    const tooltipWidth = 320;
    const tooltipHeight = 220;
    const offset = 15; // Offset from cursor (Finviz style)

    let x = position.x + offset;
    let y = position.y + offset;

    // Adjust horizontal position if tooltip would overflow right edge
    if (x + tooltipWidth > window.innerWidth - 10) {
      x = position.x - tooltipWidth - offset;
    }

    // Adjust vertical position if tooltip would overflow bottom edge
    if (y + tooltipHeight > window.innerHeight - 10) {
      y = position.y - tooltipHeight - offset;
    }

    // Ensure tooltip doesn't go off left or top edges
    x = Math.max(10, x);
    y = Math.max(10, y);

    setAdjustedPosition({ x, y });
  }, [position]);

  return (
    <div
      className="pointer-events-none fixed z-[9999]"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      {/* Finviz-style tooltip: prominent white border (2-3px), dark background */}
      <div className="rounded-sm border-[3px] border-white bg-[#0d1117] p-3 min-w-[280px]">
        <div className="space-y-2.5">
          {/* Title and Category - Finviz style */}
          <div>
            <h3 className="text-sm font-bold text-white" style={{ fontFamily: "var(--font-CentralGothic), 'Inter', sans-serif" }}>
              {pulse.title}
            </h3>
            <div className="text-xs text-white/50 mt-0.5" style={{ fontFamily: "var(--font-CentralGothic), 'Inter', sans-serif" }}>
              {pulse.category.name}
            </div>
          </div>

          {/* HEAT Score and Delta - Grid layout */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-white/50 mb-0.5" style={{ fontFamily: "var(--font-CentralGothic), 'Inter', sans-serif" }}>
                {t("heatScore")}
              </div>
              <div className="font-bold text-white text-base" style={{ fontFamily: "var(--font-CentralGothic), 'Inter', sans-serif" }}>
                {pulse.heatScore?.toFixed(0) ?? "N/A"}
              </div>
            </div>
            <div>
              <div className="text-white/50 mb-0.5" style={{ fontFamily: "var(--font-CentralGothic), 'Inter', sans-serif" }}>
                {t("change")}
              </div>
              <div className="flex items-center gap-1">
                {(() => {
                  if (pulse.heatDelta === null) {
                    return <span className="text-white/40 font-bold text-base" style={{ fontFamily: "var(--font-CentralGothic), 'Inter', sans-serif" }}>N/A</span>;
                  }

                  const previousScore = pulse.heatScore !== null ? pulse.heatScore - pulse.heatDelta : null;

                  // Calculate percentage change
                  let percentChange: number | null = null;
                  if (previousScore !== null && Math.abs(previousScore) > 0.1) {
                    percentChange = (pulse.heatDelta / previousScore) * 100;
                    // Cap extreme values for display
                    percentChange = Math.max(-999, Math.min(999, percentChange));
                  }

                  // Determine direction and icon
                  let icon = "→";
                  let colorClass = "text-white/40";

                  if (pulse.heatDelta > 0.5) {
                    icon = "↑";
                    colorClass = "text-white";
                  } else if (pulse.heatDelta < -0.5) {
                    icon = "↓";
                    colorClass = "text-red-400";
                  }

                  return (
                    <>
                      <span className={cn("font-bold text-lg leading-none", colorClass)} style={{ fontFamily: "var(--font-CentralGothic), 'Inter', sans-serif" }}>
                        {icon}
                      </span>
                      <div className="flex flex-col">
                        <span className={cn("font-bold text-base leading-tight", colorClass)} style={{ fontFamily: "var(--font-CentralGothic), 'Inter', sans-serif" }}>
                          {percentChange !== null
                            ? `${percentChange > 0 ? "+" : ""}${percentChange.toFixed(1)}%`
                            : pulse.heatDelta > 0 ? "+New" : "New"
                          }
                        </span>
                        <span className={cn("text-[10px] leading-tight", colorClass)} style={{ fontFamily: "var(--font-CentralGothic), 'Inter', sans-serif" }}>
                          {pulse.heatDelta > 0 ? "+" : ""}{pulse.heatDelta.toFixed(1)}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Mini Heat Chart - Last 5 Days */}
          <div className="pt-1">
            <div className="mb-1.5 text-xs text-white/50" style={{ fontFamily: "var(--font-CentralGothic), 'Inter', sans-serif" }}>
              {t("last5Days")}
            </div>
            <div className="h-16 w-full bg-[#0f0f0f] rounded">
              <MiniHeatChart data={history} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
