"use client";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { cn, formatDate } from "@/lib/utils";
import { PersonaExtra } from "@/prisma/client";
import { ArrowRight, Trash2 } from "lucide-react";
import { Locale, useTranslations } from "next-intl";
import Link from "next/link";
import { toast } from "sonner";
import type { PersonaPanelWithDetails } from "./actions";

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
  locale,
  onDelete,
  isDeleting,
}: {
  panel: PersonaPanelWithDetails;
  locale: Locale;
  onDelete: (panelId: number) => void;
  isDeleting: boolean;
}) {
  const t = useTranslations("PersonaPanel");

  return (
    <div className="group relative border border-border rounded-lg hover:border-foreground/20 transition-all duration-300">
      <Link href={`/panel/${panel.id}`} className="block p-4 h-full">
        <div className="flex flex-col gap-3 h-full">
          {/* Title + date */}
          <div className="space-y-1 pr-6">
            <div className="text-sm font-medium leading-snug line-clamp-2">
              {panel.title || t("panelId", { id: panel.id })}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDate(panel.createdAt, locale)}
            </div>
          </div>

          {/* Instruction */}
          {panel.instruction && (
            <p className="text-xs text-muted-foreground/80 leading-relaxed line-clamp-2">
              {panel.instruction}
            </p>
          )}

          {/* Personas preview with avatars */}
          {panel.personas.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              {panel.personas.slice(0, 3).map((persona) => {
                const extraStr = buildExtraSummary(persona.extra);
                return (
                  <div key={persona.id} className="flex items-center gap-2 min-w-0">
                    <HippyGhostAvatar seed={persona.id} className="size-5 rounded-full shrink-0" />
                    <span className="text-xs font-medium shrink-0 truncate max-w-20">
                      {persona.name}
                    </span>
                    {extraStr && (
                      <span className="text-xs text-muted-foreground/60 truncate">{extraStr}</span>
                    )}
                  </div>
                );
              })}
              {panel.personas.length > 3 && (
                <span className="text-xs text-muted-foreground/50">
                  {t("ListPage.andMore", {
                    count: panel.personas.length - 3,
                  })}
                </span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-auto flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
              <span>{t("personaCount", { count: panel.personas.length })}</span>
              {(panel.usageCount.discussions > 0 || panel.usageCount.interviews > 0) && (
                <>
                  <span>·</span>
                  <span>
                    {[
                      panel.usageCount.discussions > 0 &&
                        t("discussions", {
                          count: panel.usageCount.discussions,
                        }),
                      panel.usageCount.interviews > 0 &&
                        t("interviews", {
                          count: panel.usageCount.interviews,
                        }),
                    ]
                      .filter(Boolean)
                      .join("、")}
                  </span>
                </>
              )}
            </div>
            <ArrowRight className="size-3.5 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </Link>

      {/* Delete button */}
      {panel.usageCount.discussions > 0 || panel.usageCount.interviews > 0 ? (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toast.error(t("ListPage.cannotDeleteUsedPanel"));
          }}
          className={cn(
            "absolute top-3 right-3 size-7 rounded-md flex items-center justify-center",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "hover:bg-muted cursor-not-allowed opacity-30",
          )}
        >
          <Trash2 className="size-3.5 text-muted-foreground" />
        </button>
      ) : (
        <div
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
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
  );
}
