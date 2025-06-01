"use client";
import { cn, useDevice } from "@/lib/utils";
import { Attachment } from "ai";
import { FileIcon, XIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
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
        <Link
          className="block relative h-8 w-8 aspect-square rounded-md overflow-hidden"
          href={attachment.url}
          target="_blank"
        >
          <Image
            src={attachment.url}
            alt={attachment.name ?? "Image"}
            fill
            sizes="100%"
            priority
            className="object-contain"
          />
        </Link>
      ) : (
        <Link
          className="h-8 w-32 flex flex-row items-center justify-start gap-1 p-2 overflow-hidden"
          href={attachment.url}
          target="_blank"
        >
          <FileIcon className="shrink-0 w-4 h-4" />
          <div className="text-xs break-all tracking-tighter truncate">{attachment.name}</div>
        </Link>
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
