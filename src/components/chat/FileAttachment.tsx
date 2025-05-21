"use client";
import { cn, useDevice } from "@/lib/utils";
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
  const { isMobile } = useDevice();
  const isImage = attachment.contentType?.startsWith("image/");
  // const isPdf = attachment.contentType === "application/pdf";

  return (
    <div
      className={cn(
        "relative group rounded-md bg-zinc-100 dark:bg-zinc-800",
        "transition-all hover:bg-zinc-200 dark:hover:bg-zinc-700",
        className,
      )}
    >
      {isImage ? (
        <div className="relative h-8 w-8 aspect-square rounded-md overflow-hidden">
          <Image
            src={attachment.url}
            alt={attachment.name ?? "Image"}
            fill
            sizes="100%"
            priority
            className="object-cover"
          />
        </div>
      ) : (
        <div className="h-8 w-24 flex flex-row items-center justify-start gap-1 p-2 overflow-hidden">
          <FileIcon className="shrink-0 h-full" />
          <div className="text-xs text-center truncate">{attachment.name}</div>
        </div>
      )}

      {onRemove && (
        <Button
          variant="destructive"
          size="icon"
          className={cn(
            "absolute top-0 right-0 h-3 w-3 translate-x-1/3 -translate-y-1/3 rounded-full",
            "opacity-0 group-hover:opacity-100 transition-opacity overflow-hidden",
            { "opacity-100": true || isMobile },
          )}
          onClick={onRemove}
        >
          <XIcon className="size-2" />
        </Button>
      )}
    </div>
  );
}
