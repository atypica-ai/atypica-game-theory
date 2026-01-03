import { AgentStatisticsExtra } from "@/prisma/client";
import { UIDataTypes, UIMessage } from "ai";
import { Locale } from "next-intl";
import { Logger } from "pino";
import {
  ReasoningThinkingResult,
  ReasoningThinkingToolInput,
} from "./experts/reasoningThinking/types";
import { WebFetchToolInput, WebFetchToolResult } from "./experts/webFetch/types";
import { WebSearchToolInput, WebSearchToolResult } from "./experts/webSearch/types";
import { RequestPaymentResult } from "./user/payment/types";

/**
 * 整个项目约定的 Tool 格式及 UI 类型
 */

export interface PlainTextToolResult {
  plainText: string;
}

// T extends UITools,
export type PlainTextUITools = {
  // Omit<UITool, "input" | "output"> &
  [x: string]: {
    input: Record<any, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    output: PlainTextToolResult; // 返回 plainText 字段的 tool 都可以使用
  };
};

export type TMessageWithPlainTextTool<
  TOOLS extends PlainTextUITools = PlainTextUITools,
  METADATA = unknown,
> = UIMessage<METADATA, UIDataTypes, TOOLS>;

/**
 * 整个项目通用的一些 Tool 格式及 UI 类型
 */

export enum BasicToolName {
  reasoningThinking = "reasoningThinking",
  requestPayment = "requestPayment",

  webFetch = "webFetch",
  webSearch = "webSearch",

  toolCallError = "toolCallError",
}

// 因为很多前端组件用不到 tool 的 input，这里就定义一个简单的类型，以避免使用 unknown 或者 any
type GenericInputType = Record<any, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export type BasicUITools = {
  [BasicToolName.reasoningThinking]: {
    input: ReasoningThinkingToolInput;
    output: ReasoningThinkingResult;
  };
  [BasicToolName.requestPayment]: { input: GenericInputType; output: RequestPaymentResult };
  [BasicToolName.webFetch]: { input: WebFetchToolInput; output: WebFetchToolResult };
  [BasicToolName.webSearch]: { input: WebSearchToolInput; output: WebSearchToolResult };
  [BasicToolName.toolCallError]: { input: GenericInputType; output: PlainTextToolResult };
};

/**
 * stat
 */

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
