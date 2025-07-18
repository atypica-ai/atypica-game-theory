"use client";
import { FileUploadInfo } from "@/components/chat/FileUploadButton";
import { getFileUploadStatus } from "@/lib/fileUploadLimits";
import { cn } from "@/lib/utils";
import { FileImageIcon, FileTextIcon } from "lucide-react";
import { useTranslations } from "next-intl";

interface FileUploadStatusProps {
  files: FileUploadInfo[];
  className?: string;
  showDetails?: boolean;
}

export function FileUploadStatus({ files, className, showDetails = false }: FileUploadStatusProps) {
  const t = useTranslations("FileUploadLimits");
  const status = getFileUploadStatus(files);

  if (files.length === 0 && !showDetails) {
    return null;
  }

  // Create translated status text
  const translatedStatusText = `${status.imageCount}/5 ${t("images")}, ${status.documentCount}/3 ${t("documents")}`;

  return (
    <div className={cn("text-xs text-muted-foreground", className)}>
      {showDetails ? (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <FileImageIcon className="h-3 w-3" />
            <span className={cn(status.imageCount >= 5 ? "text-red-500" : "text-muted-foreground")}>
              {status.imageCount}/5 {t("images")}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <FileTextIcon className="h-3 w-3" />
            <span
              className={cn(status.documentCount >= 3 ? "text-red-500" : "text-muted-foreground")}
            >
              {status.documentCount}/3 {t("documents")}
            </span>
          </div>
          {!status.canUploadBySize && (
            <span className="text-red-500 text-xs">{t("sizeLimit")}</span>
          )}
        </div>
      ) : (
        <span
          className={cn((status.imageCount >= 5 || status.documentCount >= 3) && "text-orange-500")}
        >
          {translatedStatusText}
        </span>
      )}
    </div>
  );
}
