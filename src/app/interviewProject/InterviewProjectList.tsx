"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { InterviewSessionStatus } from "@/prisma/client";
import { CalendarDaysIcon, FolderPlus, NotebookPenIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InterviewProjectWithSessions } from "./actions";

export function InterviewProjectList({ projects }: { projects: InterviewProjectWithSessions[] }) {
  const t = useTranslations("InterviewProject");

  return (
    <main className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="flex flex-col space-y-6 container mx-auto py-8 px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          {/* <Button onClick={() => router.push("/interviewProject/create")}>
            <FolderPlus className="mr-2 h-4 w-4" />
            {t("newProject")}
          </Button> */}
        </div>
        {projects.length === 0 ? (
          <EmptyProjectState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function EmptyProjectState() {
  const router = useRouter();
  const t = useTranslations("InterviewProject");

  return (
    <div className="flex flex-col items-center justify-center text-center p-12 border border-dashed rounded-lg space-y-6">
      <div className="bg-primary/10 rounded-full p-4">
        <FolderPlus className="h-10 w-10 text-primary" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">{t("emptyState.title")}</h3>
        <p className="text-muted-foreground max-w-md">{t("emptyState.description")}</p>
      </div>
      <Button onClick={() => router.push("/interviewProject/create")}>
        <FolderPlus className="mr-2 h-4 w-4" />
        {t("createFirstProject")}
      </Button>
    </div>
  );
}

function ProjectCard({ project }: { project: InterviewProjectWithSessions }) {
  const t = useTranslations("InterviewProject.projectCard");
  const locale = useLocale();
  const activeSessionsCount = project.sessions.filter(
    (s) => s.kind === "collect" && s.status === InterviewSessionStatus.active,
  ).length;
  const completedSessionsCount = project.sessions.filter(
    (s) => s.kind === "collect" && s.status === InterviewSessionStatus.completed,
  ).length;
  const collectSessionsCount = project.sessions.filter((s) => s.kind === "collect").length;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center">
          <NotebookPenIcon className="flex-shrink-0 w-5 h-5 mr-2" />
          <CardTitle className="line-clamp-1">{project.title}</CardTitle>
        </div>
        <CardDescription className="line-clamp-2 mt-2">{project.brief}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="bg-muted/50 rounded p-3 text-sm">
          <div className="font-medium mb-1">
            {t("projectCategory")}: {project.category}
          </div>
          <ul className="list-disc list-inside text-muted-foreground">
            {project.objectives.slice(0, 3).map((objective, i) => (
              <li key={i} className="line-clamp-1">
                {objective}
              </li>
            ))}
            {project.objectives.length > 3 && (
              <li>
                +{project.objectives.length - 3} {t("moreObjectives")}
              </li>
            )}
          </ul>
        </div>
        <div className="flex items-center mt-4 text-sm text-muted-foreground">
          <CalendarDaysIcon className="mr-1 h-4 w-4" />
          <span>
            {t("updated")} {formatDate(project.updatedAt, locale)}
          </span>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-3 pt-0">
        <div className="w-full text-sm">
          {t("collectSessions", {
            total: collectSessionsCount,
            active: activeSessionsCount,
            completed: completedSessionsCount,
          })}
        </div>
        <div className="flex space-x-2 w-full">
          <Button size="sm" className="flex-1" asChild>
            <Link href={`/interviewProject/${project.token}`}>{t("viewProject")}</Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
