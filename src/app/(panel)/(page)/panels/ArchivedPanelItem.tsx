"use client";
import { UnarchiveButton } from "@/components/ArchiveButton";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { formatDistanceToNow } from "@/lib/utils";
import Link from "next/link";
import type { PersonaPanelWithDetails } from "./actions";
import { archivePersonaPanel } from "./actions";

export function ArchivedPanelItem({
  panel,
  onUnarchived,
}: {
  panel: PersonaPanelWithDetails;
  onUnarchived: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 group">
      <Link href={`/panel/${panel.id}`} className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex -space-x-1.5 shrink-0">
          {panel.personas.slice(0, 2).map((persona) => (
            <HippyGhostAvatar
              key={persona.id}
              seed={persona.id}
              className="size-5 rounded-full ring-2 ring-background"
            />
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate">{panel.title || `Panel #${panel.id}`}</div>
          <div className="text-[11px] text-muted-foreground">
            {formatDistanceToNow(panel.updatedAt)}
          </div>
        </div>
      </Link>
      <UnarchiveButton
        onUnarchive={async () => {
          const result = await archivePersonaPanel(panel.id, false);
          if (result.success) onUnarchived();
          return result;
        }}
      />
    </div>
  );
}
