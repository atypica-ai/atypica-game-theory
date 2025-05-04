"use client";

import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InterviewSessionStatus } from "@prisma/client";
import { CalendarDays, FilePlus, FolderPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { InterviewProjectWithSessions } from "./actions";

export function InterviewProjectList({ projects }: { projects: InterviewProjectWithSessions[] }) {
  const router = useRouter();

  return (
    <main className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="flex flex-col space-y-6 container mx-auto py-8 px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Interview Projects</h1>
          {/* <Button onClick={() => router.push("/interviewProject/create")}>
            <FolderPlus className="mr-2 h-4 w-4" />
            New Project
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
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 border border-dashed rounded-lg space-y-6">
      <div className="bg-primary/10 rounded-full p-4">
        <FolderPlus className="h-10 w-10 text-primary" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">No interview projects yet</h3>
        <p className="text-muted-foreground max-w-md">
          Create your first project to start collecting insights through expert interviews.
        </p>
      </div>
      <Button onClick={() => router.push("/interviewProject/create")}>
        <FolderPlus className="mr-2 h-4 w-4" />
        Create First Project
      </Button>
    </div>
  );
}

function ProjectCard({ project }: { project: InterviewProjectWithSessions }) {
  const router = useRouter();

  const activeSessionsCount = project.sessions.filter(
    (s) => s.status === InterviewSessionStatus.active,
  ).length;
  const completedSessionsCount = project.sessions.filter(
    (s) => s.status === InterviewSessionStatus.completed,
  ).length;
  const collectSessionsCount = project.sessions.filter((s) => s.kind === "collect").length;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center space-x-2">
          <HippyGhostAvatar seed={project.token} className="h-8 w-8" />
          <div>
            <CardTitle className="line-clamp-1">{project.title}</CardTitle>
          </div>
        </div>
        <CardDescription className="line-clamp-2 mt-2">{project.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="bg-muted/50 rounded p-3 text-sm">
          <div className="font-medium mb-1">Project Category: {project.category}</div>
          <ul className="list-disc list-inside text-muted-foreground">
            {project.objectives.slice(0, 3).map((objective, i) => (
              <li key={i} className="line-clamp-1">
                {objective}
              </li>
            ))}
            {project.objectives.length > 3 && (
              <li>+{project.objectives.length - 3} more objectives</li>
            )}
          </ul>
        </div>

        <div className="flex items-center mt-4 text-sm text-muted-foreground">
          <CalendarDays className="mr-1 h-4 w-4" />
          <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-3 pt-0">
        <div className="flex justify-between w-full text-sm">
          <span>{activeSessionsCount} active sessions</span>
          <span>{completedSessionsCount} completed</span>
          <span>{collectSessionsCount} collect sessions</span>
        </div>
        <div className="flex space-x-2 w-full">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => router.push(`/interviewProject/${project.token}`)}
          >
            View Project
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={async () => {
              router.push(`/interviewProject/${project.token}`);
            }}
          >
            <FilePlus className="mr-2 h-4 w-4" />
            New Session
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
