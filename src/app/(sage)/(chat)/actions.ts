"use server";
import { SageChatExtra } from "@/app/(sage)/types";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import type { ServerActionResult } from "@/lib/serverAction";
import { createUserChat } from "@/lib/userChat/lib";
import type { SageChat, UserChat } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { generateId } from "ai";

// ===== Sage Chat =====

/**
 * Create a new sage chat session (always creates a new one, doesn't reuse existing)
 */
export async function createOrGetSageChat({
  sageToken,
  initialUserMessage,
}: {
  sageToken: string;
  initialUserMessage?: string;
}): Promise<
  ServerActionResult<{
    userChat: Pick<UserChat, "id" | "token">;
  }>
> {
  return withAuth(async (user) => {
    // Check if sage exists and is accessible
    const sage = await prisma.sage.findUnique({
      where: { token: sageToken },
      select: {
        id: true,
        name: true,
        userId: true,
      },
    });

    if (!sage) {
      return {
        success: false,
        message: "Sage not found",
        code: "not_found",
      };
    }

    let sageChat: Pick<SageChat, "id" | "extra"> & {
      userChat: Pick<UserChat, "id" | "token">;
    };

    const latestSageChat = await prisma.sageChat.findFirst({
      where: {
        sageId: sage.id,
        userId: user.id,
      },
      orderBy: {
        id: "desc",
      },
      select: {
        id: true,
        userChat: { select: { id: true, token: true } },
        extra: true,
      },
    });

    if (latestSageChat && !(latestSageChat.extra as SageChatExtra).gapDiscovered) {
      // 没有发现过 gap 的 sageChat，可以直接使用
      sageChat = latestSageChat;
    } else {
      const { userChat, newSageChat } = await prisma.$transaction(async (tx) => {
        const userChat = await createUserChat({
          userId: user.id,
          kind: "sageSession",
          title: `Chat with ${sage.name}`,
          tx,
        });
        const newSageChat = await tx.sageChat.create({
          data: {
            sageId: sage.id,
            userChatId: userChat.id,
            userId: user.id,
          },
        });
        return { newSageChat, userChat };
      });
      sageChat = { ...newSageChat, userChat };
      // Create initial user message if provided
      if (initialUserMessage) {
        await prisma.chatMessage.create({
          data: {
            userChatId: sageChat.userChat.id,
            role: "user",
            messageId: generateId(),
            content: initialUserMessage,
            parts: [{ type: "text", text: initialUserMessage }],
          },
        });
      }
    }

    rootLogger.info({
      msg: `Created new sage chat ${sageChat.id} for user ${user.id} with sage ${sage.id}`,
      hasInitialMessage: !!initialUserMessage,
    });

    return {
      success: true,
      data: {
        userChat: sageChat.userChat,
      },
    };
  });
}
