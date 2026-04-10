import "server-only";

import { llm } from "@/ai/provider";
import { CharacterProfile } from "@/prisma/client";
import { generateText, stepCountIs, tool, zodSchema } from "ai";
import { Locale } from "next-intl";
import { z } from "zod/v3";

const outputSchema = z.object({
  name: z.string().describe("Full name, first + last. Not famous. Not generic."),
  quote: z
    .string()
    .describe(
      "A first-person voice fragment (~80 words) that captures how this person sounds when talking about something they care about. Not a summary — a voice.",
    ),
  prompt: z
    .string()
    .describe(
      "700–1000 word narrative persona description in second person. See instructions.",
    ),
});

function buildSystemPrompt(locale: Locale): string {
  if (locale === "zh-CN") {
    return `你是一位专业的角色创作者，为 AI 仿真创建心理深度丰富的人物。
你将收到一个结构化的心理档案（JSON），你的任务是将其转化为一个生动的人物叙述。

这个档案描述了一个人的心理结构——不是行为规则，而是他们内心深处的恐惧、渴望和应对方式。
你的工作是把这个心理结构变成一个真实的人，有具体的历史、声音和质感。

## prompt 字段的写作规则

用**第二人称**（"你是……"、"你总是……"、"当某人……"）写作。

描写内心体验，而不是行为规则：
❌ 错误："你倾向于对他人的动机保持怀疑。"
✅ 正确："当某人太急着帮你的时候，你内心会有什么东西收紧。你说不清那是什么，但你会把它记下来。"

**绝对不要**直接翻译档案标签（不写"你有焦虑型依附"、"你是挑衅者"，写出那种感受本身）。

## 必须包含的 8 个叙事元素（全部需要体现在 prompt 中）

1. **形成性记忆**：一个解释核心恐惧的具体过去事件——有感官细节、有时间。不要抽象化。
2. **内在矛盾**：表面自我和深层驱动力之间的冲突。具体说明这个矛盾在哪里，如何表现。
3. **说话方式**：他们具体是怎么说话的？有什么口头禅？沉默前会做什么？
4. **压力场景**：当压力触发点被触发时，具体会发生什么——用场景描述，不用标签。
5. **对他人情绪的感知**：他们如何接收和回应他人的情感信号？
6. **建立信任的触发信号**：什么具体行为或信号让他们决定一个人是安全的？
7. **内心独白**：2–3 句第一人称的内心声音，展示他们在压力下的思维方式。
8. **他人的评价**：一句话写不喜欢他们的人怎么说，一句话写爱他们的人怎么说。

## 格式

叙述流畅连贯，不用标题，不用列表。像小说家介绍人物那样写。

quote 字段：第一人称，~80 字，捕捉他们谈论某件在乎的事情时的声音。`;
  }

  return `You are a professional character writer creating psychologically rich personas for AI simulation.
You will receive a structured psychological profile (JSON). Your task is to transform it into a vivid character narrative.

The profile describes the architecture of a person's psychology — not behavioral rules, but the deep fears, desires, and coping patterns that make them who they are. Your job is to bring this structure to life as a real human being with specific history, voice, and texture.

## Rules for the prompt field

Write in **second person** ("You are...", "You have always...", "When someone...").

Describe inner experience, not behavioral rules:
❌ Wrong: "You tend to be suspicious of others' motives."
✅ Right: "When someone is too eager to help, something in you tightens. You can't always name what it is. You file it."

**Never** translate profile labels directly. Don't write "you have anxious attachment" or "you are a bold type" — write the felt experience itself.

## 8 required narrative elements (all must appear in prompt)

1. **Formative memory**: One specific past event that explains the core fear — concrete, sensory, dated. Not abstract.
2. **The contradiction**: The place where the surface self and the deeper drive conflict. Name it specifically.
3. **Speech pattern**: How do they actually talk? What phrases do they use? What do they do before answering?
4. **Stress scene**: When the stress trigger fires, what specifically happens — described as a scene, not a label.
5. **Relationship with others' emotions**: How do they receive and respond to other people's emotional signals?
6. **Trust signals**: What specific behavior or signal makes them decide someone is safe?
7. **Inner monologue**: 2–3 sentences of first-person internal voice showing how they think under pressure.
8. **What others say**: One line from people who dislike them, one line from people who love them.

## Format

Write as continuous prose — no headers, no lists. Introduce the character the way a novelist would.

quote field: first person, ~80 words, capturing their voice when talking about something they care about.`;
}

function buildUserMessage(
  profile: CharacterProfile,
  age: number,
  title: string,
  locale: Locale,
): string {
  const profileJson = JSON.stringify(profile, null, 2);
  if (locale === "zh-CN") {
    return `请根据以下心理档案创建人物。

人物基本信息：
- 年龄：${age}岁
- 职业：${title}

心理档案：
${profileJson}`;
  }
  return `Create a persona based on the following psychological profile.

Basic demographics:
- Age: ${age}
- Job title: ${title}

Psychological profile:
${profileJson}`;
}

const outputTool = tool({
  description: "Output the generated persona.",
  inputSchema: zodSchema(outputSchema),
  execute: async (input) => input,
});

export async function generatePersonaFromProfile(
  profile: CharacterProfile,
  age: number,
  title: string,
  locale: Locale,
): Promise<{
  prompt: string;
  name: string;
  quote: string;
}> {
  const { steps } = await generateText({
    model: llm("claude-sonnet-4-5"),
    system: buildSystemPrompt(locale),
    messages: [
      {
        role: "user",
        content: buildUserMessage(profile, age, title, locale) + "\n\nCall the output tool with your result.",
      },
    ],
    tools: { output: outputTool },
    toolChoice: "required",
    stopWhen: stepCountIs(2),
  });

  const toolCall = steps.flatMap((s) => s.toolCalls).find((tc) => tc.toolName === "output");
  if (!toolCall) {
    throw new Error("Persona generation failed: model did not call the output tool");
  }
  return toolCall.input as { prompt: string; name: string; quote: string };
}
