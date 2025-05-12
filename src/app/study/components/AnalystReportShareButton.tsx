"use client";
import { generateReportPDF } from "@/app/artifacts/report/actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ClipboardCopyIcon, EyeIcon, FileDownIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";

export function AnalystReportShareButton({
  reportToken,
  children,
}: {
  reportToken: string;
  children?: React.ReactNode;
}) {
  const publicReportUrl = `/artifacts/report/${reportToken}/share`;
  const t = useTranslations("StudyPage.AnalystReportShareButton");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fullUrl = `${window.location.origin}${publicReportUrl}`;

  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(fullUrl);
    toast.success(t("copySuccess"));
  }, [t, fullUrl]);

  const handleDownloadPDF = useCallback(() => {
    startTransition(async () => {
      try {
        toast.loading(t("generatingPDF") || "Generating PDF...");
        const { pdfBlob, fileName } = await generateReportPDF(reportToken);
        // Create a download link and trigger download
        const url = URL.createObjectURL(pdfBlob);
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
        console.error(error);
        toast.dismiss();
        toast.error(t("pdfGenerationFailed"));
      }
    });
  }, [reportToken, t]);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(open) => {
        if (open) setOpen(true);
      }}
    >
      <AlertDialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm">
            <EyeIcon size={16} /> {t("viewReport")}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription></AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3 overflow-hidden">
          <p className="text-sm text-muted-foreground mb-2">{t("successMessage")}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="bg-muted p-2 rounded-md text-xs flex-1 overflow-hidden break-words">
              {fullUrl}
            </div>
            <Button size="sm" variant="outline" onClick={handleCopyUrl} className="shrink-0">
              <ClipboardCopyIcon size={16} className="mr-1" />
              {t("copyButton")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{t("openInstructions")}</p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setOpen(false)}>{t("closeButton")}</AlertDialogCancel>
          <Button variant="outline" onClick={handleDownloadPDF} disabled={isPending}>
            <FileDownIcon size={16} className="mr-1" />
            {isPending ? t("generatingPDF") : t("downloadPDF")}
          </Button>
          <Button onClick={() => window.open(fullUrl, "_blank")}>{t("openButton")}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
