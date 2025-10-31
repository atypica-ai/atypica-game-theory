"use client";

import { analyzeSageKnowledge, extractSageKnowledge } from "@/app/(sage)/actions";
import type { SageExtra } from "@/app/(sage)/types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Sage } from "@/prisma/client";
import { ExternalLinkIcon, Loader2Icon, ScanSearchIcon, SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { AvatarUpload } from "./AvatarUpload";

type SageWithExtra = Omit<Sage, "extra" | "avatar"> & {
  extra: SageExtra;
  avatar: { url?: string };
};

export function MemoryTab({
  sage,
  memoryDocument,
}: {
  sage: SageWithExtra;
  memoryDocument: string | null;
}) {
  const t = useTranslations("Sage.detail");
  const router = useRouter();
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const hasMemoryDocument = !!memoryDocument;

  // Simple condition: can extract if no memory document yet
  const canExtract = !hasMemoryDocument;

  const handleExtractKnowledge = useCallback(async () => {
    setIsExtracting(true);
    try {
      const result = await extractSageKnowledge(sage.id);
      if (!result.success) throw result;
      toast.success(t("extractionStarted"));
      setTimeout(() => router.refresh(), 1000);
    } catch (error) {
      console.log("Error extracting knowledge:", error);
      toast.error(t("extractionFailed"));
    } finally {
      setIsExtracting(false);
    }
  }, [sage.id, router, t]);

  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeSageKnowledge(sage.id);
      if (!result.success) throw result;
      toast.success(t("analysisStarted"));
      setTimeout(() => router.refresh(), 1000);
    } catch (error) {
      console.log("Error analyzing:", error);
      toast.error(t("analysisFailed"));
    } finally {
      setIsAnalyzing(false);
    }
  }, [sage.id, t, router]);

  return (
    <div className="p-6 space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{sage.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{sage.domain}</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExtractKnowledge}
            disabled={!canExtract || isExtracting}
            variant="default"
            size="sm"
          >
            {isExtracting ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <SparklesIcon className="size-4" />
            )}
            {t("extractKnowledgeButton")}
          </Button>
          <Button
            onClick={handleAnalyze}
            disabled={!hasMemoryDocument || isAnalyzing}
            variant="outline"
            size="sm"
          >
            {isAnalyzing ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <ScanSearchIcon className="size-4" />
            )}
            {t("analyzeGapsButton")}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/sage/profile/${sage.token}`} target="_blank">
              <ExternalLinkIcon className="size-4" />
              {t("viewPublicProfile")}
            </Link>
          </Button>
        </div>
      </div>

      <Separator />

      {/* Avatar Upload */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">{t("avatar")}</h2>
        <AvatarUpload sageId={sage.id} sageName={sage.name} currentAvatar={sage.avatar} />
      </div>

      <Separator />

      {/* Basic Info */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">{t("basicInformation")}</h2>
        <div className="space-y-2 text-sm">
          {sage.bio && (
            <div>
              <div className="text-xs text-muted-foreground">{t("bio")}</div>
              <p className="text-sm mt-1">{sage.bio}</p>
            </div>
          )}
          <div>
            <div className="text-xs text-muted-foreground">{t("expertise")}</div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {(Array.isArray(sage.expertise) ? sage.expertise : []).map((exp, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-xs"
                >
                  {String(exp)}
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">{t("locale")}:</span>{" "}
            <span>{sage.locale}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Memory Document */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-foreground">{t("memoryDocument")}</h2>
          {hasMemoryDocument && (
            <span className="text-xs text-muted-foreground">
              {memoryDocument.length} {t("characters")}
            </span>
          )}
        </div>
        {hasMemoryDocument ? (
          <pre className="text-xs text-foreground/90 whitespace-pre-wrap font-mono leading-relaxed">
            {memoryDocument}
          </pre>
        ) : (
          <p className="text-xs text-muted-foreground">{t("noMemoryDocumentYet")}</p>
        )}
      </div>
    </div>
  );
}
