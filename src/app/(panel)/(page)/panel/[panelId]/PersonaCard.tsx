"use client";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { buildExtraSummary, getTierLabel } from "./PersonaDetailDialog";
import type { PersonaPanelWithDetails } from "./actions";

type PersonaData = PersonaPanelWithDetails["personas"][number];

interface PersonaCardProps {
  persona: PersonaData;
  onClick: () => void;
  onRemove: () => void;
}

export function PersonaCard({ persona, onClick, onRemove }: PersonaCardProps) {
  const t = useTranslations("PersonaPanel.DetailPage");
  const extraSummary = buildExtraSummary(persona.extra);

  return (
    <div
      className={cn(
        "group relative border border-border rounded-lg p-4",
        "hover:border-foreground/20 transition-all duration-300 cursor-pointer",
      )}
      onClick={onClick}
    >
      {/* Remove button */}
      <div
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <ConfirmDialog
          title={t("confirmRemovePersona")}
          description={t("removePersonaWarning", { name: persona.name })}
          onConfirm={onRemove}
          variant="destructive"
        >
          <button className="size-7 rounded-md flex items-center justify-center hover:bg-muted">
            <X className="size-3.5 text-muted-foreground" />
          </button>
        </ConfirmDialog>
      </div>

      <div className="flex gap-3">
        <HippyGhostAvatar seed={persona.id} className="size-10 rounded-lg shrink-0 bg-muted/50" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="text-sm font-medium leading-snug truncate pr-6">{persona.name}</div>
          {extraSummary && (
            <div className="text-[11px] text-muted-foreground truncate">{extraSummary}</div>
          )}
          <div className="flex items-center gap-1.5">
            {persona.source && (
              <span className="text-xs text-muted-foreground/50">{persona.source}</span>
            )}
            <Badge
              variant="outline"
              className="text-[9px] h-4 px-1 font-normal text-muted-foreground/60 border-muted-foreground/20"
            >
              {getTierLabel(persona.tier)}
            </Badge>
          </div>
        </div>
      </div>

      {persona.tags && persona.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3 pt-2 border-t border-border/50">
          {persona.tags.slice(0, 4).map((tag, i) => (
            <span
              key={i}
              className="text-xs text-muted-foreground/50 bg-muted/50 px-1.5 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
          {persona.tags.length > 4 && (
            <span className="text-xs text-muted-foreground/40">+{persona.tags.length - 4}</span>
          )}
        </div>
      )}
    </div>
  );
}
