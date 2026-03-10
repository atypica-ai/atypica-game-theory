"use client";
import {
  archiveInterviewProject,
  fetchUserInterviewProjects,
} from "@/app/(interviewProject)/actions";
import { UnarchiveButton } from "@/components/ArchiveButton";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDate } from "@/lib/utils";
import { useLocale } from "next-intl";
import Link from "next/link";

type TProject = ExtractServerActionData<typeof fetchUserInterviewProjects>[number];

export function ArchivedInterviewItem({
  project,
  onUnarchived,
}: {
  project: TProject;
  onUnarchived: () => void;
}) {
  const locale = useLocale();

  return (
    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 group">
      <Link href={`/interview/project/${project.token}`} className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">{project.brief || "Untitled"}</div>
        <div className="text-[11px] text-muted-foreground">
          {formatDate(project.createdAt, locale)}
        </div>
      </Link>
      <UnarchiveButton
        onUnarchive={async () => {
          const result = await archiveInterviewProject(project.id, false);
          if (result.success) onUnarchived();
          return result;
        }}
      />
    </div>
  );
}
