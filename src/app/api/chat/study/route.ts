import { authOptions } from "@/lib/auth";
import { Message } from "ai";
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
  const initialMessages = payload["messages"] as Message[];
  if (!studyUserChatId || !initialMessages) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const reqSignal = req.signal;
  const hello = payload["hello"] === "1";
  if (hello) {
    return await helloAgentRequest({ studyUserChatId, initialMessages, userId, reqSignal });
  } else {
    return await studyAgentRequest({ studyUserChatId, initialMessages, userId, reqSignal });
  }
}
