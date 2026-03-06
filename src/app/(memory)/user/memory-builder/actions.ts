"use server";

import authOptions from "@/app/(auth)/authOptions";
import { createUserChat } from "@/lib/userChat/lib";
import type { ServerActionResult } from "@/lib/serverAction";
import { getServerSession } from "next-auth";

export async function createContextBuilderChat(): Promise<
  ServerActionResult<{ userChatToken: string }>
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      success: false,
      message: "Unauthorized",
      code: "unauthorized",
    };
  }

  try {
    const userChat = await createUserChat({
      userId: session.user.id,
      title: "Personal Context Interview",
      kind: "misc",
    });

    return {
      success: true,
      data: {
        userChatToken: userChat.token,
      },
    };
  } catch (error) {
    console.error("Failed to create context builder chat:", error);
    return {
      success: false,
      message: "Failed to create chat",
      code: "internal_server_error",
    };
  }
}
