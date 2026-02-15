import "server-only";

import { convertDBMessageToAIMessage } from "@/ai/messageUtils";
import { llm } from "@/ai/provider";
import { UserChatContext } from "@/app/(study)/context/types";
import { VALID_LOCALES } from "@/i18n/routing";
import { rootLogger } from "@/lib/logging";
import { getRequestClientIp, getRequestGeo, getRequestUserAgent } from "@/lib/request/headers";
import { detectInputLanguage, truncateForTitle } from "@/lib/textUtils";
import { generateToken } from "@/lib/utils";
import { UserChat, UserChatExtra, UserChatKind } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { ITXClientDenyList } from "@prisma/client/runtime/client";
import { generateText, ModelMessage, UIMessage, UserModelMessage } from "ai";
import { Locale } from "next-intl";
import { getLocale } from "next-intl/server";

export async function createUserChat<TKind extends UserChatKind>({
  userId,
  kind,
  token,
  title,
  tx,
  context,
  extra: _extra,
}: {
  userId: number;
  kind: TKind;
  token?: string;
  title: string;
  context?: UserChatContext;
  extra?: UserChatExtra;
  tx?: Omit<typeof prisma, ITXClientDenyList>;
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
    // 发起 chat 时候的客户端信息，不用于后续逻辑判断
    ...(clientIp ? { clientIp } : {}),
    ...(userAgent ? { userAgent } : {}),
    ...(geo ? { geo } : {}),
    locale: await getLocale(),
  };
  const userChat = await tx.userChat.create({
    data: {
      userId,
      title,
      kind,
      token,
      context,
      extra,
    },
  });
  return {
    ...userChat,
    kind,
    extra: userChat.extra,
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
  const { messages, ...userChat } = await prisma.userChat.findUniqueOrThrow({
    where: { id: userChatId },
    select: {
      id: true,
      token: true,
      context: true,
      extra: true,
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

  const locale: Locale =
    userChat.context.defaultLocale && VALID_LOCALES.includes(userChat.context.defaultLocale)
      ? userChat.context.defaultLocale
      : "en-US";
  // 因为这个方法一般都在 waitUntil 里执行，waitUntil 里面不能访问 request headers，可能会导致 getLocale 失效
  // : await getLocale();

  const { text } = await generateText({
    model: llm("gpt-5-nano"),
    providerOptions: {
      openai: {
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

export async function correctUserInputMessage({
  userChatId,
  messageId,
  contextMessages,
  locale: fallbackLocale,
}: {
  userChatId: number;
  messageId: string;
  contextMessages: ModelMessage[]; // 前面的消息作为上下文
  locale: Locale;
}) {
  const logger = rootLogger.child({
    userChatId,
    messageId,
    operation: "correctUserInputMessage",
  });

  try {
    logger.info({ msg: "Starting user message correction" });

    // 1. 从数据库获取当前消息
    const dbMessage = await prisma.chatMessage.findUnique({
      where: {
        messageId,
        userChatId, // ensure message belongs to userChat
      },
      select: {
        messageId: true,
        role: true,
        parts: true,
        content: true,
        extra: true,
      },
    });

    if (!dbMessage) {
      logger.warn({ msg: "Message not found or access denied" });
      return;
    }

    // 2. 提取当前消息的文本
    const { parts } = convertDBMessageToAIMessage(dbMessage);
    const textParts = parts.filter((p) => p.type === "text");
    if (textParts.length === 0) {
      logger.warn({ msg: "No text parts found in message" });
      return;
    }

    const originalText = textParts.map((p) => p.text).join("\n");

    // 3. 从 contextMessages 提取上下文文本（最近 2 条）
    const recentContext = contextMessages
      .slice(-2) // 取最后 2 条消息
      .map((msg) => {
        // ModelMessage 的 content 可能是 string 或 array
        if (typeof msg.content === "string" && msg.content.length > 0) {
          return `[${msg.role}]\n${msg.content}\n`;
        }
        if (Array.isArray(msg.content)) {
          const content = msg.content
            .filter((part) => part.type === "text")
            .map((part) => part.text)
            .join("\n");
          return `[${msg.role}]\n${content}\n`;
        }
        return;
      })
      .filter(Boolean)
      .join("\n");

    // 4. 调用语音文本优化
    logger.info({
      msg: "Running speech correction",
      originalLength: originalText.length,
      hasContext: !!recentContext,
    });

    const locale = await detectInputLanguage({
      text: originalText,
      fallbackLocale: fallbackLocale,
    });

    const generateTextResult = await generateText({
      model: llm("gpt-5-nano"),
      prompt:
        locale === "zh-CN"
          ? `
你是一个专业的语音识别文本校正助手。请修正语音转文字中的错误，同时保持说话者的原意和表达风格。

主要任务：
1. **纠正识别错误**：修复同音词、谐音词、英文品牌名称错误
2. **添加标点符号**：为长句添加适当的逗号、句号，提升可读性
3. **优化语言表达**：
    - 去除过多的"然后"、"那个"等口语词汇
    - 保留自然的语言节奏，不要过度书面化
    - 修正语法错误但保持口语化风格
4. **处理中英文混合**：确保中英文之间有适当间距
5. **品牌名称准确性**：常见软件/工具名称要拼写正确

${recentContext ? `上下文：「${recentContext}」` : ""}

待修正文本：「${originalText}」

请直接返回修正后的文本，不需要解释或标记。
`
          : `
You are a professional speech-to-text correction assistant. Please correct errors in speech transcription while preserving the speaker's natural intent and style.

Main tasks:
1. **Fix recognition errors**: Correct homophones, misheard words, and brand name errors
2. **Add punctuation**: Insert appropriate commas and periods for readability
3. **Optimize expression**:
    - Remove excessive filler words like "um", "uh", "like", "you know"
    - Maintain natural speech rhythm, don't over-formalize
    - Fix grammar errors while keeping conversational tone
4. **Handle mixed languages**: Ensure proper spacing between English and other languages
5. **Brand name accuracy**: Spell common software/tool names correctly

${recentContext ? `Context: "${recentContext}"` : ""}

Text to correct: "${originalText}"

Return only the corrected text without explanations or markup.
`,
      // temperature: 0.1,
      providerOptions: {
        openai: {
          reasoningSummary: "auto", // 'auto' | 'detailed'
          reasoningEffort: "minimal", // 'minimal' | 'low' | 'medium' | 'high'
        } satisfies OpenAIResponsesProviderOptions,
      },
    });

    const correctedText = generateTextResult.text.trim();

    // 5. 如果文本没有变化，跳过数据库更新
    if (correctedText === originalText) {
      logger.info({ msg: "No optimization needed, text unchanged" });
      return;
    }

    // 6. 更新数据库中的消息
    const updatedParts = parts.map((part) => {
      if (part.type === "text") {
        return { ...part, text: correctedText };
      }
      return part;
    });

    await prisma.chatMessage
      .update({
        where: { messageId: dbMessage.messageId },
        data: {
          parts: updatedParts, // as unknown as InputJsonValue,
          content: correctedText, // 更新 legacy content 字段
          extra: {
            ...(typeof dbMessage.extra === "object" && dbMessage.extra !== null
              ? dbMessage.extra
              : {}),
            originalText, // 保存原始文本用于审计
          },
        },
      })
      .catch((error) => {
        logger.error({
          msg: "Failed to update corrected message",
          messageId: dbMessage.messageId,
          error: error instanceof Error ? error.message : String(error),
          correctedTextPreview: correctedText.slice(0, 200),
          originalTextPreview: originalText.slice(0, 200),
        });
        throw error;
      });

    logger.info({
      msg: "User message corrected successfully",
      originalLength: originalText.length,
      correctedLength: correctedText.length,
    });
  } catch (error) {
    logger.error({
      msg: "User message correction error",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // 不抛出错误 - 这是后台增强功能，失败不应影响主流程
  }
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
