import { StatReporter } from "@/ai/tools/types";
import { StepResult, TextStreamPart, ToolSet } from "ai";
import { Locale } from "next-intl";
import { Logger } from "pino";

export enum ExpertName {
  Auto = "auto",
  Grok = "grok",
  TrendExplorer = "trendExplorer",
}

export type ExpertStreamTextResult = Pick<StepResult<ToolSet>, "text" | "usage" | "sources">;

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
