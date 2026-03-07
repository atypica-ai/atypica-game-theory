"use client";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "@/lib/utils";
import { deleteResearchProject } from "@/app/(panel)/(page)/panel/[panelId]/actions";
import { ArrowRight, Clock, FileText, Trash2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import type { ResearchProjectWithPanel } from "./actions";

export function ProjectCard({
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
    <div className="group border-b border-border pb-3 last:border-b-0">
      <div className="flex flex-col gap-1.5">
        {/* Title row: icon + text + delete */}
        <div className="flex items-start gap-2">
          <FileText className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <Link
            href={`/panel/project/${project.token}`}
            className="text-sm leading-snug line-clamp-2 flex-1"
          >
            {project.title ||
              t("ListPage.projectToken", { token: project.token.slice(0, 8) })}
          </Link>
          <ConfirmDialog
            title={t("DetailPage.confirmDeleteProject")}
            description={t("DetailPage.deleteProjectWarning")}
            onConfirm={handleDelete}
            variant="destructive"
          >
            <Button
              variant="ghost"
              size="icon"
              disabled={deleting}
              className="opacity-0 group-hover:opacity-100 has-[>svg]:p-1 size-6 rounded-sm text-muted-foreground hover:text-destructive shrink-0"
            >
              <Trash2 className="size-3" />
            </Button>
          </ConfirmDialog>
        </div>

        {/* Meta info + Arrow */}
        <Link
          href={`/panel/project/${project.token}`}
          className="flex items-center justify-between gap-2 pl-5.5"
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {project.panel && (
              <>
                <span className="truncate max-w-40">{project.panel.title}</span>
                <span>·</span>
                <div className="flex items-center gap-1 shrink-0">
                  <Users className="size-3" />
                  <span>{project.panel.personaCount}</span>
                </div>
              </>
            )}
            <div className="flex items-center gap-1 shrink-0">
              <Clock className="size-3" />
              <span>{formatDistanceToNow(project.createdAt)}</span>
            </div>
          </div>
          <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
        </Link>
      </div>
    </div>
  );
}
