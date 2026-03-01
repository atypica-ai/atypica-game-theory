"use client";

import { Button } from "@/components/ui/button";
import { SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { TeamMemoryCard } from "./TeamMemoryCard";
import { TeamMemoryDialog } from "./TeamMemoryDialog";

interface MemoryData {
  core: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface TeamMemorySectionProps {
  initialMemory: MemoryData | null;
}

export function TeamMemorySection({ initialMemory }: TeamMemorySectionProps) {
  const t = useTranslations("Team.Capabilities.memory");
  const [memory, setMemory] = useState<MemoryData | null>(initialMemory);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (!memory) {
    return (
      <div className="space-y-4">
        <div className="border-t pt-4">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">{t("title")}</h2>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </div>
          <div className="mt-4 space-y-3">
            <div className="text-sm text-muted-foreground">{t("noMemory")}</div>
            <Button asChild size="sm" className="gap-2">
              <Link href="/team/memory-builder">
                <SparklesIcon className="w-4 h-4" />
                {t("createMemoryButton")}
              </Link>
            </Button>
          </div>
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
            <TeamMemoryCard memory={memory} onClick={() => setIsDialogOpen(true)} />
          </div>
        </div>
      </div>

      <TeamMemoryDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        memory={memory}
        onMemoryUpdated={(updated) => setMemory(updated)}
      />
    </>
  );
}
