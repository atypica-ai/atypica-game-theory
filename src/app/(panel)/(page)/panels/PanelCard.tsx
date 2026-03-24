"use client";
import { ArchiveButton } from "@/components/ArchiveButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { cn, formatDistanceToNow } from "@/lib/utils";
import type { PersonaExtra } from "@/prisma/client";
import { ArrowRight, Clock, MessageSquare, Mic, Pencil, Trash2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import type { PersonaPanelWithDetails } from "./actions";
import { EditPanelTitleDialog } from "./EditPanelTitleDialog";

/** Build compact extra summary based on role */
function buildExtraSummary(extra: PersonaExtra): string {
  if (!extra) return "";
  const parts: string[] = [];
  if (extra.role === "consumer") {
    if (extra.ageRange) parts.push(extra.ageRange);
    if (extra.location) parts.push(extra.location);
    if (extra.title) parts.push(extra.title);
  } else if (extra.role === "buyer") {
    if (extra.title) parts.push(extra.title);
    if (extra.industry) parts.push(extra.industry);
    if (extra.organization) parts.push(extra.organization);
  } else if (extra.role === "expert") {
    if (extra.title) parts.push(extra.title);
    if (extra.industry) parts.push(extra.industry);
    if (extra.experience) parts.push(extra.experience);
  }
  return parts.join(" · ");
}

export function PanelCard({
  panel,
  onDelete,
  onArchive,
  onRenamed,
  isDeleting,
}: {
  panel: PersonaPanelWithDetails;
  onDelete: (panelId: number) => void;
  onArchive?: (panelId: number) => Promise<{ success: boolean }>;
  onRenamed?: () => void;
  isDeleting: boolean;
}) {
  const t = useTranslations("PersonaPanel");
  const [editTitleOpen, setEditTitleOpen] = useState(false);

  const hasUsage = panel.usageCount.discussions > 0 || panel.usageCount.interviews > 0;

  return (
    <div className="group relative border border-border rounded-lg hover:border-foreground/20 transition-all duration-300 flex flex-col">
      <EditPanelTitleDialog
        open={editTitleOpen}
        onOpenChange={setEditTitleOpen}
        panelId={panel.id}
        initialTitle={panel.title}
        onSaved={() => onRenamed?.()}
      />
      <Link href={`/panel/${panel.id}`} className="flex p-4 flex-1 flex-col">
        {/* Title — 2 lines */}
        <div className="flex items-center gap-2 mb-1">
          <div className="flex -space-x-1.5 shrink-0">
            {panel.personas.slice(0, 3).map((persona) => (
              <HippyGhostAvatar
                key={persona.id}
                seed={persona.id}
                className="size-5 rounded-full ring-2 ring-background"
              />
            ))}
          </div>
          <div className="flex-1 min-w-0 text-sm font-semibold leading-snug line-clamp-2 max-md:pr-[5.75rem] md:pointer-coarse:pr-[5.75rem] md:pointer-fine:group-hover:pr-[5.75rem] transition-[padding]">
            {panel.title || t("panelId", { id: panel.id })}
          </div>
        </div>

        {/* Instruction / description */}
        {panel.instruction && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mt-2">
            {panel.instruction}
          </p>
        )}

        {/* Personas preview */}
        {panel.personas.length > 0 && (
          <div className="space-y-1.5 pt-2 mt-2 mb-2 border-t border-border/50 flex-1">
            {panel.personas.slice(0, 3).map((persona, i) => {
              const extraStr = buildExtraSummary(persona.extra);
              const isLast = i === Math.min(2, panel.personas.length - 1);
              const remaining = panel.personas.length - 3;
              return (
                <div key={persona.id} className="flex items-center gap-2 min-w-0">
                  <HippyGhostAvatar seed={persona.id} className="size-5 rounded-full shrink-0" />
                  <span className="text-xs font-medium shrink-0 truncate max-w-20">
                    {persona.name}
                  </span>
                  {extraStr && (
                    <span className="text-xs text-muted-foreground truncate">{extraStr}</span>
                  )}
                  {isLast && remaining > 0 && (
                    <span className="text-xs text-muted-foreground shrink-0">+{remaining}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer: icon stats + arrow */}
        <div className="flex flex-wrap items-center pt-3 mt-auto border-t border-border/50 text-xs text-muted-foreground gap-x-3 gap-y-1.5 min-w-0">
          <div className="flex items-center gap-1 shrink-0">
            <Users className="size-3" />
            <span>{panel.personas.length}</span>
          </div>
          {panel.usageCount.discussions > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              <MessageSquare className="size-3" />
              <span>{panel.usageCount.discussions}</span>
            </div>
          )}
          {panel.usageCount.interviews > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              <Mic className="size-3" />
              <span>{panel.usageCount.interviews}</span>
            </div>
          )}
          <div className="flex items-center gap-1 shrink-0">
            <Clock className="size-3" />
            <span>{formatDistanceToNow(panel.updatedAt)}</span>
          </div>
          <ArrowRight className="size-3.5 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all ml-auto shrink-0" />
        </div>
      </Link>

      <div className="absolute top-3 right-3 z-10 flex items-center gap-0.5 opacity-100 md:pointer-fine:opacity-0 md:pointer-fine:group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          title={t("ListPage.editPanelTitle")}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setEditTitleOpen(true);
          }}
          className="size-7 rounded-md flex items-center justify-center hover:bg-muted shrink-0"
        >
          <Pencil className="size-3.5 text-muted-foreground" />
        </button>
        {onArchive && <ArchiveButton onArchive={() => onArchive(panel.id)} />}
        {hasUsage ? (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toast.error(t("ListPage.cannotDeleteUsedPanel"));
            }}
            className="size-7 rounded-md flex items-center justify-center hover:bg-muted cursor-not-allowed"
          >
            <Trash2 className="size-3.5 text-muted-foreground" />
          </button>
        ) : (
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <ConfirmDialog
              title={t("ListPage.confirmDelete")}
              description={t("ListPage.deleteWarning", { id: panel.id })}
              onConfirm={() => onDelete(panel.id)}
              variant="destructive"
            >
              <button
                disabled={isDeleting}
                className={cn(
                  "size-7 rounded-md flex items-center justify-center hover:bg-muted",
                  isDeleting && "opacity-50",
                )}
              >
                <Trash2 className="size-3.5 text-muted-foreground" />
              </button>
            </ConfirmDialog>
          </div>
        )}
      </div>
    </div>
  );
}
