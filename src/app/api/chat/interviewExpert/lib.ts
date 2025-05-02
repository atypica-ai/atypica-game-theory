import { prisma } from "@/lib/prisma";
import { InputJsonValue } from "@prisma/client/runtime/library";
import { Message } from "ai";

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
