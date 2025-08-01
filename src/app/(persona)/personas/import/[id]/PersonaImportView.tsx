"use client";
import { processPersonaImportAction } from "@/app/(persona)/actions";
import { PersonaImportAnalysis } from "@/app/(persona)/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatMessageAttachment, Persona, PersonaImport, PersonaImportExtra } from "@/prisma/client";
import { BrainIcon, FileTextIcon, RefreshCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AnalysisResult } from "./AnalysisResult";
import { FollowUpChatList } from "./FollowUpChatList";
import { PersonaSummary } from "./PersonaSummary";
import { ProcessingStatus } from "./ProcessingStatus";
import { SupplementaryQuestions } from "./SupplementaryQuestions";

export function PersonaImportView({
  personaImport: initialPersonaImport,
  personas,
}: {
  personaImport: Omit<PersonaImport, "analysis" | "extra"> & {
    analysis: Partial<PersonaImportAnalysis> | null;
    extra: PersonaImportExtra;
  };
  personas: Persona[];
}) {
  const t = useTranslations("PersonaImport.import");
  const router = useRouter();
  const [personaImport, setPersonaImport] = useState(initialPersonaImport);

  const isProcessing = Boolean(personaImport.extra?.processing);
  const hasError = Boolean(personaImport.extra?.error);

  // Check individual completion status
  const personaAgentCompleted = Boolean(personas.length);
  const analysisCompleted = Boolean(
    personaImport.analysis?.analysis && personaImport.analysis?.supplementaryQuestions,
  );

  // Parse analysis data
  const analysis = personaImport.analysis?.analysis;
  const supplementaryQuestions = personaImport.analysis?.supplementaryQuestions;

  // Get file info
  const attachments = personaImport.attachments as ChatMessageAttachment[];
  const fileName = attachments?.[0]?.name || t("file");

  // Update local state when props change (from server refresh)
  useEffect(() => {
    setPersonaImport(initialPersonaImport);
  }, [initialPersonaImport]);

  // Show completion message
  useEffect(() => {
    if (!isProcessing && !hasError) {
      // Optional: Show success notification when processing completes
      // console.log("Processing completed successfully");
    }
  }, [isProcessing, hasError]);

  const handleReAnalyze = useCallback(async () => {
    if (isProcessing) {
      toast.error(t("reanalyzing"));
      return;
    }
    if (!confirm(t("confirmReanalyze"))) {
      return;
    }
    try {
      const result = await processPersonaImportAction(personaImport.id);
      if (!result.success) throw result;
      toast.success(t("reanalyzeStarted"));
      router.refresh();
    } catch (error) {
      console.log("Error re-analyzing:", error);
      toast.error(t("reanalyzeFailed"));
    } finally {
      router.refresh();
    }
  }, [isProcessing, personaImport.id, t, router]);

  const handleViewFile = () => {
    const attachment = attachments[0];
    if (attachment?.objectUrl && attachment?.mimeType) {
      // Use the existing attachment API endpoint
      const fileUrl = `/api/attachment?objectUrl=${encodeURIComponent(attachment.objectUrl)}&mimeType=${encodeURIComponent(attachment.mimeType)}`;
      window.open(fileUrl, "_blank");
    }
  };

  // Show error state
  if (hasError) {
    const errorMessage = personaImport.extra?.error;
    return (
      <div className="container mx-auto px-8 py-12 max-w-4xl">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded bg-red-100 mb-6">
            <BrainIcon className="w-6 h-6 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">{t("processingFailed")}</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            {t("processingError")}
            {fileName}
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-2xl mx-auto">
            <p className="text-red-700 text-sm">{errorMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-8 py-12 max-w-4xl space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded bg-slate-900 mb-4">
          <BrainIcon className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">{t("title")}</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          {!isProcessing ? t("fileProcessed") : t("processingFile")}
          {fileName}
        </p>
        {!isProcessing && (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            {t("allTasksCompleted")}
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Processing Status */}
        <ProcessingStatus
          isGenerating={!personaAgentCompleted || isProcessing}
          isAnalyzing={!analysisCompleted || isProcessing}
          personas={personas}
          personaImportAnalysis={personaImport.analysis}
        />

        {/* File Information and Re-analyze */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold flex items-center gap-3 text-slate-900">
                <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center">
                  <FileTextIcon className="size-3 text-white" />
                </div>
                {t("fileInfo")}
              </h2>
              <p className="text-slate-600 ml-9 text-sm">{t("fileInfoDescription")}</p>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3">
                <FileTextIcon className="size-4 text-slate-600" />
                <div>
                  <p className="font-medium text-slate-900">{fileName}</p>
                  <p className="text-sm text-slate-600">PDF</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={handleViewFile}>
                  {t("viewFile")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReAnalyze}
                  disabled={isProcessing}
                >
                  <RefreshCwIcon className={cn("size-4", isProcessing ? "animate-spin" : "")} />
                  {isProcessing ? t("reanalyzing") : t("reanalyze")}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Persona Summary - only show if summary exists */}
        {personas.length > 0 && !isProcessing && <PersonaSummary personas={personas} />}

        {/* Analysis Result - only show if analysis exists */}
        {analysis && !isProcessing && <AnalysisResult analysis={analysis} />}

        {/* Supplementary Questions - only show if exists */}
        {supplementaryQuestions && !isProcessing && (
          <SupplementaryQuestions
            supplementaryQuestions={supplementaryQuestions}
            fileName={fileName}
            personaImportId={personaImport.id}
          />
        )}

        {/* Follow Up Chat */}
        {!isProcessing && <FollowUpChatList personaImportId={personaImport.id} />}
      </div>
    </div>
  );
}
