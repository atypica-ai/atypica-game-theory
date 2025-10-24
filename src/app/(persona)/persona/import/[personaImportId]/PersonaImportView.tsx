"use client";
import { processPersonaImportAction } from "@/app/(persona)/actions";
import { PersonaImportAnalysis } from "@/app/(persona)/types";
import { proxiedObjectCdnUrl } from "@/app/(system)/cdn/lib";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatMessageAttachment, Persona, PersonaImport, PersonaImportExtra } from "@/prisma/client";
import { BrainIcon, RefreshCwIcon } from "lucide-react";
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

  const handleViewFile = useCallback(async () => {
    const attachment = attachments[0];
    if (attachment?.objectUrl && attachment?.mimeType) {
      // Use the existing attachment API endpoint
      window.open(
        proxiedObjectCdnUrl({
          objectUrl: attachment.objectUrl,
          mimeType: attachment.mimeType,
        }),
        "_blank",
      );
    }
  }, [attachments]);

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
          <div className="flex justify-center mt-6">
            <ConfirmDialog
              title={t("reanalyze")}
              description={t("confirmReanalyze")}
              onConfirm={handleReAnalyze}
            >
              <Button variant="outline" disabled={isProcessing}>
                <RefreshCwIcon className={cn("size-4 mr-2", isProcessing ? "animate-spin" : "")} />
                {isProcessing ? t("reanalyzing") : t("reanalyze")}
              </Button>
            </ConfirmDialog>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Desktop Navigation Indicators - Only show on xl screens */}
      <div className="hidden xl:block fixed left-8 top-1/2 -translate-y-1/2 z-10">
        <div className="flex flex-col space-y-4">
          <a
            href="#file-info"
            className="group flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            title={t("processingProgress")}
          >
            <div className="w-2 h-8 bg-primary/30 rounded-full group-hover:bg-primary transition-colors"></div>
            <span className="text-sm text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {t("processingProgress")}
            </span>
          </a>

          {personas.length > 0 && !isProcessing && (
            <a
              href="#persona-summary"
              className="group flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              title={t("aiPersonas")}
            >
              <div className="w-2 h-8 bg-primary/30 rounded-full group-hover:bg-primary transition-colors"></div>
              <span className="text-sm text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {t("aiPersonas")}
              </span>
            </a>
          )}

          {analysis && !isProcessing && (
            <a
              href="#analysis-result"
              className="group flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              title={t("dimensionAnalysis")}
            >
              <div className="w-2 h-8 bg-primary/30 rounded-full group-hover:bg-primary transition-colors"></div>
              <span className="text-sm text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {t("dimensionAnalysis")}
              </span>
            </a>
          )}

          {supplementaryQuestions && !isProcessing && (
            <a
              href="#supplementary-questions"
              className="group flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              title={t("supplementaryQuestions")}
            >
              <div className="w-2 h-8 bg-primary/30 rounded-full group-hover:bg-primary transition-colors"></div>
              <span className="text-sm text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {t("supplementaryQuestions")}
              </span>
            </a>
          )}
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-8 xl:px-32 py-8 max-w-6xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground mb-4 shadow-sm">
            <BrainIcon className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            {!isProcessing ? t("fileProcessed") : t("processingFile")}
            <span
              className="font-medium text-foreground hover:underline cursor-pointer"
              onClick={handleViewFile}
            >
              {fileName}
            </span>
          </p>
          <div className="flex items-center justify-center gap-4">
            {!isProcessing && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 rounded-full border border-green-200/50 dark:border-green-900/30 text-sm font-medium shadow-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                {t("allTasksCompleted")}
              </div>
            )}
            <ConfirmDialog
              title={t("reanalyze")}
              description={t("confirmReanalyze")}
              onConfirm={handleReAnalyze}
            >
              <Button
                variant="ghost"
                size="sm"
                disabled={isProcessing}
                className="text-muted-foreground hover:text-foreground"
              >
                <RefreshCwIcon className={cn("size-4", isProcessing ? "animate-spin" : "")} />
                <span className="ml-1 text-xs">
                  {isProcessing ? t("reanalyzing") : t("reanalyze")}
                </span>
              </Button>
            </ConfirmDialog>
          </div>
        </div>

        <div className="space-y-10">
          {/* Processing Status */}
          <section id="file-info" className="scroll-mt-24">
            <ProcessingStatus
              processing={processingStatus}
              personas={personas}
              personaImportAnalysis={personaImport.analysis}
              context={personaImport.context}
            />
          </section>

          {/* Persona Summary - only show if summary exists */}
          {personas.length > 0 && !isProcessing && (
            <section id="persona-summary" className="scroll-mt-24 relative">
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-20 h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
              <PersonaSummary
                personas={
                  // TODO: 后面等 token nullable 属性去掉以后，可以去掉这个判断
                  personas
                    .filter((persona) => !!persona.token)
                    .map(
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      ({ id, ...persona }) =>
                        persona as Omit<Persona, "id" | "token"> & { id: undefined; token: string },
                    )
                }
              />
            </section>
          )}

          {/* Analysis Result - only show if analysis exists */}
          {analysis && !isProcessing && (
            <section id="analysis-result" className="scroll-mt-24 relative">
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-20 h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
              <AnalysisResult analysis={analysis} />
            </section>
          )}

          {/* Supplementary Questions - only show if exists */}
          {supplementaryQuestions && !isProcessing && (
            <section id="supplementary-questions" className="scroll-mt-24 relative">
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-20 h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
              <SupplementaryQuestions
                supplementaryQuestions={supplementaryQuestions}
                fileName={fileName}
                personaImportId={personaImport.id}
              />
            </section>
          )}

          {/* Follow Up Chat */}
          {!isProcessing && (
            <section id="follow-up-chat" className="scroll-mt-24 relative">
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-20 h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
              <FollowUpChatList personaImportId={personaImport.id} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
