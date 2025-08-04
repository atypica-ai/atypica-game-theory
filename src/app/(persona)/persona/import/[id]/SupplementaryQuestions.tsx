"use client";
import { createFollowUpInterviewChat } from "@/app/(persona)/actions";
import { AnalysisResult } from "@/app/(persona)/types";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ClipboardCopyIcon, CopyIcon, LightbulbIcon, ShareIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

interface SupplementaryQuestionsProps {
  supplementaryQuestions: AnalysisResult["supplementaryQuestions"];
  fileName: string;
  personaImportId: number;
}

export function SupplementaryQuestions({
  supplementaryQuestions,
  // fileName,
  personaImportId,
}: SupplementaryQuestionsProps) {
  const t = useTranslations("PersonaImport.supplementaryQuestions");
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [isCreatingLink, setIsCreatingLink] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(t("copyLink"));
    });
  };

  const handleCreateShareLink = async () => {
    setIsCreatingLink(true);
    try {
      const result = await createFollowUpInterviewChat(personaImportId);
      if (!result.success) {
        throw new Error(result.message || t("generating"));
      }
      const url = `${window.location.origin}/personas/followup/${result.data.token}`;
      setShareUrl(url);
      setOpen(true);
    } catch (error) {
      console.error("Error creating share link:", error);
      toast.error(t("generating"));
    } finally {
      setIsCreatingLink(false);
    }
  };

  const handleCopyUrl = () => {
    copyToClipboard(shareUrl);
    toast.success(t("copyLink"));
  };

  return (
    <div className="bg-card text-card-foreground rounded-lg border p-3 sm:p-6">
      <div className="space-y-3">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center">
              <LightbulbIcon className="size-3" />
            </div>
            {t("title")}
          </h2>
          <p className="text-muted-foreground ml-9 text-sm">{t("description")}</p>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-amber-100/50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-900/30">
            <h4 className="font-medium mb-2 text-amber-900 dark:text-amber-200">
              {t("generationReason")}
            </h4>
            <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
              {supplementaryQuestions.reasoning}
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">{t("suggestedQuestions")}</h4>
            <div className="grid gap-3">
              {(supplementaryQuestions.questions ?? []).map((question, index) => (
                <div key={index} className="p-3 border rounded-lg bg-background">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 w-5 h-5 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium mt-0.5">
                          {index + 1}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{question}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(question)}
                      className="px-2 py-1 h-auto text-muted-foreground hover:text-foreground"
                    >
                      <CopyIcon className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="space-y-2">
              <AlertDialog
                open={open}
                onOpenChange={(open) => {
                  if (!open) setOpen(false);
                }}
              >
                <Button
                  className="w-full"
                  onClick={handleCreateShareLink}
                  disabled={isCreatingLink}
                >
                  <ShareIcon className="size-4 mr-2" />
                  {isCreatingLink ? t("generating") : t("generateShareLink")}
                </Button>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("shareTitle")}</AlertDialogTitle>
                    <AlertDialogDescription></AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="mt-3 space-y-3 overflow-hidden">
                    <p className="text-sm text-muted-foreground mb-2">{t("shareDescription")}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="bg-muted p-2 rounded-md text-xs flex-1 overflow-hidden break-words">
                        {shareUrl}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopyUrl}
                        className="shrink-0"
                      >
                        <ClipboardCopyIcon className="size-4 mr-1" />
                        {t("copyLink")}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{t("shareNote")}</p>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setOpen(false)}>
                      {t("close")}
                    </AlertDialogCancel>
                    <Button onClick={() => window.open(shareUrl, "_blank")}>{t("openLink")}</Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <p className="text-xs text-muted-foreground text-center">{t("createShareNote")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
