"use client";
import { processPersonaImportAction } from "@/app/(persona)/actions";
import { PersonaImportAnalysis } from "@/app/(persona)/types";
import { ConfirmDialog } from "@/components/ConfirmDialog";
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

  // Get processing status for three-stage workflow
  const processingStatus = personaImport.extra?.processing ?? false;

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

  // Polling mechanism - refresh every 15 seconds during processing
  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(() => {
      router.refresh();
    }, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [isProcessing, router]);

  const handleReAnalyze = useCallback(async () => {
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
  }, [personaImport.id, t, router]);

  const handleViewFile = () => {
    const attachment = attachments[0];
    if (attachment?.objectUrl && attachment?.mimeType) {
      // Use the existing attachment API endpoint
      const fileUrl = `/api/attachment?objectUrl=${encodeURIComponent(
        attachment.objectUrl,
      )}&mimeType=${encodeURIComponent(attachment.mimeType)}`;
      window.open(fileUrl, "_blank");
    }
  };

  // Show error state
  if (hasError) {
    const errorMessage = personaImport.extra?.error;
    return (
      <div className="container mx-auto px-8 py-12 max-w-4xl">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded bg-destructive/10 mb-6">
            <BrainIcon className="w-6 h-6 text-destructive" />
          </div>
          <h1 className="text-3xl font-bold">{t("processingFailed")}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("processingError")}
            {fileName}
          </p>
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 max-w-2xl mx-auto">
            <p className="text-destructive text-sm">{errorMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-8 py-12 max-w-4xl space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded bg-primary text-primary-foreground mb-4">
          <BrainIcon className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {!isProcessing ? t("fileProcessed") : t("processingFile")}
          {fileName}
        </p>
        {!isProcessing && (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded text-sm font-medium">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            {t("allTasksCompleted")}
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Combined File Information and Processing Status */}
        <div className="bg-card text-card-foreground rounded-lg border p-3 sm:p-6">
          <div className="space-y-6">
            {/* File Information Header */}
            <div className="space-y-4">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center">
                    <FileTextIcon className="size-3" />
                  </div>
                  {t("fileInfo")}
                </h2>
                <p className="text-muted-foreground ml-9 text-sm">{t("fileInfoDescription")}</p>
              </div>

              <div className="flex flex-wrap items-center justify-between p-4 bg-muted rounded-lg border">
                <div className="flex items-center gap-3">
                  <FileTextIcon className="shrink-0 size-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{fileName}</p>
                    <p className="text-sm text-muted-foreground">PDF</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={handleViewFile}>
                    {t("viewFile")}
                  </Button>
                  <ConfirmDialog
                    title={t("reanalyze")}
                    description={t("confirmReanalyze")}
                    onConfirm={handleReAnalyze}
                  >
                    <Button variant="outline" size="sm" disabled={isProcessing}>
                      <RefreshCwIcon className={cn("size-4", isProcessing ? "animate-spin" : "")} />
                      {isProcessing ? t("reanalyzing") : t("reanalyze")}
                    </Button>
                  </ConfirmDialog>
                </div>
              </div>
            </div>

            {/* Processing Status */}
            <div className="space-y-3">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">{t("processingProgress")}</h3>
                <p className="text-muted-foreground text-sm">
                  {t("processingProgressDescription")}
                </p>
              </div>

              <ProcessingStatus
                processing={processingStatus}
                personas={personas}
                personaImportAnalysis={personaImport.analysis}
                context={personaImport.context}
              />
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
