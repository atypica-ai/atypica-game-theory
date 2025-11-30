"use client";
import { createSage } from "@/app/(sage)/(public)/actions";
import { AddSourcesContent } from "@/app/(sage)/components/AddSourcesContent";
import { SageSourceContent } from "@/app/(sage)/types";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRightIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export function CreateSagePageClient() {
  const t = useTranslations("Sage.create");
  const router = useRouter();
  const locale = useLocale();

  const [sources, setSources] = useState<SageSourceContent[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Sage metadata (will be filled after adding sources)
  const [sageName, setSageName] = useState("");
  const [sageDomain, setSageDomain] = useState("");
  const [showMetadataStep, setShowMetadataStep] = useState(false);

  // Handle next step
  const handleNext = useCallback(() => {
    if (sources.length === 0) {
      toast.error(t("addAtLeastOneSource"));
      return;
    }
    setShowMetadataStep(true);
  }, [sources.length, t]);

  // Handle back to source selection
  const handleBackToSources = useCallback(() => {
    setShowMetadataStep(false);
  }, []);

  // Handle create sage
  const handleCreate = useCallback(async () => {
    if (!sageName.trim()) {
      toast.error(t("enterName"));
      return;
    }
    if (!sageDomain.trim()) {
      toast.error(t("enterDomain"));
      return;
    }
    setIsCreating(true);
    try {
      const result = await createSage({
        name: sageName.trim(),
        domain: sageDomain.trim(),
        locale,
        sources,
      });
      if (!result.success) throw result;
      const { sage } = result.data;
      toast.success(t("createSuccess"));
      router.push(`/sage/${sage.token}`);
    } catch (error) {
      console.error("Error creating sage:", error);
      toast.error(t("createFailed"));
      setIsCreating(false);
    }
  }, [router, sageName, sageDomain, sources, locale, t]);

  if (showMetadataStep) {
    return (
      <FitToViewport className="flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            {t("expertInfo")}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-8">
            {t("expertInfoDescription")}
          </p>

          <div className="space-y-6">
            <div>
              <Label htmlFor="name">{t("expertName")}</Label>
              <Input
                id="name"
                value={sageName}
                onChange={(e) => setSageName(e.target.value)}
                placeholder={t("expertNamePlaceholder")}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="domain">{t("expertDomain")}</Label>
              <Input
                id="domain"
                value={sageDomain}
                onChange={(e) => setSageDomain(e.target.value)}
                placeholder={t("expertDomainPlaceholder")}
                className="mt-2"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={handleBackToSources}>
                {t("back")}
              </Button>
              <Button onClick={handleCreate} disabled={isCreating} className="flex-1">
                {isCreating ? t("creating") : t("create")}
              </Button>
            </div>
          </div>
        </div>
      </FitToViewport>
    );
  }

  return (
    <FitToViewport className="flex flex-col items-center justify-start p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-lg my-8 sm:border border-zinc-200 dark:border-zinc-800 sm:p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">{t("title")}</h1>
          <p className="text-zinc-600 dark:text-zinc-400">{t("description")}</p>
        </div>

        {/* Add Sources Content */}
        <AddSourcesContent
          sources={sources}
          onSourcesChange={setSources}
          currentSourceCount={0}
          maxSources={30}
        />

        {/* Actions */}
        <div className="flex gap-3 justify-end mt-6">
          <Button variant="outline" onClick={() => router.back()}>
            {t("cancel")}
          </Button>
          <Button onClick={handleNext} disabled={sources.length === 0}>
            {t("next")}
            <ArrowRightIcon className="size-4 ml-2" />
          </Button>
        </div>
      </div>
    </FitToViewport>
  );
}
