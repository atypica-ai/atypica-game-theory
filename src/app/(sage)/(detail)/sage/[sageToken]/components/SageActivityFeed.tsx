"use client";

import { fetchSageActivitiesAction } from "@/app/(sage)/(detail)/actions";
import { useSageContext } from "@/app/(sage)/(detail)/hooks/SageContext";
import type { SageActivity } from "@/app/(sage)/(detail)/types";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  ClockIcon,
  Database,
  FileText,
  Loader2Icon,
  Mic,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";

// Icon name to component mapping
const iconMap: Record<string, ReactNode> = {
  CheckCircle2: <CheckCircle2 className="size-4" />,
  FileText: <FileText className="size-4" />,
  Sparkles: <Sparkles className="size-4" />,
  AlertTriangle: <AlertTriangle className="size-4" />,
  Database: <Database className="size-4" />,
  Mic: <Mic className="size-4" />,
};

function getIconComponent(iconName: string): ReactNode {
  return iconMap[iconName] || <FileText className="size-4" />;
}

function getIconColor(type: "info" | "success" | "warning" | "error"): string {
  switch (type) {
    case "success":
      return "text-green-600";
    case "warning":
      return "text-yellow-600";
    case "error":
      return "text-red-600";
    default:
      return "text-blue-600";
  }
}

export function SageActivityFeed() {
  const t = useTranslations("Sage.ActivityFeed");
  const { sage, processingStatus } = useSageContext();
  const [activities, setActivities] = useState<SageActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      setIsLoading(true);
      try {
        const result = await fetchSageActivitiesAction(sage.token);
        if (result.success) {
          setActivities(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch activities:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchActivities();
  }, [sage.token, processingStatus]);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const displayActivities = activities.slice(0, 10); // Limit to 10 recent items

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col space-y-1.5 p-3">
        <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2">
          <ClockIcon className="size-4 text-muted-foreground" />
          {t("activityFeed")}
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {displayActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <p className="text-sm text-muted-foreground">{t("recentActivity")}</p>
            <p className="text-xs text-muted-foreground/60 mt-1">No activities yet</p>
          </div>
        ) : (
          <div className="relative space-y-6">
            {/* Timeline Line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-muted -z-10" />

            {displayActivities.map((activity) => {
              const iconComponent = getIconComponent(activity.icon);
              const iconColor = getIconColor(activity.type);

              return (
                <div key={activity.id} className="relative pl-9 group">
                  {/* Timeline Dot */}
                  <div
                    className={cn(
                      "absolute left-0 top-0 size-6 rounded-full border bg-background flex items-center justify-center shadow-sm transition-colors",
                      "group-hover:border-primary/50",
                      iconColor,
                    )}
                  >
                    {iconComponent}
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium leading-none">{activity.title}</span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">
                      {activity.description}
                    </p>
                    {activity.link && (
                      <Link
                        href={activity.link.href}
                        className="text-[10px] font-medium text-primary hover:underline mt-0.5 inline-block"
                      >
                        {activity.link.label} →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
