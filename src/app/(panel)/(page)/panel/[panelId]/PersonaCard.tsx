"use client";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { getTierLabel } from "./PersonaDetailDialog";
import type { PersonaPanelWithDetails } from "./actions";

type PersonaData = PersonaPanelWithDetails["personas"][number];

interface PersonaCardProps {
  persona: PersonaData;
  onClick: () => void;
  onRemove: () => void;
}

export function PersonaCard({ persona, onClick, onRemove }: PersonaCardProps) {
  const t = useTranslations("PersonaPanel.DetailPage");

  return (
    <div
      className={cn(
        "group relative border border-border rounded-lg p-4",
        "hover:border-foreground/20 transition-all duration-300 cursor-pointer",
        "flex flex-col justify-between min-h-[180px]",
      )}
      onClick={onClick}
    >
      {/* Tier badge - top right, hidden on hover */}
      <Badge
        variant="outline"
        className="absolute top-3 right-3 text-[9px] h-4 px-1.5 font-normal text-muted-foreground/60 border-muted-foreground/20 group-hover:opacity-0 transition-opacity"
      >
        {getTierLabel(persona.tier)}
      </Badge>

      {/* Remove button - top right, shown on hover */}
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
          <button className="size-7 rounded-md flex items-center justify-center hover:bg-muted bg-background">
            <X className="size-3.5 text-muted-foreground" />
          </button>
        </ConfirmDialog>
      </div>

      {/* Top section: avatar + name + title + quote */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <HippyGhostAvatar seed={persona.id} className="size-10 rounded-lg shrink-0 bg-muted/50" />
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="text-sm font-medium leading-snug truncate pr-8">{persona.name}</div>
            {persona.extra?.title && (
              <div className="text-[11px] text-muted-foreground/70 uppercase tracking-wider truncate">
                {persona.extra.title}
              </div>
            )}
          </div>
        </div>

        {/* Quote */}
        {persona.extra?.quote && (
          <p className="text-xs text-muted-foreground/80 leading-relaxed line-clamp-3">
            {persona.extra.quote}
          </p>
        )}
      </div>

      {/* Bottom section: tags */}
      {persona.tags && persona.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-border/50">
          {persona.tags.map((tag, i) => (
            <span
              key={i}
              className="text-xs text-muted-foreground/50 bg-muted/50 px-1.5 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
