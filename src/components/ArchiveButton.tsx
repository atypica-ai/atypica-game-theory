"use client";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";
import { ArchiveIcon, ArchiveRestoreIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

export function ArchiveButton({ onArchive }: { onArchive: () => Promise<{ success: boolean }> }) {
  const t = useTranslations("Archive");
  const [loading, setLoading] = useState(false);

  const handleArchive = async () => {
    setLoading(true);
    try {
      const result = await onArchive();
      if (result.success) {
        toast.success(t("archiveSuccess"));
      } else {
        toast.error(t("archiveFailed"));
      }
    } catch {
      toast.error(t("archiveFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <ConfirmDialog
        title={t("confirmArchive")}
        description={t("confirmArchiveDescription")}
        onConfirm={handleArchive}
      >
        <button
          disabled={loading}
          className={cn(
            "size-7 rounded-md flex items-center justify-center hover:bg-muted",
            loading && "opacity-50",
          )}
        >
          <ArchiveIcon className="size-3.5 text-muted-foreground" />
        </button>
      </ConfirmDialog>
    </div>
  );
}

export function UnarchiveButton({
  onUnarchive,
}: {
  onUnarchive: () => Promise<{ success: boolean }>;
}) {
  const t = useTranslations("Archive");
  const [loading, setLoading] = useState(false);

  const handleUnarchive = async () => {
    setLoading(true);
    try {
      const result = await onUnarchive();
      if (result.success) {
        toast.success(t("unarchiveSuccess"));
      } else {
        toast.error(t("archiveFailed"));
      }
    } catch {
      toast.error(t("archiveFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleUnarchive();
      }}
      disabled={loading}
      className={cn(
        "size-7 rounded-md flex items-center justify-center hover:bg-muted shrink-0",
        loading && "opacity-50",
      )}
    >
      <ArchiveRestoreIcon className="size-3.5 text-muted-foreground" />
    </button>
  );
}
