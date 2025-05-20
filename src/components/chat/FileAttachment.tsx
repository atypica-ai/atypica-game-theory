"use client";
import { cn } from "@/lib/utils";
import { Attachment } from "ai";
import { FileIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { Button } from "../ui/button";

export function FileAttachment({
  attachment,
  onRemove,
  className,
}: {
  attachment: Attachment;
  onRemove?: () => void;
  className?: string;
}) {
  const isImage = attachment.contentType?.startsWith("image/");
  const isPdf = attachment.contentType === "application/pdf";

  return (
    <div
      className={cn(
        "relative group flex flex-col items-center justify-center rounded-md bg-zinc-200 dark:bg-zinc-700",
        "w-32 h-32",
        "transition-all hover:bg-zinc-300 dark:hover:bg-zinc-600",
        className,
      )}
    >
      {isImage ? (
        <div className="relative w-full h-full rounded-md overflow-hidden">
          <Image
            src={attachment.url}
            alt={attachment.name ?? "Image"}
            fill
            sizes="100%"
            priority
            className="object-cover"
          />
        </div>
      ) : isPdf ? (
        <div className="flex flex-col items-center justify-center space-y-2 p-2">
          <FileIcon className="h-10 w-10 text-red-500" />
          <span className="text-xs text-center truncate max-w-full">{attachment.name}</span>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-2 p-2">
          <FileIcon className="h-10 w-10 text-blue-500" />
          <span className="text-xs text-center truncate max-w-full">{attachment.name}</span>
        </div>
      )}

      {onRemove && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-0 right-0 h-5 w-5 max-w-2/5 max-h-2/5 translate-x-1/3 -translate-y-1/3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onRemove}
        >
          <XIcon className="size-2/3" />
        </Button>
      )}
    </div>
  );
}
