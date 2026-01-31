import "server-only";

import { rootLogger } from "@/lib/logging";
import { getMcpRequestContext } from "@/lib/mcp";
import { prisma } from "@/prisma/prisma";
import { UserChatExtra } from "@/prisma/client";
import {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { z } from "zod";

export const getStatusInputSchema = z.object({
  userChatToken: z.string().describe("The study session token"),
});

export async function handleGetStatus(
  args: z.infer<typeof getStatusInputSchema>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
): Promise<CallToolResult> {
  try {
    const context = getMcpRequestContext();
    if (!context?.userId) {
      throw new Error("Missing userId in request context");
    }

    const { userChatToken } = args;
    const userId = context.userId;

    const userChat = await prisma.userChat.findUnique({
      where: { token: userChatToken, kind: "study" },
      select: {
        id: true,
        userId: true,
        extra: true,
        context: true,
        analyst: {
          select: {
            kind: true,
            topic: true,
            studySummary: true,
          },
        },
      },
    });

    if (!userChat) {
      throw new Error("Study not found");
    }

    if (userChat.userId !== userId) {
      throw new Error("Unauthorized: Study does not belong to user");
    }

    const extra = userChat.extra as UserChatExtra;
    const hasError = extra && "error" in extra;
    const context_data = userChat.context as { reportTokens?: string[]; podcastTokens?: string[] };

    let status: "plan_mode" | "executing" | "completed" | "error";
    const hasArtifacts =
      (context_data.reportTokens && context_data.reportTokens.length > 0) ||
      (context_data.podcastTokens && context_data.podcastTokens.length > 0);

    if (hasError) {
      status = "error";
    } else if (!userChat.analyst?.kind) {
      status = "plan_mode";
    } else if (hasArtifacts) {
      status = "completed";
    } else {
      status = "executing";
    }

    const artifacts: { reportToken?: string; podcastToken?: string } = {};
    if (context_data.reportTokens && context_data.reportTokens.length > 0) {
      artifacts.reportToken = context_data.reportTokens[context_data.reportTokens.length - 1];
    }
    if (context_data.podcastTokens && context_data.podcastTokens.length > 0) {
      artifacts.podcastToken = context_data.podcastTokens[context_data.podcastTokens.length - 1];
    }

    return {
      content: [
        {
          type: "text",
          text: `Study status: ${status}, Kind: ${userChat.analyst?.kind || "plan_mode"}`,
        },
      ],
      structuredContent: {
        status,
        kind: userChat.analyst?.kind || null,
        topic: userChat.analyst?.topic || "",
        currentStep: userChat.analyst?.studySummary || "Initializing...",
        artifacts,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    rootLogger.error({ msg: "Failed to get study status", error: errorMessage });
    return {
      content: [{ type: "text", text: `Error getting study status: ${errorMessage}` }],
      isError: true,
    };
  }
}
