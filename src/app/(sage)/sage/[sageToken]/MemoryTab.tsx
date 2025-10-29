"use client";

import type { Sage } from "@/prisma/client";
import type { SageExtra } from "../../types";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2Icon, SparklesIcon, ScanSearchIcon } from "lucide-react";
import { toast } from "sonner";
import { extractSageKnowledge, analyzeSageKnowledge } from "../../actions";
import { Markdown } from "@/components/markdown";

type SageWithExtra = Omit<Sage, "extra"> & { extra: SageExtra };

export function MemoryTab({ sage }: { sage: SageWithExtra }) {
  const t = useTranslations("Sage.detail");
  const router = useRouter();
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const hasMemoryDocument = !!sage.memoryDocument;
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
          <h1 className="text-2xl font-bold">{sage.name}</h1>
          <p className="text-muted-foreground">{sage.domain}</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExtractKnowledge}
            disabled={!canExtract || isExtracting}
            variant="default"
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
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Expertise</div>
            <div className="flex flex-wrap gap-2 mt-1">
              {(Array.isArray(sage.expertise) ? sage.expertise : []).map((exp, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-sm"
                >
                  {String(exp)}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Locale</div>
            <div className="mt-1">{sage.locale}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Public</div>
            <div className="mt-1">{sage.isPublic ? "Yes" : "No"}</div>
          </div>
        </CardContent>
      </Card>

      {/* Memory Document */}
      <Card>
        <CardHeader>
          <CardTitle>{t("memoryDocument")}</CardTitle>
          <CardDescription>
            {hasMemoryDocument ? (
              `${sage.memoryDocument.length} characters`
            ) : (
              "No memory document yet. Extract knowledge from sources first."
            )}
          </CardDescription>
        </CardHeader>
        {hasMemoryDocument && (
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <Markdown>{sage.memoryDocument}</Markdown>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
