"use client";
import { Button } from "@/components/ui/button";
import { getS3UploadCredentials } from "@/lib/attachments/actions";
import {
  checkFileUploadLimits,
  DOCUMENT_MIME_TYPES,
  IMAGE_MIME_TYPES,
} from "@/lib/fileUploadLimits";
import { Loader2, PaperclipIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";

export const MAX_SINGLE_FILE_SIZE = 3 * 1024 * 1024;
export const MAX_TOTAL_FILE_SIZE = 10 * 1024 * 1024;

export type FileUploadInfo = {
  objectUrl: string; // s3 object url without signature
  url: string;
  name: string;
  mimeType: string;
  size: number; // bytes
};

interface FileUploadButtonProps {
  onFileUploadedAction: (fileInfo: FileUploadInfo) => void;
  disabled?: boolean;
  existingFiles?: FileUploadInfo[];
  showLimitsCheck?: boolean;
}

export function FileUploadButton({
  onFileUploadedAction,
  disabled,
  existingFiles = [],
  showLimitsCheck = true,
}: FileUploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("FileUploadLimits");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file type is supported
    const supportedTypes = [...IMAGE_MIME_TYPES, ...DOCUMENT_MIME_TYPES];
    if (!supportedTypes.includes(file.type as any)) {
      toast.error(t("unsupportedType"));
      return;
    }

    // Check file size (max 3MB)
    if (file.size > MAX_SINGLE_FILE_SIZE) {
      toast.error(t("fileSizeExceeds3MB"));
      return;
    }

    // Check upload limits if enabled
    if (showLimitsCheck) {
      const limitCheck = checkFileUploadLimits(existingFiles, {
        mimeType: file.type,
        size: file.size,
      });
      if (!limitCheck.canUpload) {
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
        return;
      }
    }

    setIsUploading(true);

    try {
      const result = await getS3UploadCredentials({
        fileType: file.type,
        fileName: file.name,
      });

      if (!result.success) {
        throw new Error(result.message);
      }

      const { putObjectUrl, getObjectUrl, objectUrl } = result.data;

      const uploadResponse = await fetch(putObjectUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
      }

      onFileUploadedAction({
        objectUrl: objectUrl,
        url: getObjectUrl,
        name: file.name,
        mimeType: file.type,
        size: file.size,
      });

      toast.success(t("fileUploadedSuccessfully"));
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error(error instanceof Error ? error.message : t("failedToUploadFile"));
    } finally {
      setIsUploading(false);
      // Clear the input value to allow uploading the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={[...IMAGE_MIME_TYPES, ...DOCUMENT_MIME_TYPES].join(",")}
        className="hidden"
        disabled={disabled || isUploading}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-8 text-xs"
        onClick={handleButtonClick}
        disabled={disabled || isUploading}
      >
        {isUploading ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <PaperclipIcon className="size-3" />
        )}
      </Button>
    </>
  );
}
