"use client";
import { UnarchiveButton } from "@/components/ArchiveButton";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDate } from "@/lib/utils";
import { useLocale } from "next-intl";
import Link from "next/link";
import { archiveStudy, fetchUserStudies } from "./actions";

type TStudy = ExtractServerActionData<typeof fetchUserStudies>[number];

export function ArchivedStudyItem({
  study,
  onUnarchived,
}: {
  study: TStudy;
  onUnarchived: () => void;
}) {
  const locale = useLocale();

  return (
    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 group">
      <Link href={`/study/${study.token}`} className="flex items-center gap-3 flex-1 min-w-0">
        <HippyGhostAvatar seed={study.id} className="size-6 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate">{study.title || "Untitled"}</div>
          <div className="text-[11px] text-muted-foreground">
            {formatDate(study.updatedAt, locale)}
          </div>
        </div>
      </Link>
      <UnarchiveButton
        onUnarchive={async () => {
          const result = await archiveStudy(study.id, false);
          if (result.success) onUnarchived();
          return result;
        }}
      />
    </div>
  );
}
