"use client";

import { exportSageAsSkillAction } from "@/app/(sage)/(detail)/actions";
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
import { cn } from "@/lib/utils";
import { DownloadIcon, FileTextIcon, Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export function ExportSkillButton({
  sageToken,
  children,
  variant = "outline",
  size = "sm",
  className,
}: {
  sageToken: string;
  children?: React.ReactNode;
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}) {
  const t = useTranslations("Sage.ExportSkillButton");
  const [open, setOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const result = await exportSageAsSkillAction(sageToken);

      if (!result.success) {
        toast.error(result.message || t("exportError"));
        return;
      }

      const { filename, content, contentType } = result.data;

      // Decode base64 to binary
      const binaryString = atob(content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create blob and download
      const blob = new Blob([bytes], { type: contentType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(t("exportSuccess"));
      setOpen(false);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error(t("exportError"));
    } finally {
      setIsExporting(false);
    }
  }, [sageToken, t]);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {children || (
          <Button variant={variant} size={size} className={cn(className)}>
            <DownloadIcon className="size-3" />
            {t("exportButton")}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3">
          <div className="bg-muted p-4 rounded-md space-y-2">
            <div className="flex items-start gap-2">
              <FileTextIcon className="size-4 mt-0.5 shrink-0" />
              <div className="flex-1 text-sm">
                <p className="font-medium">{t("fileFormat")}</p>
                <p className="text-muted-foreground text-xs mt-1">{t("fileFormatDesc")}</p>
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>{t("howToUse")}</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>{t("step1")}</li>
              <li>{t("step2")}</li>
              <li>{t("step3")}</li>
            </ol>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isExporting}>{t("cancelButton")}</AlertDialogCancel>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                {t("exporting")}
              </>
            ) : (
              <>
                <DownloadIcon className="size-4" />
                {t("downloadButton")}
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
