"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn, formatDate } from "@/lib/utils";
import {
  CalendarIcon,
  Loader2Icon,
  MessageCircleIcon,
  PlusIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { deletePersonaPanel, fetchUserPersonaPanels } from "./actions";

type PersonaPanelWithDetails = ExtractServerActionData<typeof fetchUserPersonaPanels>[number];

export function PersonaPanelsListClient() {
  const t = useTranslations("PersonaPanel");
  const locale = useLocale();
  const [panels, setPanels] = useState<PersonaPanelWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingPanelId, setDeletingPanelId] = useState<number | null>(null);
  const [panelToDelete, setPanelToDelete] = useState<PersonaPanelWithDetails | null>(null);

  const loadPanels = useCallback(async () => {
    try {
      const result = await fetchUserPersonaPanels();
      if (!result.success) throw result;
      setPanels(result.data);
    } catch (error) {
      console.error("Failed to fetch persona panels:", error);
      toast.error(t("loadingFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadPanels();
  }, [loadPanels]);

  const handleDeletePanel = useCallback(
    async (panel: PersonaPanelWithDetails) => {
      if (panel.usageCount.discussions > 0 || panel.usageCount.interviews > 0) {
        toast.error(t("cannotDeleteUsedPanel"));
        return;
      }
      setPanelToDelete(panel);
    },
    [t],
  );

  const confirmDelete = useCallback(async () => {
    if (!panelToDelete) return;

    setDeletingPanelId(panelToDelete.id);
    try {
      const result = await deletePersonaPanel(panelToDelete.id);
      if (!result.success) throw result;

      toast.success(t("deleteSuccess"));
      setPanels((prev) => prev.filter((p) => p.id !== panelToDelete.id));
      setPanelToDelete(null);
    } catch (error) {
      console.error("Failed to delete panel:", error);
      toast.error(t("deleteFailed"));
    } finally {
      setDeletingPanelId(null);
    }
  }, [panelToDelete, t]);

  const NewPanelCard = () => (
    <Card className="transition-all duration-300 hover:shadow-md border-dashed border-primary/30 min-w-80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="bg-primary/20 rounded-full p-1">
            <PlusIcon className="size-4 text-primary" />
          </div>
          {t("createNewPanel")}
        </CardTitle>
      </CardHeader>
      <CardContent className="mt-auto">
        <div className="text-sm text-muted-foreground text-center mb-4">
          {t("createNewPanelDescription")}
        </div>
        <Button variant="secondary" asChild className="w-full" size="sm">
          <Link href="/panel/timeline" className="flex items-center gap-2">
            <PlusIcon className="size-3" />
            {t("startDiscussion")}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="container mx-auto px-8 py-12 max-w-6xl">
          <div className="flex justify-center items-center h-64">
            <Loader2Icon className="size-8 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="container mx-auto px-8 py-8 max-w-6xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded bg-primary text-primary-foreground mb-2">
              <UsersIcon className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">{t("subtitle")}</p>
          </div>

          {/* Panels Grid */}
          {panels.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <NewPanelCard />
              {panels.map((panel) => (
                <Card key={panel.id} className="transition-all duration-300 hover:shadow-md">
                  <CardHeader>
                    <CardTitle>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-xs gap-2 font-normal text-muted-foreground">
                          <CalendarIcon className="h-3 w-3" />
                          {formatDate(panel.createdAt, locale)}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePanel(panel)}
                          disabled={deletingPanelId === panel.id}
                          className={cn(
                            "h-7 px-2",
                            panel.usageCount.discussions > 0 || panel.usageCount.interviews > 0
                              ? "opacity-50 cursor-not-allowed"
                              : "",
                          )}
                        >
                          <Trash2Icon className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardTitle>
                    <CardDescription className="mt-3">
                      <div className="text-sm font-medium text-foreground">
                        {t("panelId", { id: panel.id })}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {t("personaCount", { count: panel.personas.length })}
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {/* Persona List */}
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        {t("personas")}:
                      </div>
                      <div className="space-y-1">
                        {panel.personas.slice(0, 3).map((persona) => (
                          <div key={persona.id} className="text-sm flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            <span className="truncate">{persona.name}</span>
                          </div>
                        ))}
                        {panel.personas.length > 3 && (
                          <div className="text-sm text-muted-foreground">
                            {t("andMore", { count: panel.personas.length - 3 })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Usage Stats */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Badge variant="secondary" className="text-xs">
                        <MessageCircleIcon className="h-3 w-3 mr-1" />
                        {t("discussions", { count: panel.usageCount.discussions })}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        <UsersIcon className="h-3 w-3 mr-1" />
                        {t("interviews", { count: panel.usageCount.interviews })}
                      </Badge>
                    </div>

                    {/* Tags from first persona */}
                    {panel.personas[0]?.tags &&
                      Array.isArray(panel.personas[0].tags) &&
                      panel.personas[0].tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {panel.personas[0].tags.slice(0, 2).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {String(tag)}
                            </Badge>
                          ))}
                          {panel.personas[0].tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{panel.personas[0].tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex justify-center">
              <NewPanelCard />
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!panelToDelete} onOpenChange={() => setPanelToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("confirmDelete")}</DialogTitle>
            <DialogDescription>
              {t("deleteWarning", { id: panelToDelete?.id ?? 0 })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPanelToDelete(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deletingPanelId !== null}
            >
              {deletingPanelId ? (
                <>
                  <Loader2Icon className="size-4 mr-2 animate-spin" />
                  {t("deleting")}
                </>
              ) : (
                t("delete")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
