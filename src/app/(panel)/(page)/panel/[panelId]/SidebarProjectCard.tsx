"use client";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "@/lib/utils";
import { ArrowRight, Clock, FileText, Trash2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import type { ResearchProjectWithPanel } from "../../panels/actions";
import { deleteResearchProject } from "./actions";

export function SidebarProjectCard({
  project,
  onDeleted,
}: {
  project: ResearchProjectWithPanel;
  onDeleted?: (token: string) => void;
}) {
  const t = useTranslations("PersonaPanel");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteResearchProject(project.token);
    setDeleting(false);
    if (result.success) {
      toast.success(t("DetailPage.deleteProjectSuccess"));
      onDeleted?.(project.token);
    } else {
      toast.error(
        result.code === "forbidden"
          ? t("DetailPage.cannotDeleteProjectWithContent")
          : result.message,
      );
    }
  };

  return (
    <div className="group relative border border-border rounded-lg p-3 hover:border-foreground/20 transition-all">
      <Link href={`/panel/project/${project.token}`} className="block">
        <div className="flex flex-col gap-2">
          {/* Title with icon - 2 lines */}
          <div className="flex items-start gap-2">
            <FileText className="size-3.5 text-muted-foreground/60 shrink-0 mt-0.5" />
            <h4 className="text-sm font-medium leading-snug line-clamp-2 flex-1">
              {project.title || t("ListPage.projectToken", { token: project.token.slice(0, 8) })}
            </h4>
          </div>

          {/* Meta info + Arrow */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {project.panel && (
                <>
                  <div className="flex items-center gap-1 shrink-0">
                    <Users className="size-3" />
                    <span>{project.panel.personaCount}</span>
                  </div>
                  <span>·</span>
                </>
              )}
              <div className="flex items-center gap-1 shrink-0">
                <Clock className="size-3" />
                <span>{formatDistanceToNow(project.createdAt)}</span>
              </div>
            </div>
            <ArrowRight className="size-3.5 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
        </div>
      </Link>

      {/* Delete button — top-right, visible on hover */}
      <ConfirmDialog
        title={t("DetailPage.confirmDeleteProject")}
        description={t("DetailPage.deleteProjectWarning")}
        onConfirm={handleDelete}
        variant="destructive"
      >
        <Button
          variant="destructive"
          size="icon"
          disabled={deleting}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 has-[>svg]:p-1 size-6 rounded-sm text-xs scale-75"
        >
          <Trash2 className="size-3" />
        </Button>
      </ConfirmDialog>
    </div>
  );
}
