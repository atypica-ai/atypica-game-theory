"use client";

import type { Sage } from "@/prisma/client";
import type { SageExtra } from "../../types";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2Icon, SparklesIcon, ScanSearchIcon } from "lucide-react";
import { toast } from "sonner";
import { extractSageKnowledge, analyzeSageKnowledge } from "../../actions";

type SageWithExtra = Omit<Sage, "extra"> & { extra: SageExtra };

export function MemoryTab({ sage, memoryDocument }: { sage: SageWithExtra; memoryDocument: string | null }) {
  const t = useTranslations("Sage.detail");
  const router = useRouter();
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const hasMemoryDocument = !!memoryDocument;
  const hasAnalysis = !!sage.extra?.knowledgeAnalysis?.overallScore;

  // Simple conditions: no complex state checking
  const canExtract = !hasMemoryDocument; // Can extract if no memory document yet
  const canAnalyze = hasMemoryDocument && !hasAnalysis; // Can analyze if has memory but no analysis

  const handleExtractKnowledge = useCallback(async () => {
    setIsExtracting(true);
    try {
      const result = await extractSageKnowledge(sage.id);
      if (!result.success) throw result;
      toast.success("Knowledge extraction started");
      setTimeout(() => router.refresh(), 1000);
    } catch (error) {
      console.log("Error extracting knowledge:", error);
      toast.error("Failed to extract knowledge");
    } finally {
      setIsExtracting(false);
    }
  }, [sage.id, router]);

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
            Extract Knowledge
          </Button>
          <Button
            onClick={handleAnalyze}
            disabled={!canAnalyze || isAnalyzing}
            variant="outline"
            size="sm"
          >
            {isAnalyzing ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <ScanSearchIcon className="size-4" />
            )}
            Analyze
          </Button>
        </div>
      </div>

      <Separator />

      {/* Basic Info */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">Basic Information</h2>
        <div className="space-y-2 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Expertise</div>
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
            <span className="text-xs text-muted-foreground">Locale:</span>{" "}
            <span>{sage.locale}</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Public:</span>{" "}
            <span>{sage.isPublic ? "Yes" : "No"}</span>
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
              {memoryDocument.length} characters
            </span>
          )}
        </div>
        {hasMemoryDocument ? (
          <pre className="text-xs text-foreground/90 whitespace-pre-wrap font-mono leading-relaxed">
            {memoryDocument}
          </pre>
        ) : (
          <p className="text-xs text-muted-foreground">
            No memory document yet. Extract knowledge from sources first.
          </p>
        )}
      </div>
    </div>
  );
}
