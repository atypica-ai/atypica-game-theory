"use client";
import { formatDistanceToNow } from "@/lib/utils";
import { ArrowRight, Clock, FileText, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { ResearchProjectWithPanel } from "./actions";

export function ProjectCard({
  project,
}: {
  project: ResearchProjectWithPanel;
  locale: string;
}) {
  const t = useTranslations("PersonaPanel");

  return (
    <Link
      href={`/panel/project/${project.token}`}
      className="group block border-b border-border pb-3 last:border-b-0"
    >
      <div className="flex flex-col gap-1.5">
        {/* Title + Arrow */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FileText className="size-3.5 text-muted-foreground shrink-0" />
            <div className="text-sm font-medium leading-snug truncate">
              {project.title || t("ListPage.projectToken", { token: project.token.slice(0, 8) })}
            </div>
          </div>
          <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>

        {/* Panel info + Persona count + Time */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground pl-5.5">
          {project.panel && (
            <>
              <span className="truncate max-w-40">
                {project.panel.title}
              </span>
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
      </div>
    </Link>
  );
}
