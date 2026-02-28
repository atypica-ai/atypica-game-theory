"use client";

import { useTranslations } from "next-intl";
import { TeamMemorySection } from "./TeamMemorySection";

interface MemoryData {
  core: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface TeamCapabilitiesPageClientProps {
  initialMemory: MemoryData | null;
}

export function TeamCapabilitiesPageClient({ initialMemory }: TeamCapabilitiesPageClientProps) {
  const t = useTranslations("Team.Capabilities");

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("description")}</p>
      </div>

      <TeamMemorySection initialMemory={initialMemory} />
    </div>
  );
}
