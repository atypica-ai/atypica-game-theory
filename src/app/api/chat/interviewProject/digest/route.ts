import { saveDigest } from "@/app/interviewProject/actions";
import { authOptions } from "@/lib/auth";
import { llm, providerOptions } from "@/lib/llm";
import { rootLogger } from "@/lib/logging";
import { convertDBMessageToAIMessage } from "@/lib/messageUtils";
import { prisma } from "@/lib/prisma";
import { generateDigestSystem } from "@/prompt";
import { StatReporter } from "@/tools";
import { convertToCoreMessages, smoothStream, streamText } from "ai";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const GenerateDigestBodySchema = z.object({
  projectToken: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json();
  const parseResult = GenerateDigestBodySchema.safeParse(payload);
  if (!parseResult.success) {
    const error = { message: "Invalid request", details: parseResult.error.format() };
    return NextResponse.json({ error }, { status: 400 });
  }

  const { projectToken } = parseResult.data;
  const userId = session.user.id;

  const project = await prisma.interviewProject.findUnique({
    where: {
      token: projectToken,
      userId: userId, // 确保获取用户自己的 project
    },
    include: {
      sessions: {
        where: {
          kind: "collect",
        },
        include: {
          userChat: { include: { messages: { orderBy: { createdAt: "asc" } } } },
        },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  // if (project.userId !== userId) {
  //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // }

  const allMessages: {
    sessionTitle: string;
    messages: { role: "user" | "assistant"; content: string }[];
  }[] = [];
  for (const session of project.sessions) {
    if (session.userChat && session.userChat.messages.length > 0) {
      const coreMessages = convertToCoreMessages(
        session.userChat.messages.map(convertDBMessageToAIMessage),
      ).filter((message) => message.role === "user" || message.role === "assistant");
      const messages = coreMessages.map(({ role, content }) => ({
        role,
        content:
          typeof content === "string"
            ? content
            : content
                .filter((part) => part.type === "text")
                .map(({ text }) => text)
                .join("\n"),
      }));
      allMessages.push({
        sessionTitle: session.title,
        messages,
      });
    }
  }

  if (allMessages.length === 0) {
    return NextResponse.json({ error: "No interview data available" }, { status: 400 });
  }

  const abortSignal = req.signal;
  const statReport: StatReporter = async () => {};
  const projectLogger = rootLogger.child({
    interviewProjectId: project.id,
  });
  const prologue = `访谈数据：\n${JSON.stringify(allMessages, null, 2)}\n`;

  const streamTextResult = streamText({
    model: llm("claude-3-7-sonnet"),
    providerOptions,
    system: generateDigestSystem(project),
    messages: [{ role: "user", content: prologue }],
    maxTokens: 30000,
    experimental_transform: smoothStream({
      delayInMs: 30,
      chunking: /[\u4E00-\u9FFF]|\S+\s+/,
    }),
    onFinish: async ({ text, usage }) => {
      projectLogger.info({ msg: "interview digest streamText onFinish", usage });
      await saveDigest(projectToken, text);
    },
    onError: ({ error }) => {
      projectLogger.error(`interview digest streamText onError: ${(error as Error).message}`);
    },
    abortSignal,
  });

  return streamTextResult.toDataStreamResponse();
}
