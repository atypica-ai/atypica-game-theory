import { StatReporter } from "@/ai/tools/types";
import { LanguageModelUsage, StepResult, ToolSet, UIMessageStreamWriter } from "ai";
import { Locale } from "next-intl";
import { Logger } from "pino";

export enum ExpertName {
  Auto = "auto",
  Grok = "grok",
  TrendExplorer = "trendExplorer",
}

export type ExpertStreamTextResult = Pick<
  StepResult<ToolSet>,
  "text" | "sources" /*| "usage" */
> & {
  /**
   * @deprecated 见 mcpServer.ts 上的 statReport 描述，
   * streamText 返回的 usage 也没包含过程中调用其他工具的 token，其实是无法用的
   * 解决方式就是使用 atypica 统一的计价单位，atypica 的 tokens，在每个 agent 和 tool 里各自独立计算
   */
  usage: LanguageModelUsage;
};

// Expert executor can accept different signatures, so we use a more flexible type
export type ExpertExecutor = (args: {
  query: string;
  userId: number;
  locale: Locale;
  logger: Logger;
  statReport: StatReporter;
  abortSignal: AbortSignal;
  // UI 流式输出（仅 UI 模式）
  streamWriter?: UIMessageStreamWriter;
  streamingMessageId?: string; // 用于 generateMessageId（UI 模式需要）
  onStepFinish?: (step: StepResult<ToolSet>) => Promise<void>; // 每个 step 完成时的回调，外部负责 append 和保存
}) => Promise<ExpertStreamTextResult>;
