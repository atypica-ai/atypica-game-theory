"use client";
import { createPersonaInterviewSession } from "@/app/(interviewProject)/actions";
import { SelectPersonaDialog } from "@/components/SelectPersonaDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { Bot, MessageSquare, Share2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { InterviewReportsSection } from "./InterviewReportsSection";
import { InterviewSessionsSection } from "./InterviewSessionsSection";
import { InviteDialog } from "./InviteDialog";
import { ProjectStatsSection } from "./ProjectStatsSection";

export function ProjectDetails({
  project,
}: {
  project: {
    id: number;
    brief: string;
    createdAt: Date;
  };
}) {
  const locale = useLocale();
  const t = useTranslations("InterviewProject.projectDetails");
  // const router = useRouter();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [personaDialogOpen, setPersonaDialogOpen] = useState(false);
  const [, setCreatingPersonaSessions] = useState(false);

  const onSelectPersonas = useCallback(
    async (selectedIds: number[]) => {
      setCreatingPersonaSessions(true);
      try {
        for (const personaId of selectedIds) {
          const result = await createPersonaInterviewSession({
            projectId: project.id,
            personaId,
          });
          if (!result.success) throw result;
        }
      } catch (error) {
        toast.error((error as Error).message || t("createInterviewFailed"));
      } finally {
        setCreatingPersonaSessions(false);
        window.location.reload();
      }
    },
    [project.id, t],
  );

  return (
    <div className="space-y-6 my-6 container mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">
            {t("title")} #{project.id}
          </h1>
          <p className="text-muted-foreground">{formatDate(project.createdAt, locale)}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => setInviteDialogOpen(true)}>
            <Share2 className="h-4 w-4" />
            {t("interviewHuman")}
          </Button>
          <Button variant="outline" onClick={() => setPersonaDialogOpen(true)}>
            <Bot className="h-4 w-4" />
            {t("interviewAI")}
          </Button>
        </div>
      </div>

      {/* Project Brief */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            {t("projectBrief")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap leading-relaxed text-sm max-h-64 overflow-scroll scrollbar-thin">
            {project.brief}
          </p>
        </CardContent>
      </Card>

      {/* Statistics */}
      <ProjectStatsSection projectId={project.id} />

      {/* Sessions List */}
      <InterviewSessionsSection projectId={project.id} />

      {/* Reports Section */}
      <InterviewReportsSection projectId={project.id} />

      <InviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        projectId={project.id}
      />
      <SelectPersonaDialog
        open={personaDialogOpen}
        onOpenChange={setPersonaDialogOpen}
        onSelect={onSelectPersonas}
      />
    </div>
  );
}
