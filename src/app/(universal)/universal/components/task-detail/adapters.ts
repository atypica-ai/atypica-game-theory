import { fetchDiscussionTimeline } from "@/app/(panel)/(page)/panel/project/actions";
import type { DiscussionTimelineEvent } from "@/app/(panel)/types";
import {
  fetchAnalystReportByToken,
  fetchPersonaInterviewInStudy,
} from "@/app/(study)/study/actions";
import type { UniversalTaskVM } from "@/app/(universal)/universal/task-vm";

export interface InterviewPersona {
  id: number;
  name: string;
}

export interface InterviewMessage {
  role: string;
  text: string;
}

export interface DiscussionDetailData {
  events: DiscussionTimelineEvent[];
  shouldContinue: boolean;
}

export interface InterviewDetailData {
  personas: InterviewPersona[];
  dataByPersonaId: Record<number, { conclusion: string; messages: InterviewMessage[] }>;
  shouldContinue: boolean;
}

export interface ReportDetailData {
  generatedAt: Date | null;
  shouldContinue: boolean;
}

function getObjectInput(task: UniversalTaskVM): Record<string, unknown> | null {
  if (task.part.type === "dynamic-tool") return null;
  if (!task.part.input || typeof task.part.input !== "object") return null;
  return task.part.input as Record<string, unknown>;
}

function getObjectOutput(task: UniversalTaskVM): Record<string, unknown> | null {
  if (task.part.type === "dynamic-tool") return null;
  if (!task.part.output || typeof task.part.output !== "object") return null;
  return task.part.output as Record<string, unknown>;
}

export function getDiscussionTimelineToken(task: UniversalTaskVM): string {
  const output = getObjectOutput(task);
  const input = getObjectInput(task);

  const token =
    task.part.state === "output-available"
      ? output?.timelineToken
      : input
        ? input.timelineToken
        : undefined;

  return typeof token === "string" ? token : "";
}

export async function fetchDiscussionDetailData({
  timelineToken,
  isRunning,
}: {
  timelineToken: string;
  isRunning: boolean;
}): Promise<DiscussionDetailData | null> {
  if (!timelineToken) return null;

  const result = await fetchDiscussionTimeline(timelineToken);
  if (!result.success) {
    return {
      events: [],
      shouldContinue: isRunning,
    };
  }

  return {
    events: result.data.events,
    shouldContinue: isRunning,
  };
}

export function getInterviewPersonas(task: UniversalTaskVM): InterviewPersona[] {
  const input = getObjectInput(task);
  const personasInput = input?.personas;

  if (!Array.isArray(personasInput)) return [];

  return personasInput.filter(
    (item): item is InterviewPersona =>
      !!item &&
      typeof item === "object" &&
      "id" in item &&
      typeof item.id === "number" &&
      "name" in item &&
      typeof item.name === "string",
  );
}

export async function fetchInterviewDetailData({
  personas,
  userChatToken,
  isRunning,
}: {
  personas: InterviewPersona[];
  userChatToken: string;
  isRunning: boolean;
}): Promise<InterviewDetailData | null> {
  if (!personas.length) return null;

  const results = await Promise.all(
    personas.map((persona) =>
      fetchPersonaInterviewInStudy({ userChatToken, forPersonaId: persona.id }),
    ),
  );

  const next: Record<number, { conclusion: string; messages: InterviewMessage[] }> = {};
  let anyRunning = false;

  results.forEach((result, idx) => {
    const personaId = personas[idx]?.id;
    if (!personaId || !result.success) return;

    const messages = (result.data.interviewUserChat?.messages ?? [])
      .map((message: { role: string; parts: Array<{ type: string; text?: string }> }) => {
        const text = message.parts
          .filter((part: { type: string; text?: string }) => part.type === "text")
          .map((part: { text?: string }) => part.text ?? "")
          .join("\n");
        return { role: message.role, text };
      })
      .filter((item: { role: string; text: string }) => !!item.text.trim());

    next[personaId] = {
      conclusion: result.data.conclusion,
      messages,
    };

    if (!result.data.conclusion) {
      anyRunning = true;
    }
  });

  return {
    personas,
    dataByPersonaId: next,
    shouldContinue: isRunning || anyRunning,
  };
}

export function getReportToken(task: UniversalTaskVM): string {
  const input = getObjectInput(task);
  const output = getObjectOutput(task);

  if (task.part.type === "dynamic-tool") return "";

  if (task.part.state === "output-available" && typeof output?.reportToken === "string") {
    return output.reportToken;
  }

  return typeof input?.reportToken === "string" ? input.reportToken : "";
}

export async function fetchReportDetailData({
  reportToken,
  isRunning,
}: {
  reportToken: string;
  isRunning: boolean;
}): Promise<ReportDetailData | null> {
  if (!reportToken) return null;

  const result = await fetchAnalystReportByToken(reportToken);
  if (!result.success) {
    return {
      generatedAt: null,
      shouldContinue: isRunning,
    };
  }

  return {
    generatedAt: result.data.generatedAt,
    shouldContinue: isRunning && !result.data.generatedAt,
  };
}
