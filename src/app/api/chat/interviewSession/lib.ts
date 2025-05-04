import { prisma } from "@/lib/prisma";
import { InputJsonValue } from "@prisma/client/runtime/library";
import { Message } from "ai";
import { z } from "zod";

// Helper to save chat messages
export async function saveChatMessage({
  userChatId,
  message,
}: {
  userChatId: number;
  message: Message;
}) {
  const { id: messageId, role, content, parts } = message;

  // Save message to database
  await prisma.chatMessage.create({
    data: {
      messageId,
      userChatId,
      role,
      content,
      parts: (parts || [{ type: "text", text: content }]) as unknown as InputJsonValue,
    },
  });

  // Update chat timestamp
  await prisma.userChat.update({
    where: { id: userChatId },
    data: { updatedAt: new Date() },
  });
}

type t = Message["role"];
export const ClarifySessionBodySchema = z.object({
  message: z.object({
    id: z.string(),
    role: z.enum(["user", "assistant", "system", "data"]),
    content: z.string(),
    parts: z.custom<NonNullable<Message["parts"]>>().optional(),
  }),
  id: z.number(), // User chat ID
  projectId: z.number(),
  sessionId: z.number(),
});
