"use server";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import type { ServerActionResult } from "@/lib/serverAction";
import { createUserChat } from "@/lib/userChat/lib";
import type { SageChat, UserChat } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { generateId } from "ai";
import { getSageById } from "../lib";

// ===== Sage Chat =====

/**
 * Create or get sage chat session
 */
export async function createOrGetSageChat(sageId: number): Promise<
  ServerActionResult<{
    sageChat: SageChat;
    userChat: UserChat;
  }>
> {
  return withAuth(async (user) => {
    try {
      // Check if sage exists and is accessible
      const result = await getSageById(sageId);

      if (!result) {
        return {
          success: false,
          message: "Sage not found",
          code: "not_found",
        };
      }

      const { sage } = result;

      // Check if chat already exists
      const existingChat = await prisma.sageChat.findFirst({
        where: {
          sageId,
          userId: user.id,
        },
        include: {
          userChat: true,
        },
      });

      if (existingChat) {
        return {
          success: true,
          data: {
            sageChat: existingChat,
            userChat: existingChat.userChat,
          },
        };
      }

      // Create new chat
      const userChat = await createUserChat({
        userId: user.id,
        kind: "sageSession",
        title: `Chat with ${sage.name}`,
      });

      const sageChat = await prisma.sageChat.create({
        data: {
          sageId,
          userChatId: userChat.id,
          userId: user.id,
        },
      });

      rootLogger.info(`Created sage chat ${sageChat.id} for user ${user.id} with sage ${sageId}`);

      return {
        success: true,
        data: { sageChat, userChat },
      };
    } catch (error) {
      rootLogger.error(`Failed to create/get sage chat: ${error}`);
      return {
        success: false,
        message: "Failed to create chat",
        code: "internal_server_error",
      };
    }
  });
}

/**
 * Create a new sage chat session (always creates a new one, doesn't reuse existing)
 */
export async function createNewSageChat(
  sageId: number,
  initialUserMessage?: string,
): Promise<
  ServerActionResult<{
    sageChat: SageChat;
    userChat: UserChat;
  }>
> {
  return withAuth(async (user) => {
    try {
      // Check if sage exists and is accessible
      const result = await getSageById(sageId);

      if (!result) {
        return {
          success: false,
          message: "Sage not found",
          code: "not_found",
        };
      }

      const { sage } = result;

      // Always create new chat
      const userChat = await createUserChat({
        userId: user.id,
        kind: "sageSession",
        title: `Chat with ${sage.name}`,
      });

      const sageChat = await prisma.sageChat.create({
        data: {
          sageId,
          userChatId: userChat.id,
          userId: user.id,
        },
      });

      // Create initial user message if provided
      if (initialUserMessage) {
        await prisma.chatMessage.create({
          data: {
            userChatId: userChat.id,
            role: "user",
            messageId: generateId(),
            content: initialUserMessage,
            parts: [{ type: "text", text: initialUserMessage }],
          },
        });
      }

      rootLogger.info({
        msg: `Created new sage chat ${sageChat.id} for user ${user.id} with sage ${sageId}`,
        hasInitialMessage: !!initialUserMessage,
      });

      return {
        success: true,
        data: { sageChat, userChat },
      };
    } catch (error) {
      rootLogger.error(`Failed to create new sage chat: ${error}`);
      return {
        success: false,
        message: "Failed to create chat",
        code: "internal_server_error",
      };
    }
  });
}
