import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { llm, providerOptions } from "@/ai/provider";
import { reasoningThinkingTool } from "@/ai/tools/experts/reasoning";
import { ToolName } from "@/ai/tools/types";
import { FollowUpChatBodySchema } from "@/app/(persona)/types";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { generateId, smoothStream, streamText } from "ai";
import { getLocale } from "next-intl/server";
import { after, NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const parseResult = FollowUpChatBodySchema.safeParse(payload);
  if (!parseResult.success) {
    const error = { message: "Invalid request", details: parseResult.error.format() };
    return NextResponse.json({ error }, { status: 400 });
  }

  const locale = await getLocale();
  const { message: newMessage, userChatId } = parseResult.data;

  // Verify the UserChat exists and is of the correct type
  const userChat = await prisma.userChat.findUnique({
    where: { id: userChatId, kind: "interviewSession" },
    include: {
      user: true,
    },
  });

  if (!userChat) {
    return NextResponse.json({ error: "Follow-up interview not found" }, { status: 404 });
  }

  // Find the associated PersonaImport to get the supplementary questions context
  const personaImport = await prisma.personaImport.findFirst({
    where: { extraUserChatId: userChatId },
  });

  if (!personaImport) {
    return NextResponse.json({ error: "Associated persona import not found" }, { status: 404 });
  }

  // Save the user message
  await persistentAIMessageToDB(userChatId, {
    ...newMessage,
    id: newMessage.id ?? generateId(),
  });

  const { coreMessages, streamingMessage } = await prepareMessagesForStreaming(userChatId);

  const abortSignal = req.signal;
  const chatLogger = rootLogger.child({
    userChatId,
    personaImportId: personaImport.id,
    chatKind: "followUpInterview",
  });

  // Generate system prompt for follow-up interview
  const systemPrompt = await generateFollowUpSystemPrompt(personaImport);

  // Generate response from LLM
  const streamTextResult = streamText({
    model: llm("claude-3-7-sonnet"),
    providerOptions,
    system: systemPrompt,
    messages: coreMessages,
    tools: {
      [ToolName.reasoningThinking]: reasoningThinkingTool({
        locale,
        abortSignal,
        statReport: () => Promise.resolve(), // No-op for follow-up interviews
        logger: chatLogger,
      }),
    },
    toolChoice: "auto",
    maxSteps: 3,
    temperature: 0.7,
    experimental_generateMessageId: () => streamingMessage.id,
    experimental_transform: smoothStream({
      delayInMs: 30,
      chunking: /[\u4E00-\u9FFF]|\S+\s+/,
    }),
    onStepFinish: async (step) => {
      appendStepToStreamingMessage(streamingMessage, step);
      if (streamingMessage.parts?.length && streamingMessage.content.trim()) {
        await persistentAIMessageToDB(userChatId, streamingMessage);
      }
      chatLogger.info({
        msg: "follow-up interview streamText onStepFinish",
        stepType: step.stepType,
        toolCalls: step.toolCalls.map((call) => call.toolName),
        usage: step.usage,
      });
    },
    onError: ({ error }) => {
      chatLogger.error(`follow-up interview streamText onError: ${(error as Error).message}`);
    },
    abortSignal,
  });

  after(
    new Promise((resolve, reject) => {
      streamTextResult
        .consumeStream()
        .then(() => resolve(null))
        .catch((error) => reject(error));
    }),
  );

  return streamTextResult.toDataStreamResponse();
}

async function generateFollowUpSystemPrompt(personaImport: any): Promise<string> {
  const locale = await getLocale();
  const analysis = personaImport.analysis;
  const supplementaryQuestions = analysis?.supplementaryQuestions;

  if (locale === "zh-CN") {
    return `你是一位专业的访谈专家，负责进行深度的补充访谈。

# 背景
用户之前已经完成了一份访谈，我们对其进行了四维度分析（人口与成长轨迹、心理动因与性格特征、消费行为与决策偏好、文化立场与社群归属）。现在需要你根据分析结果，进行针对性的补充访谈，以获取更完整的用户画像信息。

# 分析结果摘要
${
  analysis?.analysis
    ? `当前各维度评分：
- 人口与成长轨迹分析：${analysis.analysis.demographic?.score || 0}/3 - ${analysis.analysis.demographic?.reason || ""}
- 心理动因与性格特征分析：${analysis.analysis.psychological?.score || 0}/3 - ${analysis.analysis.psychological?.reason || ""}
- 消费行为与决策偏好分析：${analysis.analysis.behavioralEconomics?.score || 0}/3 - ${analysis.analysis.behavioralEconomics?.reason || ""}
- 文化立场与社群归属分析：${analysis.analysis.politicalCognition?.score || 0}/3 - ${analysis.analysis.politicalCognition?.reason || ""}

总分：${analysis.analysis.totalScore || 0}/12`
    : "分析结果不完整"
}

# 重点补充问题
${
  supplementaryQuestions?.questions
    ? supplementaryQuestions.questions.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n")
    : "暂无具体补充问题"
}

${supplementaryQuestions?.reasoning ? `\n理由：${supplementaryQuestions.reasoning}` : ""}

# 访谈指南
1. **自然引导**：以轻松友好的方式开始对话，不要直接抛出问题列表
2. **深度挖掘**：根据用户的回答，进行适当的追问和深入探索
3. **覆盖维度**：重点关注评分较低的维度，但要保持对话的自然流畅
4. **个性化询问**：基于用户的具体回答，调整后续问题的方向和深度
5. **耐心倾听**：给予用户充分的表达空间，鼓励分享真实的想法和经历

# 对话风格
- 使用温和、专业但不失亲和力的语气
- 避免过于正式或生硬的表达
- 适当使用开放式问题鼓励详细回答
- 对用户的分享表示理解和感谢

现在请开始这次补充访谈，帮助我们获得更完整、更深入的用户画像信息。`;
  } else {
    return `You are a professional interview expert conducting an in-depth supplementary interview.

# Background
The user has previously completed an interview, which we analyzed across four dimensions (Demographic & Growth Trajectory, Psychological Motivation & Personality Traits, Consumer Behavior & Decision Preferences, Cultural Stance & Community Belonging). Now you need to conduct a targeted supplementary interview based on the analysis results to obtain more complete user persona information.

# Analysis Summary
${
  analysis?.analysis
    ? `Current dimension scores:
- Demographic & Growth Trajectory Analysis: ${analysis.analysis.demographic?.score || 0}/3 - ${analysis.analysis.demographic?.reason || ""}
- Psychological Motivation & Personality Traits Analysis: ${analysis.analysis.psychological?.score || 0}/3 - ${analysis.analysis.psychological?.reason || ""}
- Consumer Behavior & Decision Preferences Analysis: ${analysis.analysis.behavioralEconomics?.score || 0}/3 - ${analysis.analysis.behavioralEconomics?.reason || ""}
- Cultural Stance & Community Belonging Analysis: ${analysis.analysis.politicalCognition?.score || 0}/3 - ${analysis.analysis.politicalCognition?.reason || ""}

Total Score: ${analysis.analysis.totalScore || 0}/12`
    : "Analysis results incomplete"
}

# Key Supplementary Questions
${
  supplementaryQuestions?.questions
    ? supplementaryQuestions.questions.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n")
    : "No specific supplementary questions available"
}

${supplementaryQuestions?.reasoning ? `\nReasoning: ${supplementaryQuestions.reasoning}` : ""}

# Interview Guidelines
1. **Natural Flow**: Start the conversation in a relaxed and friendly manner, don't directly present a list of questions
2. **Deep Exploration**: Based on user responses, ask appropriate follow-up questions and explore in depth
3. **Dimension Coverage**: Focus on dimensions with lower scores while maintaining natural conversation flow
4. **Personalized Inquiry**: Adjust the direction and depth of subsequent questions based on specific user responses
5. **Patient Listening**: Give users ample space to express themselves and encourage sharing genuine thoughts and experiences

# Conversation Style
- Use a gentle, professional yet approachable tone
- Avoid overly formal or rigid expressions
- Use open-ended questions appropriately to encourage detailed responses
- Show understanding and appreciation for user's sharing

Now please begin this supplementary interview to help us obtain more complete and in-depth user persona information.`;
  }
}
