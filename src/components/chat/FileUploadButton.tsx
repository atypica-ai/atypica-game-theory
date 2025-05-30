"use client";
import { Button } from "@/components/ui/button";
import { getS3UploadCredentials } from "@/lib/attachments/actions";
import { Loader2, PaperclipIcon } from "lucide-react";
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
}

export function FileUploadButton({ onFileUploadedAction, disabled }: FileUploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file is an image or PDF
    if (
      !file.type.startsWith("image/") &&
      file.type !== "application/pdf" &&
      file.type !== "text/plain"
    ) {
      toast.error("Only images, PDF, and text files are allowed");
      return;
    }

    // Check file size (max 3MB)
    if (file.size > MAX_SINGLE_FILE_SIZE) {
      toast.error("File size exceeds 3MB limit");
      return;
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

      toast.success("File uploaded successfully");
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload file");
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
        accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain"
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
