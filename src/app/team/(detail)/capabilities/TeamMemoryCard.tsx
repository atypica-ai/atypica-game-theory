"use client";

import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { useLocale } from "next-intl";

interface MemoryData {
  core: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface TeamMemoryCardProps {
  memory: MemoryData;
  onClick: () => void;
}

export function TeamMemoryCard({ memory, onClick }: TeamMemoryCardProps) {
  const locale = useLocale();
  const preview = memory.core.length > 150 ? memory.core.substring(0, 150) + "..." : memory.core;

  return (
    <Card className="cursor-pointer hover:bg-muted/50 transition-colors p-4" onClick={onClick}>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {preview || "No memory content"}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatDate(memory.updatedAt, locale)}</span>
        </div>
      </div>
    </Card>
  );
}
