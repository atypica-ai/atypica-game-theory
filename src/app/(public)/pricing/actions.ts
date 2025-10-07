"use server";
import { persistentAIMessageToDB } from "@/ai/messageUtils";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { truncateForTitle } from "@/lib/textUtils";
import { createUserChat } from "@/lib/userChat/lib";
import { UserChat } from "@/prisma/client";
import { generateId, UIMessage } from "ai";

export async function createHelloUserChatAction({
  role,
  content,
}: {
  role: "user" | "assistant";
  content: string;
}): Promise<ServerActionResult<Omit<UserChat, "kind"> & { kind: "misc" }>> {
  return withAuth(async (user) => {
    const message: UIMessage = {
      id: generateId(),
      role,
      parts: [{ type: "text", text: content }],
    };
    const userChat = await createUserChat({
      userId: user.id,
      title: truncateForTitle(content, {
        maxDisplayWidth: 50,
        suffix: "...",
      }),
      kind: "misc",
    });
    await persistentAIMessageToDB(userChat.id, message);
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
