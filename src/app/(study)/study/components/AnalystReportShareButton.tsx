"use client";
import { generateReportPDFAction } from "@/app/(study)/artifacts/report/actions";
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
import { trackEvent } from "@/lib/analytics/segment";
import { ClipboardCopyIcon, EyeIcon, FileDownIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

export function AnalystReportShareButton({
  reportToken,
  children,
  download = false,
  title,
}: {
  reportToken: string;
  children?: React.ReactNode;
  download?: boolean;
  title?: string;
}) {
  const publicReportUrl = `/artifacts/report/${reportToken}/share?utm_source=report&utm_medium=share`;
  const t = useTranslations("StudyPage.AnalystReportShareButton");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [fullUrl, setFullUrl] = useState<string | null>(null);

  useEffect(() => {
    const fullUrl = `${window.location.origin}${publicReportUrl}`;
    setFullUrl(fullUrl);
  }, [publicReportUrl]);

  const handleCopyUrl = useCallback(() => {
    if (!fullUrl) return;
    navigator.clipboard.writeText(fullUrl);
    toast.success(t("copySuccess"));
    trackEvent("Study Artifact Exported", { intent: "share", type: "report", url: fullUrl });
  }, [t, fullUrl]);

  const handleShareToX = useCallback(() => {
    if (!fullUrl) return;
    // 构造分享文本
    const shareText = title ? t("shareToXWithTitle", { title }) : t("shareToXDefault");
    // 构造 Twitter Intent URL
    const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(fullUrl)}`;
    // 在新标签页中打开
    window.open(twitterUrl, "_blank");
    // 追踪事件
    trackEvent("Study Artifact Exported", { intent: "share", type: "report", url: fullUrl });
  }, [t, title, fullUrl]);

  const handleDownloadPDF = useCallback(() => {
    startTransition(async () => {
      try {
        toast.loading(t("generatingPDF") || "Generating PDF...");
        const {
          // pdfBlob,
          pdfUrl,
          fileName,
        } = await generateReportPDFAction(reportToken);
        // Create a download link and trigger download
        const response = await fetch(pdfUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        // const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.dismiss();
        toast.success(t("pdfDownloadSuccess"));
        trackEvent("Study Artifact Exported", { intent: "download", type: "report", url: url });
      } catch (error) {
        console.log(error);
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
            <div className="bg-muted p-2 rounded-md text-xs flex-1 overflow-hidden wrap-break-word">
              {fullUrl}
            </div>
            <Button size="sm" variant="outline" onClick={handleCopyUrl} className="shrink-0">
              <ClipboardCopyIcon className="size-4" />
              {t("copyButton")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{t("openInstructions")}</p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setOpen(false)}>{t("closeButton")}</AlertDialogCancel>
          <Button variant="outline" onClick={handleShareToX}>
            <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            {t("shareToX")}
          </Button>
          {download && (
            <Button variant="outline" onClick={handleDownloadPDF} disabled={isPending}>
              <FileDownIcon className="size-4" />
              {isPending ? t("generatingPDF") : t("downloadPDF")}
            </Button>
          )}
          <Button
            onClick={() => {
              if (!fullUrl) return;
              window.open(fullUrl, "_blank");
              trackEvent("Study Artifact Exported", {
                intent: "visit",
                type: "report",
                url: fullUrl,
              });
            }}
          >
            {t("openButton")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
