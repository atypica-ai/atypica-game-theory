import { StatReporter } from "@/ai/tools/types";
import { LanguageModelUsage, StepResult, TextStreamPart, ToolSet } from "ai";
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
  forwardStreamChunk?: (chunk: TextStreamPart<ToolSet>) => void;
}) => Promise<ExpertStreamTextResult>;
