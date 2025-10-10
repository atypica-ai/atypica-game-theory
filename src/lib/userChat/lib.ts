import "server-only";

import { llm } from "@/ai/provider";
import { VALID_LOCALES } from "@/i18n/routing";
import { getRequestClientIp, getRequestGeo, getRequestUserAgent } from "@/lib/request/headers";
import { generateToken } from "@/lib/utils";
import { UserChat, UserChatExtra, UserChatKind } from "@/prisma/client";
import { ITXClientDenyList } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { generateText, UIMessage, UserModelMessage } from "ai";
import { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { truncateForTitle } from "../textUtils";

export async function createUserChat<TKind extends UserChatKind>({
  userId,
  kind,
  token,
  title,
  tx,
  extra: _extra,
}: {
  userId: number;
  kind: TKind;
  token?: string;
  title: string;
  tx?: Omit<typeof prisma, ITXClientDenyList>;
  extra?: Record<string, string | number>;
}): Promise<Omit<UserChat, "kind" | "extra"> & { kind: TKind; extra: UserChatExtra }> {
  if (!tx) {
    tx = prisma;
  }
  const [clientIp, userAgent, geo] = await Promise.all([
    getRequestClientIp(),
    getRequestUserAgent(),
    getRequestGeo(),
  ]);
  if (!token) {
    token = generateToken();
  }
  const extra = {
    ..._extra,
    ...{ clientIp, userAgent, geo, locale: await getLocale() }, // 发起 chat 时候的客户端信息，不用于后续逻辑判断
  };
  const userChat = await tx.userChat.create({
    data: { userId, title, kind, token, extra },
  });
  return {
    ...userChat,
    kind,
    extra: userChat.extra as UserChatExtra,
  };
}

/**
 * 设置或删除 UserChat 的错误信息到 extra.error 字段
 * 使用 PostgreSQL JSON 操作符直接更新，避免并发问题
 * @param userChatId - UserChat ID
 * @param error - 错误信息，如果为 null 则删除 error 字段
 */
export async function setUserChatError(userChatId: number, error: string | null) {
  if (error === null) {
    // 删除 error 字段
    await prisma.$executeRaw`
      UPDATE "UserChat"
      SET "extra" = COALESCE("extra", '{}') - 'error',
          "updatedAt" = NOW()
      WHERE "id" = ${userChatId}
    `;
  } else {
    // 设置 error 字段
    await prisma.$executeRaw`
      UPDATE "UserChat"
      SET "extra" = COALESCE("extra", '{}') || ${{ error }}::jsonb,
          "updatedAt" = NOW()
      WHERE "id" = ${userChatId}
    `;
  }
}

export async function generateChatTitle(userChatId: number): Promise<string> {
  const { analyst, messages } = await prisma.userChat.findUniqueOrThrow({
    where: { id: userChatId },
    select: {
      id: true,
      token: true,
      analyst: {
        select: { locale: true },
      },
      messages: {
        select: { role: true, parts: true },
        orderBy: { id: "asc" },
      },
    },
  });

  const messagesText = messages
    .map(
      (msg) =>
        `#${msg.role}:\n${((msg.parts as UIMessage["parts"]) ?? [])
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("")}\n\n`,
    )
    .join("");

  const locale =
    analyst?.locale && VALID_LOCALES.includes(analyst.locale as Locale)
      ? (analyst.locale as Locale)
      : await getLocale();

  const { text } = await generateText({
    model: llm("gpt-5-nano"),
    providerOptions: {
      openai: {
        // ...defaultProviderOptions.openai,
        reasoningSummary: "auto",
        reasoningEffort: "minimal",
      } satisfies OpenAIResponsesProviderOptions,
    },
    system:
      locale === "zh-CN"
        ? `
你是一位专业的对话标题生成专家，需要为这次对话生成一个准确、专业且易于理解的主题标题。

任务要求：
1. 仔细分析整个对话的核心内容和主要议题
2. 识别对话类型和用户的真实需求
3. 生成一个能准确概括对话主题的标题

对话类型识别指南：
- 研究规划对话：用户在规划或讨论研究方向、目标、方法
- 访谈对话：进行结构化访谈，收集特定信息或观点
- 人设构建对话：基于访谈内容构建AI人设或用户画像
- 分析讨论对话：对特定话题进行深入分析和讨论
- 咨询对话：寻求专业建议或解决方案

标题生成原则：
- 长度控制：25字以内，确保简洁但信息丰富
- 语言风格：使用专业但通俗易懂的商业研究语言
- 结构偏好：优先使用名词性短语，避免动词开头
- 内容聚焦：突出核心主题、研究对象或业务场景
- 价值体现：隐含业务价值和实际应用意义
- 客观中性：避免主观评价词汇，保持专业客观

输出要求：
直接输出标题文本，不需要解释或前缀。标题应该让用户一看就能回忆起这次对话的核心内容。`
        : `
You are a professional conversation title generation expert who needs to create an accurate, professional, and easily understandable topic title for this conversation.

Task Requirements:
1. Carefully analyze the core content and main topics of the entire conversation
2. Identify the conversation type and user's real needs
3. Generate a title that accurately summarizes the conversation theme

Conversation Type Identification Guide:
- Research planning conversations: User planning or discussing research directions, objectives, methods
- Interview conversations: Conducting structured interviews to collect specific information or viewpoints
- Persona building conversations: Building AI personas or user profiles based on interview content
- Analysis discussions: In-depth analysis and discussion of specific topics
- Consultation conversations: Seeking professional advice or solutions

Title Generation Principles:
- Length control: Within 18 words, ensuring conciseness while being information-rich
- Language style: Use professional but accessible business research language
- Structure preference: Prefer noun phrases, avoid starting with verbs
- Content focus: Highlight core themes, research subjects, or business scenarios
- Value demonstration: Imply business value and practical application significance
- Objective neutrality: Avoid subjective evaluative vocabulary, maintain professional objectivity

Output Requirements:
Directly output the title text without explanation or prefix. The title should allow users to immediately recall the core content of this conversation.`,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: locale === "zh-CN" ? "以下是对话内容" : "Here are the conversation details",
          },
          { type: "text", text: messagesText },
        ],
      },
    ] as UserModelMessage[],
  });

  await prisma.userChat.update({
    where: { id: userChatId },
    data: { title: truncateForTitle(text, { maxDisplayWidth: 100, suffix: "..." }) },
  });
  return text;
}

// export async function deleteMessageFromUserChat(
//   userChatId: number,
//   messageId: string,
// ): Promise<ServerActionResult<Message[]>> {
//   return withAuth(async (user) => {
//     const userChat = await prisma.userChat.findUnique({
//       where: { id: userChatId },
//     });
//     if (userChat?.userId != user.id) {
//       return {
//         success: false,
//         code: "forbidden",
//         message: "UserChat does not belong to the current user",
//       };
//     }
//     const newMessages = [...messages];
//     const index = newMessages.findIndex((message) => message.id === messageId);
//     if (index >= 0 && newMessages[index].role === "user") {
//       if (newMessages[index + 1]?.role === "assistant") {
//         newMessages.splice(index, 2);
//       } else {
//         newMessages.splice(index, 1);
//       }
//     }
//     await prisma.userChat.update({
//       where: { id: userChatId },
//       data: { messages: newMessages as unknown as InputJsonValue },
//     });
//     return {
//       success: true,
//       data: newMessages,
//     };
//   });
// }
