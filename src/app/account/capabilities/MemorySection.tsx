"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { fetchUserMemory, requestMemoryUpdate } from "./actions";
import { MemoryCard } from "./MemoryCard";
import { MemoryDialog } from "./MemoryDialog";

interface MemoryData {
  core: string;
  working: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface WorkingMemorySectionProps {
  memory: MemoryData | null;
  onMemoryUpdated: (updated: MemoryData) => void;
}

export function MemorySection({ memory, onMemoryUpdated }: WorkingMemorySectionProps) {
  const t = useTranslations("AccountPage.capabilities.memory.working");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const refreshMemory = async () => {
    setIsLoading(true);
    const result = await fetchUserMemory();
    if (result.success && result.data) {
      onMemoryUpdated(result.data);
    }
    setIsLoading(false);
  };

  const handleFirstUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = (e.target as HTMLFormElement).querySelector("input");
    const value = input?.value?.trim();
    if (!value) {
      toast.error(t("emptyRequest"));
      return;
    }
    setIsLoading(true);
    const result = await requestMemoryUpdate(value);
    if (result.success) {
      toast.success(t("updateSuccess"));
      if (input) input.value = "";
      await refreshMemory();
    } else {
      toast.error(t("updateError"), { description: result.message });
    }
    setIsLoading(false);
  };

  if (isLoading && !memory) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
        <div className="border-t pt-4">
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="border-t pt-4">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">{t("title")}</h2>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </div>
          <div className="mt-4">
            {memory ? (
              <MemoryCard
                working={memory.working}
                updatedAt={memory.updatedAt}
                onClick={() => setIsDialogOpen(true)}
              />
            ) : (
              <form onSubmit={handleFirstUpdate} className="space-y-2">
                <p className="text-sm text-muted-foreground mb-2">{t("noMemory")}</p>
                <div className="flex gap-2">
                  <Input
                    name="request"
                    placeholder={t("editPlaceholder")}
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "..." : t("askAiButton")}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {memory && (
        <MemoryDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          working={memory.working}
          updatedAt={memory.updatedAt}
          onMemoryUpdated={refreshMemory}
        />
      )}
    </>
  );
}
