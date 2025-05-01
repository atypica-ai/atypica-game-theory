import { authOptions } from "@/lib/auth";
import { llm, providerOptions } from "@/lib/llm";
import { prepareMessagesForStreaming } from "@/lib/messageUtils";
import { prisma } from "@/lib/prisma";
import { scoutBuildPersonaSystem } from "@/prompt";
import { personaBuildSchema } from "@/tools/system/savePersona";
import { streamObject } from "ai";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const payload = await req.json();
  const scoutUserChatId = parseInt(payload["id"]);
  if (!scoutUserChatId) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // 找到有效的 userChat，并确保有权限
  const userChat = await prisma.userChat.findUnique({
    where: { id: scoutUserChatId, kind: "scout" },
  });
  if (!userChat) {
    return NextResponse.json({ error: "UserChat not found" }, { status: 404 });
  }
  if (userChat.userId != userId) {
    return NextResponse.json(
      { error: "UserChat does not belong to the current user" },
      { status: 403 },
    );
  }

  const { coreMessages } = await prepareMessagesForStreaming(scoutUserChatId);
  const schema = z.object({
    persona1: personaBuildSchema(),
    persona2: personaBuildSchema(),
    persona3: personaBuildSchema(),
    persona4: personaBuildSchema(),
    persona5: personaBuildSchema(),
    persona6: personaBuildSchema(),
  });

  const response = streamObject({
    model: llm("gpt-4o"), // gpt 可以对一个字段的值进行 stream，这样在 prompt 生成部分的时候就可以看到结果，比较快
    // temperature: 0,
    providerOptions: providerOptions,
    system: scoutBuildPersonaSystem(),
    messages: coreMessages,
    schema,
  });

  return response.toTextStreamResponse();
}
