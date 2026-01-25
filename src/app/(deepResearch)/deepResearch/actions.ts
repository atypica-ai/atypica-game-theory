"use server";

import { persistentAIMessageToDB } from "@/ai/messageUtils";
import { checkTezignAuth } from "@/app/admin/actions";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { truncateForTitle } from "@/lib/textUtils";
import { createUserChat } from "@/lib/userChat/lib";
import type { ChatMessage, UserChat } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { generateId, UIMessage } from "ai";
import { ExpertName } from "../experts/types";

type DeepResearchUserChat = Omit<UserChat, "kind"> & {
  kind: "misc";
  messages?: UIMessage[];
};

/**
 * Create a new DeepResearch UserChat session
 */
export async function createDeepResearchUserChatAction({
  query,
  expert,
}: {
  query: string;
  expert: ExpertName;
}): Promise<ServerActionResult<DeepResearchUserChat>> {
  // Check Tezign auth first (throws if unauthorized)
  await checkTezignAuth();

  return withAuth(async (user) => {
    // Resolve expert (auto -> grok)
    const resolvedExpert = expert === ExpertName.Auto ? ExpertName.Grok : expert;

    // Create initial user message
    const message: UIMessage = {
      id: generateId(),
      role: "user",
      parts: [{ type: "text", text: query }],
    };

    // Create UserChat with kind="misc"
    const userChat = await createUserChat({
      userId: user.id,
      title: truncateForTitle(query, {
        maxDisplayWidth: 50,
        suffix: "...",
      }),
      kind: "misc",
      // Store resolved expert in extra field (no "auto")
      extra: { deepResearchExpert: resolvedExpert },
    });

    // Persist initial message
    await persistentAIMessageToDB({
      userChatId: userChat.id,
      message,
    });

    return {
      success: true,
      data: {
        ...userChat,
        kind: "misc",
        messages: [message],
      },
    };
  });
}

/**
 * Fetch DeepResearch UserChat by token with messages
 */
export async function fetchDeepResearchUserChatAction(userChatToken: string): Promise<
  ServerActionResult<{
    userChat: DeepResearchUserChat;
    messages: UIMessage[];
  }>
> {
  // Check Tezign auth first (throws if unauthorized)
  await checkTezignAuth();

  return withAuth(async (user) => {
    const userChat = await prisma.userChat.findUnique({
      where: { token: userChatToken, kind: "misc" },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!userChat) {
      return {
        success: false,
        message: "DeepResearch session not found",
        code: "not_found",
      };
    }

    if (userChat.userId !== user.id) {
      return {
        success: false,
        message: "Unauthorized access to DeepResearch session",
        code: "forbidden",
      };
    }

    // Convert database messages to UIMessage format
    const messages: UIMessage[] = userChat.messages.map((msg: ChatMessage) => ({
      id: msg.messageId,
      role: msg.role as "user" | "assistant",
      parts: msg.parts as UIMessage["parts"],
    }));

    return {
      success: true,
      data: {
        userChat: {
          id: userChat.id,
          userId: userChat.userId,
          token: userChat.token,
          title: userChat.title,
          kind: "misc",
          context: userChat.context,
          extra: userChat.extra,
          createdAt: userChat.createdAt,
          updatedAt: userChat.updatedAt,
          backgroundToken: userChat.backgroundToken,
        },
        messages,
      },
    };
  });
}

/**
 * Fetch recent DeepResearch UserChat history
 */
export async function fetchDeepResearchHistoryAction({
  take = 10,
}: {
  take?: number;
} = {}): Promise<
  ServerActionResult<
    Array<{
      id: number;
      token: string;
      title: string;
      updatedAt: Date;
    }>
  >
> {
  // Check Tezign auth first (throws if unauthorized)
  await checkTezignAuth();

  return withAuth(async (user) => {
    const userChats = await prisma.userChat.findMany({
      where: {
        userId: user.id,
        kind: "misc",
      },
      orderBy: { updatedAt: "desc" },
      take,
      select: {
        id: true,
        token: true,
        title: true,
        updatedAt: true,
        extra: true,
      },
    });

    // Filter to only DeepResearch sessions (those with deepResearchExpert in extra)
    const deepResearchSessions = userChats
      .filter((chat) => {
        const extra = chat.extra as { deepResearchExpert?: string };
        return extra?.deepResearchExpert !== undefined;
      })
      .map((chat) => ({
        id: chat.id,
        token: chat.token,
        title: chat.title,
        updatedAt: chat.updatedAt,
      }));

    return {
      success: true,
      data: deepResearchSessions,
    };
  });
}
