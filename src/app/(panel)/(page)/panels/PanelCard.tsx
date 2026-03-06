"use client";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { cn } from "@/lib/utils";
import { ArrowRight, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { toast } from "sonner";
import type { PersonaPanelWithDetails } from "./actions";

export function PanelCard({
  panel,
  onDelete,
  isDeleting,
}: {
  panel: PersonaPanelWithDetails;
  locale: string;
  onDelete: (panelId: number) => void;
  isDeleting: boolean;
}) {
  const t = useTranslations("PersonaPanel");

  return (
    <div className="group relative border border-border rounded-lg hover:border-foreground/20 transition-colors">
      <Link href={`/panel/${panel.id}`} className="block p-4 h-full">
        <div className="flex flex-col gap-3 h-full">
          {/* Title */}
          <div className="text-sm font-medium leading-snug line-clamp-2 pr-6">
            {panel.title || t("panelId", { id: panel.id })}
          </div>

          {/* Personas preview — stacked avatars + names */}
          {panel.personas.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5">
                {panel.personas.slice(0, 5).map((persona) => (
                  <HippyGhostAvatar
                    key={persona.id}
                    seed={persona.id}
                    className="size-5 rounded-full ring-2 ring-background"
                  />
                ))}
              </div>
              {panel.personas.length > 5 && (
                <span className="text-xs text-muted-foreground">
                  +{panel.personas.length - 5}
                </span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-auto flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{t("personaCount", { count: panel.personas.length })}</span>
              {(panel.usageCount.discussions > 0 || panel.usageCount.interviews > 0) && (
                <>
                  <span>·</span>
                  <span>
                    {[
                      panel.usageCount.discussions > 0 &&
                        t("discussions", { count: panel.usageCount.discussions }),
                      panel.usageCount.interviews > 0 &&
                        t("interviews", { count: panel.usageCount.interviews }),
                    ]
                      .filter(Boolean)
                      .join("、")}
                  </span>
                </>
              )}
            </div>
            <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
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
            "hover:bg-muted cursor-not-allowed",
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
