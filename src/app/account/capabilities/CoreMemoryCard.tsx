"use client";

import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { useLocale } from "next-intl";

export interface CoreMemoryCardProps {
  core: string;
  updatedAt: Date;
  onClick: () => void;
}

export function CoreMemoryCard({ core, updatedAt, onClick }: CoreMemoryCardProps) {
  const locale = useLocale();
  const preview = core.length > 150 ? core.substring(0, 150) + "..." : core;

  return (
    <Card className="cursor-pointer hover:bg-muted/50 transition-colors p-4" onClick={onClick}>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {preview || "No core memory content"}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatDate(updatedAt, locale)}</span>
        </div>
      </div>
    </Card>
  );
}
