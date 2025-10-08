import { StepResult, ToolSet } from "ai";
import { LLMModelName } from "./provider";

export type TReduceTokens = {
  model: LLMModelName;
  ratio: number;
} | null;

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
  { reduceTokens }: { reduceTokens?: TReduceTokens } = {},
): {
  tokens: number;
  extra: TUsageExtra;
} {
  const extra: TUsageExtra = {
    usage: { ...step.usage },
  };

  let tokens = step.usage.totalTokens || 0;
  if (reduceTokens) {
    extra["reduceTokens"] = { originalTokens: tokens, ...reduceTokens };
    tokens = Math.ceil(tokens / reduceTokens.ratio);
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
