"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { CoreMemorySection, type MemoryData } from "./CoreMemorySection";

interface CapabilitiesPageClientProps {
  initialMemory: MemoryData | null;
}

export function CapabilitiesPageClient({ initialMemory }: CapabilitiesPageClientProps) {
  const t = useTranslations("AccountPage.capabilities");
  const [memory, setMemory] = useState<MemoryData | null>(initialMemory);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("description")}</p>
      </div>

      <CoreMemorySection memory={memory} onMemoryUpdated={setMemory} />
    </div>
  );
}
