import { toolCallError } from "@/ai/tools/error";
import { reasoningThinkingTool, webFetchTool, webSearchTool } from "@/ai/tools/tools";
import { AgentToolConfigArgs, StatReporter } from "@/ai/tools/types";
import { deepResearchTool } from "@/app/(deepResearch)/deepResearch";
import {
  discussionChatTool,
  generatePodcastTool,
  generateReportTool,
  interviewChatTool,
  searchPersonasTool,
} from "@/app/(study)/tools";
import { AgentRequestConfig } from "@/app/(study)/agents/baseAgentRequest";
import {
  buildUniversalSkillCatalog,
  buildUniversalSkillsSection,
} from "@/app/(universal)/skills/catalog";
import { listSkillsTool } from "@/app/(universal)/tools";
import { createAgentSandbox, SANDBOX_SESSIONS_DIR, sandboxSystemPrompt } from "@/sandbox";
import type { Locale } from "next-intl";
import type { Logger } from "pino";
import { getSubAgentModePrompt, type SubAgentMode } from "./prompt";

export type SkillDrivenSubAgentTools = ReturnType<typeof buildSkillDrivenSubAgentTools>;

function buildSkillDrivenSubAgentTools({
  userId,
  userChatId,
  locale,
  logger,
  statReport,
  abortSignal,
  bashTools,
}: {
  userId: number;
  userChatId: number;
  locale: Locale;
  logger: Logger;
  statReport: StatReporter;
  abortSignal: AbortSignal;
  bashTools: Awaited<ReturnType<typeof createAgentSandbox>>["tools"];
}) {
  const agentToolArgs: AgentToolConfigArgs = {
    locale,
    abortSignal,
    statReport,
    logger,
  };

  return {
    reasoningThinking: reasoningThinkingTool(agentToolArgs),
    webSearch: webSearchTool({
      provider: "tavily",
      studyUserChatId: userChatId,
      ...agentToolArgs,
    }),
    webFetch: webFetchTool({ locale }),
    listSkills: listSkillsTool({ userId }),
    bash: bashTools.bash,
    readFile: bashTools.readFile,
    writeFile: bashTools.writeFile,
    searchPersonas: searchPersonasTool({
      userId,
      userChatId,
      ...agentToolArgs,
    }),
    discussionChat: discussionChatTool({
      userId,
      userChatId,
      ...agentToolArgs,
    }),
    interviewChat: interviewChatTool({
      userId,
      userChatId,
      ...agentToolArgs,
    }),
    generateReport: generateReportTool({
      userId,
      userChatId,
      ...agentToolArgs,
    }),
    generatePodcast: generatePodcastTool({
      userId,
      userChatId,
      ...agentToolArgs,
    }),
    deepResearch: deepResearchTool({ userId, ...agentToolArgs }),
    toolCallError,
  };
}

export async function createUniversalSubAgentConfig({
  userId,
  subAgentChatId,
  subAgentChatToken,
  locale,
  logger,
  statReport,
  toolAbortSignal,
  mode,
}: {
  userId: number;
  subAgentChatId: number;
  subAgentChatToken: string;
  locale: Locale;
  logger: Logger;
  statReport: StatReporter;
  toolAbortSignal: AbortSignal;
  mode: SubAgentMode;
}): Promise<AgentRequestConfig<SkillDrivenSubAgentTools>> {
  const skillCatalog = await buildUniversalSkillCatalog({ userId });
  const sessionDir = `${SANDBOX_SESSIONS_DIR}/${subAgentChatToken}`;
  const sandbox = await createAgentSandbox({
    userId,
    skills: skillCatalog.uploadedSkills,
    builtinSkills: skillCatalog.builtinSkills,
    sessionDir,
  });
  const tools = buildSkillDrivenSubAgentTools({
    userId,
    userChatId: subAgentChatId,
    locale,
    logger,
    statReport,
    abortSignal: toolAbortSignal,
    bashTools: sandbox.tools,
  });

  const skillsSection = buildUniversalSkillsSection({
    locale,
    skills: skillCatalog.skills,
  });
  const modePrompt = getSubAgentModePrompt({ mode, locale });
  const sandboxPrompt = sandboxSystemPrompt({
    locale,
    sessionDir,
    hasSkills: skillCatalog.skills.length > 0,
  });

  const systemPrompt =
    locale === "zh-CN"
      ? `你是 Universal Agent 创建的一个聚焦执行型 SubAgent。你的职责是完成一个具体任务，并把结果回传给上级 agent。

## 工作方式

1. 不要向最终用户请求交互确认；缺失信息时先基于已有上下文做最合理的假设
2. 先判断任务是否适合加载某个 skill；如果适合，优先读取对应的 \`/skills/.../SKILL.md\`
3. 可以组合使用多个 skill 和工具，但只使用真正必要的部分
4. 不要套用固定研究流水线；根据任务目标决定是否需要 persona、访谈、讨论、深度研究或报告
5. 最终总结必须给上级 agent 可直接消费的结果：关键发现、依据、产物位置、未完成项

${skillsSection}

${modePrompt}

${sandboxPrompt}`
      : `You are a focused execution sub-agent created by the Universal Agent. Your job is to complete one specific task and report the result back to the lead agent.

## Working Rules

1. Do not ask the end user for confirmation. If information is missing, make the most reasonable assumption from context first.
2. First decide whether the task should load a skill. If yes, read the relevant \`/skills/.../SKILL.md\` before acting.
3. You may combine multiple skills and tools, but use only the parts that are actually needed.
4. Do not follow a fixed study pipeline. Decide whether the task needs personas, interviews, discussions, deep research, or a report based on the objective.
5. Your final summary must be lead-agent ready: key findings, evidence basis, artifact locations, and unresolved gaps.

${skillsSection}

${modePrompt}

${sandboxPrompt}`;

  return {
    modelName: "claude-sonnet-4-5",
    systemPrompt,
    tools,
    maxTokens: 1500,
    specialHandlers: {
      customPrepareStep: async ({ messages, model }) => ({ messages, model }),
    },
  };
}
