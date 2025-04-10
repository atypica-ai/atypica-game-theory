import { fetchUserChatById } from "@/data/UserChat";
import { authOptions } from "@/lib/auth";
import { appendClientMessage } from "ai";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { helloAgentRequest } from "./helloAgentRequest";
import { studyAgentRequest } from "./studyAgentRequest";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const payload = await req.json();
  const studyUserChatId = parseInt(payload["id"]);
  const newUserMessage = payload["message"];
  if (!studyUserChatId || !newUserMessage) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // fetchUserChatById 这里会检查权限
  const result = await fetchUserChatById(studyUserChatId, "study");
  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  const studyUserChat = result.data;
  const initialMessages = appendClientMessage({
    messages: studyUserChat.messages,
    message: newUserMessage,
  });

  const reqSignal = req.signal;
  const hello = payload["hello"] === "1";
  if (hello) {
    return await helloAgentRequest({ studyUserChatId, initialMessages, userId, reqSignal });
  } else {
    return await studyAgentRequest({ studyUserChatId, initialMessages, userId, reqSignal });
  }
}
