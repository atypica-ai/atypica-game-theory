"use server";
import { convertDBMessageToAIMessage, persistentAIMessageToDB } from "@/ai/messageUtils";
import { initGenericUserChatStatReporter } from "@/ai/tools/stats";
import {
  confirmPanelResearchPlanInputSchema,
  type ConfirmPanelResearchPlanInput,
  type ConfirmPanelResearchPlanOutput,
} from "@/app/(panel)/tools/confirmPanelResearchPlan/types";
import { DiscussionTimelineEvent } from "@/app/(panel)/types";
import { UserChatContext } from "@/app/(study)/context/types";
import { executeUniversalAgent } from "@/app/(universal)/agent";
import { UniversalToolName } from "@/app/(universal)/tools/types";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import type { AgentStatisticsExtra, Persona, UserChatExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { getLocale } from "next-intl/server";
import { after } from "next/server";

export interface DiscussionSummary {
  token: string;
  instruction: string;
  summary: string;
  eventCount: number;
  participantIds: number[];
  createdAt: Date;
  isComplete: boolean;
}

export interface PanelDiscussionDetail {
  timeline: {
    token: string;
    instruction: string;
    events: DiscussionTimelineEvent[];
    summary: string;
    minutes: string;
    createdAt: Date;
  };
  personas: Pick<Persona, "id" | "name" | "token" | "tags" | "extra">[];
}

export interface PanelInterview {
  id: number | null;
  personaId: number;
  personaName: string;
  status: "completed" | "in-progress" | "pending";
  conclusion: string;
  messageCount: number;
  interviewUserChat: {
    token: string;
    extra: UserChatExtra;
  } | null;
  createdAt: Date;
}

export interface InterviewBatch {
  id: string;
  instruction: string;
  createdAt: Date;
  interviews: PanelInterview[];
}

export interface ProjectProgress {
  status: "running" | "completed";
  phase: "planning" | "researching" | "discussion" | "interviews" | "synthesizing" | "completed";
  latestStep: string | null;
  recentSteps: string[];
  lastMessage: string | null;
  updatedAt: Date;
}

function humanizeToolCallName(toolName: string) {
  if (toolName === "discussionChat") return "Running discussion";
  if (toolName === "interviewChat") return "Running interviews";
  if (toolName === "searchPersonas") return "Searching personas";
  if (toolName === "buildPersona") return "Building personas";
  if (toolName === "planStudy") return "Planning study";
  if (toolName === "scoutTaskChat") return "Running scout tasks";
  if (toolName === "scoutSocialTrends") return "Analyzing social trends";
  if (toolName === "webSearch") return "Searching web";
  if (toolName === "generateReport") return "Generating report";
  return `Running ${toolName}`;
}

function detectPhase(recentSteps: string[], isRunning: boolean): ProjectProgress["phase"] {
  if (!isRunning) return "completed";

  const joined = recentSteps.join(" | ").toLowerCase();
  if (joined.includes("interview")) return "interviews";
  if (joined.includes("discussion")) return "discussion";
  if (
    joined.includes("search") ||
    joined.includes("scout") ||
    joined.includes("persona") ||
    joined.includes("web")
  ) {
    return "researching";
  }
  if (joined.includes("report") || joined.includes("summary")) return "synthesizing";
  return "planning";
}

export async function fetchProjectProgress(
  userChatToken: string,
): Promise<ServerActionResult<ProjectProgress>> {
  return withAuth(async (user) => {
    const project = await prisma.userChat.findUnique({
      where: { token: userChatToken, userId: user.id },
      select: { id: true, extra: true, updatedAt: true },
    });

    if (!project) {
      return { success: false, code: "not_found", message: "Project not found" };
    }

    const recentStepStats = await prisma.chatStatistics.findMany({
      where: {
        userChatId: project.id,
        dimension: "steps",
      },
      orderBy: { id: "desc" },
      take: 6,
      select: {
        createdAt: true,
        extra: true,
      },
    });

    const recentSteps: string[] = [];
    for (const stat of recentStepStats) {
      const extra = stat.extra;
      const toolCalls = Array.isArray(extra.toolCalls)
        ? extra.toolCalls.filter((item): item is string => typeof item === "string")
        : [];

      if (toolCalls.length > 0) {
        for (const toolName of toolCalls) {
          recentSteps.push(humanizeToolCallName(toolName));
        }
      } else if (typeof extra.reportedBy === "string" && extra.reportedBy.trim() !== "") {
        recentSteps.push(extra.reportedBy);
      }
    }

    const recentAssistantMessage = await prisma.chatMessage.findFirst({
      where: {
        userChatId: project.id,
        role: "assistant",
      },
      orderBy: { id: "desc" },
      select: {
        content: true,
        updatedAt: true,
      },
    });

    const lastMessage =
      recentAssistantMessage?.content?.replace(/\s+/g, " ").trim().slice(0, 180) || null;

    const latestStep = recentSteps[0] ?? null;
    const status: ProjectProgress["status"] = project.extra?.runId ? "running" : "completed";
    const phase = detectPhase(recentSteps, status === "running");
    const updatedAt =
      recentAssistantMessage?.updatedAt && recentAssistantMessage.updatedAt > project.updatedAt
        ? recentAssistantMessage.updatedAt
        : project.updatedAt;

    return {
      success: true,
      data: {
        status,
        phase,
        latestStep,
        recentSteps: recentSteps.slice(0, 6),
        lastMessage,
        updatedAt,
      },
    };
  });
}

export async function fetchProjectContextByToken(userChatToken: string): Promise<
  ServerActionResult<{
    panelId: number;
    panelTitle: string;
    project: {
      token: string;
      title: string;
      kind: string;
      extra: UserChatExtra;
      context: UserChatContext;
      createdAt: Date;
    };
  }>
> {
  return withAuth(async (user) => {
    const userChat = await prisma.userChat.findUnique({
      where: { token: userChatToken, userId: user.id },
      select: {
        token: true,
        title: true,
        kind: true,
        extra: true,
        context: true,
        createdAt: true,
      },
    });

    if (!userChat) {
      return { success: false, code: "not_found", message: "Project not found" };
    }

    const context = userChat.context;
    const panelId = context.personaPanelId;
    if (typeof panelId !== "number") {
      return { success: false, code: "forbidden", message: "Project is not attached to a panel" };
    }

    const panel = await prisma.personaPanel.findUnique({
      where: { id: panelId, userId: user.id },
      select: { id: true, title: true },
    });

    if (!panel) {
      return { success: false, code: "forbidden", message: "Panel not found" };
    }

    return {
      success: true,
      data: {
        panelId: panel.id,
        panelTitle: panel.title,
        project: {
          token: userChat.token,
          title: userChat.title,
          kind: userChat.kind,
          extra: userChat.extra,
          context,
          createdAt: userChat.createdAt,
        },
      },
    };
  });
}

export interface PendingConfirmPlan {
  toolCallId: string;
  input: ConfirmPanelResearchPlanInput;
}

type ProjectToolData = {
  discussions: DiscussionSummary[];
  interviewBatches: InterviewBatch[];
  totalPersonas: number;
  pendingConfirmPlan: PendingConfirmPlan | null;
};

function extractDiscussionParticipantIds(events: DiscussionTimelineEvent[]) {
  return [
    ...new Set(
      events
        .filter(
          (event): event is DiscussionTimelineEvent & { type: "persona-reply" } =>
            event.type === "persona-reply",
        )
        .map((event) => event.personaId),
    ),
  ];
}

function toPanelInterviewStatus(params: {
  conclusion: string;
  interviewRunning: boolean;
}): PanelInterview["status"] {
  if (params.conclusion !== "") return "completed";
  if (params.interviewRunning) return "in-progress";
  return "pending";
}

async function fetchProjectToolData({
  userId,
  userChatToken,
}: {
  userId: number;
  userChatToken: string;
}): Promise<ProjectToolData | null> {
  const userChat = await prisma.userChat.findUnique({
    where: { token: userChatToken, userId },
    select: {
      id: true,
      context: true,
      messages: {
        orderBy: { id: "asc" },
        select: { messageId: true, role: true, parts: true, extra: true, createdAt: true },
      },
    },
  });
  if (!userChat) return null;

  const panelId =
    typeof userChat.context.personaPanelId === "number"
      ? userChat.context.personaPanelId
      : null;
  if (!panelId) {
    return {
      discussions: [],
      interviewBatches: [],
      totalPersonas: 0,
      pendingConfirmPlan: null,
    };
  }

  // Track confirmPanelResearchPlan state
  let pendingConfirmPlan: PendingConfirmPlan | null = null;
  let confirmPlanHasOutput = false;

  const discussionCalls = new Map<
    string,
    { toolCallId: string; timelineToken: string; instruction: string; createdAt: Date }
  >();
  const interviewCalls = new Map<
    string,
    {
      toolCallId: string;
      instruction: string;
      personas: Array<{ id: number; name: string }>;
      createdAt: Date;
    }
  >();

  for (const dbMessage of userChat.messages) {
    const message = convertDBMessageToAIMessage(dbMessage);
    for (const part of message.parts ?? []) {
      if (!isToolUIPart(part)) continue;
      const toolName = getToolName(part);

      if (toolName === "discussionChat") {
        const output =
          part.state === "output-available" && part.output && typeof part.output === "object"
            ? (part.output as Record<string, unknown>)
            : null;
        const input =
          part.input && typeof part.input === "object"
            ? (part.input as Record<string, unknown>)
            : {};
        const timelineToken =
          (typeof output?.timelineToken === "string" ? output.timelineToken : null) ??
          (typeof input.timelineToken === "string" ? input.timelineToken : null);
        if (!timelineToken) continue;
        discussionCalls.set(part.toolCallId, {
          toolCallId: part.toolCallId,
          timelineToken,
          instruction: typeof input.instruction === "string" ? input.instruction : "",
          createdAt: dbMessage.createdAt,
        });
      }

      if (toolName === "interviewChat") {
        const input =
          part.input && typeof part.input === "object"
            ? (part.input as Record<string, unknown>)
            : null;
        if (!input) continue;
        const rawPersonas = Array.isArray(input.personas) ? input.personas : [];
        const personas = rawPersonas
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const value = item as Record<string, unknown>;
            if (typeof value.id !== "number" || typeof value.name !== "string") return null;
            return { id: value.id, name: value.name };
          })
          .filter((item): item is { id: number; name: string } => item !== null);
        if (personas.length === 0) continue;

        interviewCalls.set(part.toolCallId, {
          toolCallId: part.toolCallId,
          instruction: typeof input.instruction === "string" ? input.instruction : "",
          personas,
          createdAt: dbMessage.createdAt,
        });
      }

      if (toolName === UniversalToolName.confirmPanelResearchPlan) {
        if (part.state === "input-available") {
          const parsed = confirmPanelResearchPlanInputSchema.safeParse(part.input);
          if (parsed.success) {
            pendingConfirmPlan = { toolCallId: part.toolCallId, input: parsed.data };
          }
        }
        if (part.state === "output-available") {
          confirmPlanHasOutput = true;
        }
      }
    }
  }

  const discussionTokens = Array.from(
    new Set(Array.from(discussionCalls.values()).map((call) => call.timelineToken)),
  );
  const timelines =
    discussionTokens.length > 0
      ? await prisma.discussionTimeline.findMany({
          where: {
            token: { in: discussionTokens },
            personaPanel: { userId },
          },
          select: {
            token: true,
            instruction: true,
            events: true,
            summary: true,
            createdAt: true,
          },
        })
      : [];
  const timelineMap = new Map(timelines.map((timeline) => [timeline.token, timeline]));

  const sortedDiscussionCalls = Array.from(discussionCalls.values()).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
  const discussions: DiscussionSummary[] = [];
  const seenDiscussionToken = new Set<string>();
  for (const call of sortedDiscussionCalls) {
    if (seenDiscussionToken.has(call.timelineToken)) continue;
    seenDiscussionToken.add(call.timelineToken);
    const timeline = timelineMap.get(call.timelineToken);
    const events = (timeline?.events ?? []) as DiscussionTimelineEvent[];

    discussions.push({
      token: call.timelineToken,
      instruction: timeline?.instruction || call.instruction,
      summary: timeline?.summary ?? "",
      eventCount: events.length,
      participantIds: extractDiscussionParticipantIds(events),
      createdAt: timeline?.createdAt ?? call.createdAt,
      isComplete: (timeline?.summary ?? "") !== "",
    });
  }

  const sortedInterviewCalls = Array.from(interviewCalls.values()).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
  const allPersonaIds = Array.from(
    new Set(sortedInterviewCalls.flatMap((call) => call.personas.map((persona) => persona.id))),
  );
  const interviewRows =
    allPersonaIds.length > 0
      ? await prisma.analystInterview.findMany({
          where: {
            personaPanelId: panelId,
            personaId: { in: allPersonaIds },
          },
          include: {
            persona: { select: { id: true, name: true } },
            interviewUserChat: {
              select: {
                token: true,
                extra: true,
                _count: { select: { messages: true } },
              },
            },
          },
          orderBy: { updatedAt: "desc" },
        })
      : [];
  const interviewByPersonaId = new Map<number, (typeof interviewRows)[number]>();
  for (const row of interviewRows) {
    if (typeof row.personaId !== "number") continue;
    if (!interviewByPersonaId.has(row.personaId)) {
      interviewByPersonaId.set(row.personaId, row);
    }
  }

  const interviewBatches: InterviewBatch[] = sortedInterviewCalls.map((call) => ({
    id: call.toolCallId,
    instruction: call.instruction,
    createdAt: call.createdAt,
    interviews: call.personas.map((persona) => {
      const row = interviewByPersonaId.get(persona.id);
      if (!row) {
        return {
          id: null,
          personaId: persona.id,
          personaName: persona.name,
          status: "pending",
          conclusion: "",
          messageCount: 0,
          interviewUserChat: null,
          createdAt: call.createdAt,
        } satisfies PanelInterview;
      }

      return {
        id: row.id,
        personaId: row.persona?.id ?? persona.id,
        personaName: row.persona?.name ?? persona.name,
        status: toPanelInterviewStatus({
          conclusion: row.conclusion,
          interviewRunning: !!row.interviewUserChat?.extra?.runId,
        }),
        conclusion: row.conclusion,
        messageCount: row.interviewUserChat?._count.messages ?? 0,
        interviewUserChat: row.interviewUserChat
          ? {
              token: row.interviewUserChat.token,
              extra: row.interviewUserChat.extra,
            }
          : null,
        createdAt: row.createdAt,
      } satisfies PanelInterview;
    }),
  }));

  return {
    discussions,
    interviewBatches,
    totalPersonas: allPersonaIds.length,
    pendingConfirmPlan: confirmPlanHasOutput ? null : pendingConfirmPlan,
  };
}

export async function fetchProjectResearchByToken(
  userChatToken: string,
): Promise<ServerActionResult<ProjectToolData>> {
  return withAuth(async (user) => {
    const data = await fetchProjectToolData({
      userId: user.id,
      userChatToken,
    });
    if (!data) {
      return { success: false, code: "not_found", message: "Project not found" };
    }
    return { success: true, data };
  });
}

export async function fetchDiscussionDetail(
  timelineToken: string,
): Promise<ServerActionResult<PanelDiscussionDetail>> {
  return withAuth(async (user) => {
    const timeline = await prisma.discussionTimeline.findUnique({
      where: { token: timelineToken },
      select: {
        token: true,
        instruction: true,
        events: true,
        summary: true,
        minutes: true,
        createdAt: true,
        personaPanel: { select: { userId: true, personaIds: true } },
      },
    });
    if (!timeline || timeline.personaPanel.userId !== user.id) {
      return { success: false, code: "not_found", message: "Discussion not found" };
    }

    const panelPersonaIds = Array.isArray(timeline.personaPanel.personaIds)
      ? timeline.personaPanel.personaIds.filter((id): id is number => typeof id === "number")
      : [];

    const personas = await prisma.persona.findMany({
      where: { id: { in: panelPersonaIds } },
      select: { id: true, name: true, token: true, tags: true, extra: true },
    });

    return {
      success: true,
      data: {
        timeline: {
          token: timeline.token,
          instruction: timeline.instruction,
          events: timeline.events ?? [],
          summary: timeline.summary,
          minutes: timeline.minutes,
          createdAt: timeline.createdAt,
        },
        personas,
      },
    };
  });
}

export async function fetchInterviewBatchesByProjectToken(
  userChatToken: string,
): Promise<ServerActionResult<{ interviewBatches: InterviewBatch[]; totalPersonas: number }>> {
  return withAuth(async (user) => {
    const data = await fetchProjectToolData({
      userId: user.id,
      userChatToken,
    });
    if (!data) {
      return { success: false, code: "not_found", message: "Project not found" };
    }

    return {
      success: true,
      data: {
        interviewBatches: data.interviewBatches,
        totalPersonas: data.totalPersonas,
      },
    };
  });
}

export async function fetchInterviewMessages(
  interviewUserChatToken: string,
): Promise<ServerActionResult<UIMessage[]>> {
  return withAuth(async (user) => {
    const interviewUserChat = await prisma.userChat.findUnique({
      where: { token: interviewUserChatToken, userId: user.id },
      select: {
        messages: { orderBy: { id: "asc" } },
      },
    });
    if (!interviewUserChat) {
      return { success: false, code: "not_found", message: "Interview not found" };
    }

    const messages: UIMessage[] = interviewUserChat.messages.map(convertDBMessageToAIMessage);

    return { success: true, data: messages };
  });
}

/**
 * Submit confirmation tool result for research plan, then re-execute agent.
 */
export async function submitResearchConfirmation(
  userChatToken: string,
  toolCallId: string,
  output: ConfirmPanelResearchPlanOutput,
): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    const userChat = await prisma.userChat.findUnique({
      where: { token: userChatToken, userId: user.id },
      select: { id: true, token: true, extra: true },
    });

    if (!userChat) {
      return { success: false, code: "not_found", message: "Chat not found" };
    }

    const lastAssistantMessage = await prisma.chatMessage.findFirst({
      where: { userChatId: userChat.id, role: "assistant" },
      orderBy: { id: "desc" },
      select: { messageId: true },
    });

    if (!lastAssistantMessage) {
      return { success: false, code: "not_found", message: "No assistant message found" };
    }

    // Persist tool result
    await persistentAIMessageToDB({
      mode: "append",
      userChatId: userChat.id,
      message: {
        id: lastAssistantMessage.messageId,
        role: "assistant",
        parts: [
          {
            type: `tool-${UniversalToolName.confirmPanelResearchPlan}` as `tool-${string}`,
            toolCallId,
            state: "output-available",
            input: {},
            output,
          },
        ],
      },
    });

    // Re-execute the agent in the background
    const locale = await getLocale();
    const logger = rootLogger.child({ userChatId: userChat.id, userChatToken: userChat.token });
    const { statReport } = initGenericUserChatStatReporter({
      userId: user.id,
      userChatId: userChat.id,
      logger,
    });

    after(
      executeUniversalAgent({
        userId: user.id,
        userChat,
        statReport,
        logger,
        locale,
      })
        .then(() => logger.info("research plan confirmed, agent re-execution completed"))
        .catch((error) =>
          logger.error({
            msg: "research plan confirmed, agent re-execution error",
            error: error instanceof Error ? error.message : String(error),
          }),
        ),
    );

    return { success: true, data: undefined };
  });
}
