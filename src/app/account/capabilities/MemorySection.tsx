"use client";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { MemoryCard } from "./MemoryCard";
import { MemoryDialog } from "./MemoryDialog";
import { fetchUserMemory } from "./actions";

interface MemoryData {
  core: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface MemorySectionProps {
  initialMemory: MemoryData | null;
}

export function MemorySection({ initialMemory }: MemorySectionProps) {
  const t = useTranslations("AccountPage.capabilities.memory");
  const [memory, setMemory] = useState<MemoryData | null>(initialMemory);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const refreshMemory = async () => {
    setIsLoading(true);
    const result = await fetchUserMemory();
    if (result.success) {
      setMemory(result.data);
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
              <MemoryCard memory={memory} onClick={() => setIsDialogOpen(true)} />
            ) : (
              <div className="text-sm text-muted-foreground">{t("noMemory")}</div>
            )}
          </div>
        </div>
      </div>

      {memory && (
        <MemoryDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          memory={memory}
          onMemoryUpdated={refreshMemory}
        />
      )}
    </>
  );
}
