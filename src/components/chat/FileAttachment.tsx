"use client";
import { cn } from "@/lib/utils";
import { FileIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { Button } from "../ui/button";
import { FileUploadInfo } from "./FileUploadButton";

interface FileAttachmentProps {
  file: FileUploadInfo;
  onRemove?: () => void;
  className?: string;
}

export function FileAttachment({ file, onRemove, className }: FileAttachmentProps) {
  const isImage = file.mimeType?.startsWith("image/");
  const isPdf = file.mimeType === "application/pdf";

  return (
    <div
      className={cn(
        "relative group flex flex-col items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-700 overflow-hidden",
        "w-32 h-32",
        "transition-all hover:border-zinc-300 dark:hover:border-zinc-600",
        className,
      )}
    >
      {isImage ? (
        <div className="relative w-full h-full">
          <Image src={file.url} alt={file.name ?? "Image"} fill className="object-cover" />
        </div>
      ) : isPdf ? (
        <div className="flex flex-col items-center justify-center space-y-2 p-2">
          <FileIcon className="h-10 w-10 text-red-500" />
          <span className="text-xs text-center truncate max-w-full">{file.name}</span>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-2 p-2">
          <FileIcon className="h-10 w-10 text-blue-500" />
          <span className="text-xs text-center truncate max-w-full">{file.name}</span>
        </div>
      )}

      {onRemove && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onRemove}
        >
          <XIcon className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
