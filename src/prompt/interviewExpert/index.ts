import { InterviewExpertSystemPrompt } from "./system";

export function interviewExpertPrompt({
  projectTitle,
  projectDescription,
  projectType,
  objectives,
  sessionId,
}: {
  projectTitle: string;
  projectDescription: string;
  projectType: string;
  objectives: string[];
  sessionId: number;
}): string {
  return InterviewExpertSystemPrompt({
    projectTitle,
    projectDescription,
    projectType,
    objectives,
    sessionId,
  });
}

export * from "./system";
