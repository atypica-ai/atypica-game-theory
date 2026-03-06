"use client";

import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CoreMemoryCard } from "./CoreMemoryCard";
import { CoreMemoryDialog } from "./CoreMemoryDialog";

export interface MemoryData {
  core: string;
  working: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface CoreMemorySectionProps {
  memory: MemoryData | null;
  onMemoryUpdated: (updated: MemoryData) => void;
}

export function CoreMemorySection({ memory, onMemoryUpdated }: CoreMemorySectionProps) {
  const t = useTranslations("AccountPage.capabilities.memory.core");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const displayCore = memory?.core ?? "";
  const displayUpdatedAt = memory?.updatedAt ?? null;

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
              <CoreMemoryCard
                core={memory.core}
                updatedAt={memory.updatedAt}
                onClick={() => setIsDialogOpen(true)}
              />
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{t("noMemory")}</p>
                <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
                  {t("addButton")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <CoreMemoryDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        memory={{ core: displayCore, updatedAt: displayUpdatedAt }}
        onMemoryUpdated={onMemoryUpdated}
      />
    </>
  );
}
