"use client";
import { formatDistanceToNow } from "@/lib/utils";
import { ArrowRight, Clock, FileText, Users } from "lucide-react";
import { Locale, useTranslations } from "next-intl";
import Link from "next/link";
import type { ResearchProjectWithPanel } from "../../panels/actions";

export function SidebarProjectCard({
  project,
}: {
  project: ResearchProjectWithPanel;
  locale: Locale;
}) {
  const t = useTranslations("PersonaPanel");

  return (
    <Link
      href={`/panel/project/${project.token}`}
      className="group block border border-border rounded-lg p-3 hover:border-foreground/20 transition-all"
    >
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
  );
}
