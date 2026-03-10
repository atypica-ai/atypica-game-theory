"use client";
import { archivePersona, fetchUserPersonas } from "@/app/(persona)/actions";
import { UnarchiveButton } from "@/components/ArchiveButton";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDate } from "@/lib/utils";
import { useLocale } from "next-intl";
import Link from "next/link";

type PersonaWithStatus = ExtractServerActionData<typeof fetchUserPersonas>[number];

export function ArchivedPersonaItem({
  persona,
  onUnarchived,
}: {
  persona: PersonaWithStatus;
  onUnarchived: () => void;
}) {
  const locale = useLocale();

  return (
    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 group">
      <Link href={`/personas/${persona.token}`} className="flex items-center gap-3 flex-1 min-w-0">
        <HippyGhostAvatar seed={persona.token} className="size-6 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate">{persona.name}</div>
          <div className="text-[11px] text-muted-foreground">
            {formatDate(persona.createdAt, locale)}
          </div>
        </div>
      </Link>
      <UnarchiveButton
        onUnarchive={async () => {
          const result = await archivePersona(persona.id, false);
          if (result.success) onUnarchived();
          return result;
        }}
      />
    </div>
  );
}
