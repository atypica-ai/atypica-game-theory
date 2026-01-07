"use client";
import { useTranslations } from "next-intl";
import { MemorySection } from "./MemorySection";

interface MemoryData {
  core: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface CapabilitiesPageClientProps {
  initialMemory: MemoryData | null;
}

export function CapabilitiesPageClient({ initialMemory }: CapabilitiesPageClientProps) {
  const t = useTranslations("AccountPage.capabilities");

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("description")}</p>
      </div>

      <MemorySection initialMemory={initialMemory} />
    </div>
  );
}
