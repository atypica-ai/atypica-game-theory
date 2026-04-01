import { AgentStatisticsExtra } from "@/prisma/client";
import { UIDataTypes, UIMessage } from "ai";
import { Locale } from "next-intl";
import { Logger } from "pino";

export interface PlainTextToolResult {
  plainText: string;
}

export type PlainTextUITools = {
  [x: string]: {
    input: Record<any, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    output: PlainTextToolResult;
  };
};

export type TMessageWithPlainTextTool<
  TOOLS extends PlainTextUITools = PlainTextUITools,
  METADATA = unknown,
> = UIMessage<METADATA, UIDataTypes, TOOLS>;

export enum BasicToolName {
  reasoningThinking = "reasoningThinking",
  requestPayment = "requestPayment",
  webFetch = "webFetch",
  webSearch = "webSearch",
  toolCallError = "toolCallError",
}

export type StatReporter = (
  dimension: "tokens" | "duration" | "steps" | "personas",
  value: number,
  extra: AgentStatisticsExtra,
) => Promise<void>;

export type AgentToolConfigArgs = {
  locale: Locale;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  logger: Logger;
};
