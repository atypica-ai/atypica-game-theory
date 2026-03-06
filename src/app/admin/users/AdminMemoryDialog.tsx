"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { EyeIcon, RefreshCwIcon } from "lucide-react";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { fetchMemoryForOwner, reorganizeMemoryVersion } from "./actions";

export function AdminMemoryDialog({
  userId,
  teamId,
  label,
  open,
  onOpenChange,
}: {
  userId?: number;
  teamId?: number;
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const locale = useLocale();
  const [memory, setMemory] = useState<{
    version: number;
    core: string;
    working: string[];
    changeNotes: string;
    createdAt: Date;
    updatedAt: Date;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReorganizing, setIsReorganizing] = useState(false);
  const [error, setError] = useState("");
  const [viewType, setViewType] = useState<"core" | "working">("core");

  const fetchData = useCallback(async () => {
    if (!userId && !teamId) return;
    setIsLoading(true);
    setError("");
    const result = await fetchMemoryForOwner({ userId, teamId });
    if (result.success) {
      setMemory(result.data ?? null);
    } else {
      setError(result.message ?? "Failed to fetch memory");
    }
    setIsLoading(false);
  }, [userId, teamId]);

  useEffect(() => {
    if (open) {
      setViewType("core");
      fetchData();
    }
  }, [open, fetchData]);

  const handleReorganize = async () => {
    setIsReorganizing(true);
    setError("");
    const result = await reorganizeMemoryVersion({ userId, teamId });
    if (result.success) {
      await fetchData();
    } else {
      setError(result.message ?? "Failed to reorganize");
    }
    setIsReorganizing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl lg:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Memory — {label}</DialogTitle>
          <DialogDescription>
            {memory
              ? `Version ${memory.version} · Updated ${formatDate(memory.updatedAt, locale)}`
              : "No memory found"}
          </DialogDescription>
        </DialogHeader>

        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-500">{error}</div>}

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : memory ? (
          <div className="space-y-4">
            {memory.changeNotes && (
              <p className="text-xs text-muted-foreground">{memory.changeNotes}</p>
            )}

            <div className="flex items-center gap-2">
              <Button
                variant={viewType === "core" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setViewType("core")}
              >
                <EyeIcon className="size-3" />
                Core ({memory.core.length} chars)
              </Button>
              <Button
                variant={viewType === "working" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setViewType("working")}
              >
                <EyeIcon className="size-3" />
                Working ({memory.working.length} items)
              </Button>
            </div>

            <div className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap max-h-[50vh] overflow-y-auto">
              {viewType === "core"
                ? memory.core || "(empty)"
                : memory.working.length > 0
                  ? memory.working.join("\n")
                  : "(empty)"}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No memory exists for this {userId ? "user" : "team"}.
          </div>
        )}

        <DialogFooter>
          {memory && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReorganize}
              disabled={isReorganizing}
            >
              <RefreshCwIcon className="size-3" />
              {isReorganizing ? "Reorganizing..." : "Reorganize"}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
