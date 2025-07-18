"use client";
import { FileUploadInfo } from "@/components/chat/FileUploadButton";
import {
  checkFileUploadLimits,
  FILE_UPLOAD_LIMITS,
  getFileUploadStatus,
} from "@/lib/fileUploadLimits";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export interface UseFileUploadManagerOptions {
  onFilesChange?: (files: FileUploadInfo[]) => void;
  showToast?: boolean;
}

export function useFileUploadManager(options: UseFileUploadManagerOptions = {}) {
  const { onFilesChange, showToast = true } = options;
  const t = useTranslations("FileUploadLimits");
  const [uploadedFiles, setUploadedFiles] = useState<FileUploadInfo[]>([]);

  const handleFileUploaded = useCallback(
    (fileInfo: FileUploadInfo) => {
      // Check limits before adding the file
      const limitCheck = checkFileUploadLimits(uploadedFiles, fileInfo);

      if (!limitCheck.canUpload) {
        if (showToast) {
          let message = "";
          if (limitCheck.reason === "max-images") {
            message = t("maxImages");
          } else if (limitCheck.reason === "max-documents") {
            message = t("maxDocuments");
          } else if (limitCheck.reason === "max-total-size") {
            message = t("maxTotalSize");
          } else if (limitCheck.reason === "unsupported-type") {
            message = t("unsupportedType");
          }
          toast.error(message);
        }
        return false; // Return false to indicate upload was rejected
      }

      const newFiles = [...uploadedFiles, fileInfo];
      setUploadedFiles(newFiles);
      onFilesChange?.(newFiles);
      return true; // Return true to indicate upload was successful
    },
    [uploadedFiles, t, showToast, onFilesChange],
  );

  const handleRemoveFile = useCallback(
    (index: number) => {
      const newFiles = uploadedFiles.filter((_, i) => i !== index);
      setUploadedFiles(newFiles);
      onFilesChange?.(newFiles);
    },
    [uploadedFiles, onFilesChange],
  );

  const clearFiles = useCallback(() => {
    setUploadedFiles([]);
    onFilesChange?.([]);
  }, [onFilesChange]);

  const canUploadMore = useCallback(
    (mimeType: string, size: number) => {
      return checkFileUploadLimits(uploadedFiles, { mimeType, size }).canUpload;
    },
    [uploadedFiles],
  );

  const getStatus = useCallback(() => {
    return getFileUploadStatus(uploadedFiles);
  }, [uploadedFiles]);

  const isUploadDisabled = useCallback(() => {
    const status = getStatus();
    return !status.canUploadBySize;
  }, [getStatus]);

  return {
    uploadedFiles,
    handleFileUploaded,
    handleRemoveFile,
    clearFiles,
    canUploadMore,
    getStatus,
    isUploadDisabled,
    limits: FILE_UPLOAD_LIMITS,
  };
}
