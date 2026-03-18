import { LLMModelName } from "@/ai/provider";
import { StudyToolName } from "@/app/(study)/tools/types";
import { getUserTokens } from "@/tokens/lib";
import { BedrockProviderOptions } from "@ai-sdk/amazon-bedrock";
import { AnthropicProviderOptions } from "@ai-sdk/anthropic";
import { JSONValue, ModelMessage, ReasoningUIPart, UIMessage } from "ai";

export async function outOfBalance({ userId }: { userId: number }) {
  const { balance } = await getUserTokens({ userId });
  return balance !== "Unlimited" && balance <= 0;
}

export function calculateToolUsage(modelMessages: ModelMessage[]) {
  const toolUseCount = modelMessages
    .filter((message) => message.role === "tool")
    .reduce(
      (_count, message) => {
        const count = { ..._count };
        (message.content ?? []).forEach((part) => {
          const toolName = part.toolName as StudyToolName;
          count[toolName] = (count[toolName] || 0) + 1;
        });
        return count;
      },
      {} as Partial<Record<StudyToolName, number>>,
    );
  return toolUseCount;
}

/**
 * claude 模型支持 cache https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html
 * 最多 4 个 checkpoints，checkpoint 至少 1024 tokens, study agent 第一个 assistant 消息回复以后至少有这个 token 量
 */
export function setBedrockCache(model: `claude-${string}`, coreMessages: ModelMessage[]) {
  if (!model) return coreMessages; // 这句话没意义，只是为了用一下 model

  const checkpoints = {
    ">=12": false,
    ">=24": false,
    ">=36": false,
  };
  const cachedCoreMessages = coreMessages.map((message, index) => {
    const providerOptions = {
      bedrock: { cachePoint: { type: "default" } },
      anthropic: { cacheControl: { type: "ephemeral" } } satisfies AnthropicProviderOptions,
    };
    if (message.role === "assistant" && index >= 8 && !checkpoints[">=12"]) {
      checkpoints[">=12"] = true;
      return { ...message, providerOptions };
    }
    if (message.role === "assistant" && index >= 4 && !checkpoints[">=24"]) {
      checkpoints[">=24"] = true;
      return { ...message, providerOptions };
    }
    if (message.role === "assistant" && index >= 16 && !checkpoints[">=36"]) {
      checkpoints[">=36"] = true;
      return { ...message, providerOptions };
    }
    return { ...message };
  });
  return cachedCoreMessages;
}

/**
 * 有些模型不支持 reasoning 的 signature (存在 content[].providerOptions 里)，比如 minimax, 需要去掉
 */
export function fixReasoningPartsInModelMessages({
  modelName,
  modelMessages,
  providerOptions,
  streamingMessage,
}: {
  modelName: LLMModelName;
  modelMessages: ModelMessage[];
  providerOptions: Record<string, Record<string, JSONValue>>;
  streamingMessage: Omit<UIMessage, "role">;
}): {
  modelMessages: ModelMessage[];
  providerOptions: Record<string, Record<string, JSONValue>>;
} {
  // 有些模型不支持 reasoning 的 signature (存在 content[].providerOptions 里)，比如 minimax, 需要去掉
  if (!modelName?.startsWith("claude") && !modelName?.startsWith("gemini")) {
    modelMessages = modelMessages.map((message) => {
      if (typeof message.content === "string") return message;
      const content = message.content.map((part) => {
        if (part.type !== "reasoning") return part;
        return { type: "reasoning", text: part.text };
      });
      return { ...message, content } as ModelMessage;
    });
  }

  // 不能通过后面的 modelMessages 判断，因为是要看 final assistant turn，也就是多个 assistant parts 在一起是一个 turn
  // 正好 streamingMessage 就是 final assistant turn
  // https://platform.claude.com/docs/en/build-with-claude/extended-thinking
  // ⚠️ 注意 claude 要求 reasoning part 里面的 signature 一起传回去，不然不能被认为是一个 reasoning block
  // 旧的消息都没有 providerMetadata, 那就直接禁用 thinking 了, 新的有, 在 appendStepToStreamingMessage 里修复并保存了
  const reasoningSignatureValid = (part: ReasoningUIPart) => {
    if (
      part.providerMetadata &&
      "bedrock" in part.providerMetadata && // 目前主要模型就是 bedrock, 所以这里只考虑 bedrock
      "signature" in part.providerMetadata["bedrock"]
    ) {
      return true;
    }
    return false;
  };

  const firstPart = streamingMessage.parts.filter((part) => part.type !== "step-start").at(0);
  if (!firstPart) {
    // 保持原配置
  } else if (firstPart.type === "reasoning" && reasoningSignatureValid(firstPart)) {
    // ⚠️ 一定要赋值而不是直接修改，不然会导致全局变量 defaultProviderOptions 被修改掉 ！！！
    providerOptions = {
      ...providerOptions,
      bedrock: {
        ...providerOptions["bedrock"],
        reasoningConfig: { type: "enabled", budgetTokens: 1024 },
      } satisfies BedrockProviderOptions,
      anthropic: {
        ...providerOptions["anthropic"],
        thinking: { type: "enabled", budgetTokens: 1024 },
      } satisfies AnthropicProviderOptions,
    };
  } else {
    // 如果是 assistant 消息继续，在开启 thinking 的时候，claude 会要求最后一个 block 是 thinking 开头，但是没搞明白消息组织形式应该是怎样的，所以，暂时就关闭。
    if (providerOptions["bedrock"]) {
      providerOptions = {
        ...providerOptions,
        bedrock: {
          ...providerOptions["bedrock"],
          reasoningConfig: { type: "disabled" },
        } satisfies BedrockProviderOptions,
      };
    }
    if (providerOptions["anthropic"]) {
      providerOptions = {
        ...providerOptions,
        anthropic: {
          ...providerOptions["anthropic"],
          thinking: { type: "disabled" },
        } satisfies AnthropicProviderOptions,
      };
    }
  }

  return { modelMessages, providerOptions };
}
