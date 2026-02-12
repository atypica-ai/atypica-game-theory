"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn, formatDate } from "@/lib/utils";
import { ArrowRight, MessageCircle, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { deletePersonaPanel, fetchUserPersonaPanels, PersonaPanelWithDetails } from "./actions";

export function PersonaPanelsListClient() {
  const t = useTranslations("PersonaPanel");
  const locale = useLocale();
  const [panels, setPanels] = useState<PersonaPanelWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingPanelId, setDeletingPanelId] = useState<number | null>(null);
  const [panelToDelete, setPanelToDelete] = useState<PersonaPanelWithDetails | null>(null);

  const loadPanels = useCallback(async () => {
    setLoading(true);
    const result = await fetchUserPersonaPanels();
    if (result.success) {
      setPanels(result.data);
    } else {
      toast.error(t("loadingFailed"));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    loadPanels();
  }, [loadPanels]);

  const handleDeletePanel = useCallback((panel: PersonaPanelWithDetails) => {
    if (panel.usageCount.discussions > 0 || panel.usageCount.interviews > 0) {
      toast.error(t("cannotDeleteUsedPanel"));
      return;
    }
    setPanelToDelete(panel);
  }, [t]);

  const confirmDelete = useCallback(async () => {
    if (!panelToDelete) return;

    setDeletingPanelId(panelToDelete.id);
    const result = await deletePersonaPanel(panelToDelete.id);
    setDeletingPanelId(null);
    setPanelToDelete(null);

    if (result.success) {
      toast.success(t("deleteSuccess"));
      await loadPanels();
    } else {
      toast.error(t("deleteFailed"));
    }
  }, [panelToDelete, t, loadPanels]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>

          {/* Panels Grid */}
          {panels.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* New Panel Card */}
              <Link
                href="/sage"
                className="group border border-dashed border-border rounded-lg p-5 hover:border-green-500/30 transition-all duration-300 flex flex-col items-center justify-center gap-3 min-h-[150px]"
              >
                <div className="size-10 rounded-full border border-border flex items-center justify-center group-hover:border-green-500/50 group-hover:bg-green-500/5 transition-all">
                  <Plus className="size-5 text-muted-foreground" />
                </div>
                <div className="text-sm text-center space-y-1">
                  <div className="font-medium">{t("createNewPanel")}</div>
                  <div className="text-xs text-muted-foreground">
                    {t("createNewPanelDescription")}
                  </div>
                </div>
              </Link>

              {/* Existing Panels */}
              {panels.map((panel) => (
                <div
                  key={panel.id}
                  className="group relative border border-border rounded-lg hover:border-foreground/20 transition-all duration-300"
                >
                  <Link href={`/persona/panels/${panel.id}`} className="block p-4">
                    <div className="flex flex-col gap-2.5">
                      {/* Title */}
                      <div className="text-sm font-medium leading-snug line-clamp-2 min-h-[2.5rem]">
                        {panel.title || t("panelId", { id: panel.id })}
                      </div>

                      {/* Instruction */}
                      {panel.instruction && (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {panel.instruction}
                        </p>
                      )}

                      {/* Meta */}
                      <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                        <span>{panel.personas.length} personas</span>
                        <span>·</span>
                        <span>{formatDate(panel.createdAt, locale)}</span>
                      </div>

                      {/* Personas preview */}
                      {panel.personas.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {panel.personas.slice(0, 3).map((persona, i) => (
                            <span key={i} className="text-xs text-muted-foreground/70">
                              {persona.name}
                            </span>
                          ))}
                          {panel.personas.length > 3 && (
                            <span className="text-xs text-muted-foreground/50">
                              +{panel.personas.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Arrow */}
                      <div className="flex justify-end mt-auto">
                        <ArrowRight className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </Link>

                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeletePanel(panel);
                    }}
                    disabled={deletingPanelId === panel.id}
                    className={cn(
                      "absolute top-3 right-3 size-7 rounded-md flex items-center justify-center",
                      "opacity-0 group-hover:opacity-100 transition-opacity",
                      "hover:bg-muted",
                      panel.usageCount.discussions > 0 || panel.usageCount.interviews > 0
                        ? "cursor-not-allowed opacity-30"
                        : "",
                    )}
                  >
                    <Trash2 className="size-3.5 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="size-12 rounded-full border border-dashed border-border flex items-center justify-center">
                <MessageCircle className="size-6 text-muted-foreground" />
              </div>
              <div className="text-center space-y-1">
                <div className="text-sm font-medium">{t("createNewPanel")}</div>
                <div className="text-xs text-muted-foreground">
                  {t("createNewPanelDescription")}
                </div>
              </div>
              <Link
                href="/sage"
                className="mt-2 text-sm hover:underline flex items-center gap-1.5"
              >
                {t("startDiscussion")}
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!panelToDelete} onOpenChange={() => setPanelToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {panelToDelete && t("deleteWarning", { id: panelToDelete.id })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              {deletingPanelId ? t("deleting") : t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
