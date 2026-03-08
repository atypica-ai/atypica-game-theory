"use client";

import { LineChart, Line, XAxis, ResponsiveContainer } from "recharts";
import { useTranslations } from "next-intl";

interface HeatHistoryPoint {
  date: string;
  heatScore: number;
}

interface MiniHeatChartProps {
  data: HeatHistoryPoint[] | undefined;
}

/**
 * Mini line chart showing last 5 days of HEAT score history
 * Finviz style: white line on dark background, minimal styling
 */
export function MiniHeatChart({ data }: MiniHeatChartProps) {
  const t = useTranslations("Pulse");

  if (!data || data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        {t("noHistory")}
      </div>
    );
  }

  const last5Days = data.slice(-5);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={last5Days} margin={{ top: 2, right: 2, bottom: 15, left: 2 }}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 9, fill: "#9ca3af" }}
          tickFormatter={formatDate}
          stroke="transparent"
          height={20}
          axisLine={false}
        />
        <Line
          type="monotone"
          dataKey="heatScore"
          stroke="white"
          strokeWidth={2}
          dot={false}
          activeDot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
