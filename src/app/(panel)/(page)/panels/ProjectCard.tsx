"use client";
import { formatDistanceToNow } from "@/lib/utils";
import { ArrowRight, Clock, FileText, Users } from "lucide-react";
import { Locale, useTranslations } from "next-intl";
import Link from "next/link";
import type { ResearchProjectWithPanel } from "./actions";

export function ProjectCard({
  project,
  // locale,
}: {
  project: ResearchProjectWithPanel;
  locale: Locale;
}) {
  const t = useTranslations("PersonaPanel");

  return (
    <Link
      href={`/panel/project/${project.token}`}
      className="group block border-b border-border pb-4"
    >
      <div className="flex flex-col gap-2">
        {/* Title + Arrow */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FileText className="size-3.5 text-muted-foreground/60 shrink-0" />
            <div className="text-sm font-medium leading-snug truncate">
              {project.title || t("ListPage.projectToken", { token: project.token.slice(0, 8) })}
            </div>
          </div>
          <ArrowRight className="size-3.5 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>

        {/* Panel info + Persona count + Time */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {project.panel && (
            <>
              <span className="px-2 py-0.5 rounded-full bg-muted truncate max-w-40">
                {project.panel.title}
              </span>
              {/*<span>·</span>*/}
              <div className="flex items-center gap-1 shrink-0">
                <Users className="size-3" />
                <span>{project.panel.personaCount}</span>
              </div>
              {/*<span>·</span>*/}
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
