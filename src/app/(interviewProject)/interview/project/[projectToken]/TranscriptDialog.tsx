"use client";

import { generateInterviewTranscriptPDFAction } from "@/app/(interviewProject)/artifacts/interview-transcript/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileDownIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useTransition } from "react";
import { toast } from "sonner";

interface TranscriptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userChatToken: string | null;
}

export function TranscriptDialog({ open, onOpenChange, userChatToken }: TranscriptDialogProps) {
  const t = useTranslations("InterviewProject.transcriptDialog");
  const [isPdfPending, startPdfTransition] = useTransition();

  const handleDownloadPDF = useCallback(() => {
    if (!userChatToken) return;

    startPdfTransition(async () => {
      try {
        toast.loading(t("pdfGenerating"));

        const result = await generateInterviewTranscriptPDFAction(userChatToken);

        if (!result.success) {
          throw new Error(result.message);
        }

        const { pdfUrl, fileName } = result.data;

        // Download the PDF
        const response = await fetch(pdfUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.dismiss();
        toast.success(t("pdfDownloadSuccess"));
      } catch (error) {
        console.error("Failed to download PDF:", error);
        toast.dismiss();
        toast.error(t("pdfDownloadFailed"));
      }
    });
  }, [userChatToken, t]);

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          {userChatToken ? (
            <iframe
              src={`/artifacts/interview-transcript/${userChatToken}/raw`}
              className="w-full h-full border-0"
              title={t("iframeTitle")}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {t("loadError")}
            </div>
          )}
        </div>
        <DialogFooter className="px-6 py-4 border-t">
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={isPdfPending || !userChatToken}
          >
            <FileDownIcon className="h-4 w-4 mr-2" />
            {isPdfPending ? t("pdfGenerating") : t("downloadPdf")}
          </Button>
          <Button onClick={handleClose}>
            {t("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}