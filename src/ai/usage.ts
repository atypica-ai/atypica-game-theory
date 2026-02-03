import { StepResult, ToolSet } from "ai";
import { LLMModelName } from "./provider";

export type TReduceTokens =
  | { model: LLMModelName; ratio: number }
  | { modelId: string; ratio: number }
  | null;

type TUsageExtra = {
  reduceTokens?: NonNullable<TReduceTokens> & { originalTokens: number };
  usage?: StepResult<ToolSet>["usage"];
  cache?: {
    cacheWriteInputTokens: number;
    cacheReadInputTokens: number;
  };
};

export function calculateStepTokensUsage(
  step: Pick<StepResult<ToolSet>, "usage" | "providerMetadata">,
  {
    modelId,
    reduceTokens,
  }: {
    modelId?: string; // Provider's raw model ID (e.g., "global.anthropic.claude-sonnet-4-5-xxx")
    reduceTokens?: TReduceTokens;
  } = {},
): {
  tokens: number;
  extra: TUsageExtra;
} {
  const extra: TUsageExtra = {
    usage: { ...step.usage },
  };

  let tokens = step.usage.totalTokens || 0;
  // 如果有 reduceTokens，直接用，如果没有，根据传入的 modelId 使用默认配置
  if (reduceTokens) {
    extra["reduceTokens"] = { originalTokens: tokens, ...reduceTokens };
    tokens = Math.ceil(tokens / reduceTokens.ratio);
  } else if (modelId) {
    // 根据模型 ID 自动应用 reduceTokens 配置
    // 使用 includes 匹配，兼容各种 provider 的 modelId 格式
    // 例如：Bedrock 返回 "global.anthropic.claude-sonnet-4-5-xxx"
    //      Vertex 返回 "gemini-2.5-flash"

    // MiniMax - 大幅降低（便宜模型）
    // 匹配: "minimax.minimax-m2", "minimax-m2.1" 等
    if (modelId.includes("minimax")) {
      reduceTokens = { modelId, ratio: 10 };
    }
    // Gemini Flash 系列 - 大幅降低（已经很便宜）
    // 匹配: "gemini-2.5-flash", "gemini-3-flash" 等
    else if (modelId.includes("gemini") && modelId.includes("flash")) {
      reduceTokens = { modelId, ratio: 10 };
    }
    // Gemini Pro 系列 - 适度降低
    // 匹配: "gemini-2.5-pro", "gemini-3-pro" 等
    else if (modelId.includes("gemini") && modelId.includes("pro")) {
      reduceTokens = { modelId, ratio: 2 };
    }
    // Claude Haiku - 适度降低
    // 匹配: "claude-haiku-4-5", "anthropic.claude-haiku" 等
    else if (modelId.includes("claude") && modelId.includes("haiku")) {
      reduceTokens = { modelId, ratio: 3 };
    }
    // Grok Fast - 适度降低
    // 匹配: "grok-4-1-fast-non-reasoning" 等
    else if (modelId.includes("grok") && modelId.includes("fast")) {
      reduceTokens = { modelId, ratio: 2 };
    }
    // Claude 主力模型、GPT、其他模型 - 不降低（需要高质量）
    // 包括: claude-sonnet-4-5, claude-sonnet-4, gpt-4o, gpt-5 等

    // 应用 reduceTokens
    if (reduceTokens) {
      extra["reduceTokens"] = { originalTokens: tokens, ...reduceTokens };
      tokens = Math.ceil(tokens / reduceTokens.ratio);
    }
  }

  let cacheWriteInputTokens = 0;
  let cacheReadInputTokens = step.usage.cachedInputTokens || 0;

  if (
    step.providerMetadata?.bedrock?.usage &&
    typeof step.providerMetadata.bedrock.usage === "object"
  ) {
    const cache = step.providerMetadata.bedrock.usage;
    if ("cacheWriteInputTokens" in cache && typeof cache.cacheWriteInputTokens === "number") {
      cacheWriteInputTokens = cache.cacheWriteInputTokens;
    }
    if ("cacheReadInputTokens" in cache && typeof cache.cacheReadInputTokens === "number") {
      cacheReadInputTokens = cache.cacheReadInputTokens;
    }
    tokens +=
      Math.floor(cacheReadInputTokens / 10) + // bedrock claude
      Math.floor(cacheWriteInputTokens * 1.25); // bedrock claude
  } else {
    // 其他模型的 metadata 待实现
  }

  if (cacheWriteInputTokens > 0 || cacheReadInputTokens > 0) {
    extra.cache = {
      cacheWriteInputTokens,
      cacheReadInputTokens,
    };
  }

  return {
    tokens,
    extra,
  };
}
