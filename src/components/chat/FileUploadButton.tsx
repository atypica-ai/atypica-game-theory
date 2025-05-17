"use client";
import { getS3UploadCredentials } from "@/app/agents/actions";
import { Button } from "@/components/ui/button";
import { Loader2, PaperclipIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

export interface FileUploadInfo {
  url: string;
  name?: string;
  mimeType?: string;
  size?: number;
}

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
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast.error("Only images and PDF files are allowed");
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit");
      return;
    }

    setIsUploading(true);

    try {
      const result = await getS3UploadCredentials(file.type, file.name);

      if (!result.success) {
        throw new Error(result.message);
      }

      const { putObjectUrl, getObjectUrl } = result.data;

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
        accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
        className="hidden"
        disabled={disabled || isUploading}
      />
      <Button
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
