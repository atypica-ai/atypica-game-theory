import { UIMessage } from "ai";
import { z } from "zod/v3";

export const CONTINUE_ASSISTANT_STEPS = "[CONTINUE ASSISTANT STEPS]";

// export const clientMessagePayloadSchemaLegacy = z.object({
//   message: z.object({
//     id: z.string().optional(),
//     role: z.enum(["user", "assistant", "system", "data"]),
//     content: z.string(),
//     parts: z.array(z.any()).optional(),
//   }),
//   userChatToken: z.string(),
// });

export const clientMessagePayloadSchema = z.object({
  id: z.string().optional(), // 在 useChat 上设置的 id，类型四 string，不一定要用到
  message: z.object({
    id: z.string().optional(),
    role: z.enum(["user", "assistant"]),
    parts: z.array(
      z.union([
        z.object({
          type: z.literal("step-start"),
        }),
        z
          .object({
            type: z.literal("text"),
            text: z.string(),
          })
          .describe("user text input"),
        z
          .object({
            type: z.custom<`tool-${string}`>(
              (val) => typeof val === "string" && /^tool-[a-zA-Z0-9_-]+$/.test(val),
            ),
            toolCallId: z.string(),
            providerExecuted: z.any().optional(),
            callProviderMetadata: z.any().optional(),
          })
          .and(
            z.union([
              z.object({
                state: z.literal("output-available"),
                input: z.record(z.any()),
                output: z.record(z.any()),
              }),
              z.object({
                state: z.literal("output-error"),
                input: z.record(z.any()),
                errorText: z.string(),
              }),
            ]),
          )
          .describe("user addToolResult"),
      ]),
    ),
  }),
  userChatToken: z.string(),
});

export type ClientMessagePayload = z.infer<typeof clientMessagePayloadSchema>;

export function isSystemMessage(text: string): boolean {
  const trimmedText = text.trim();
  const normalizedText = trimmedText.replace(/(\w)\s(\w)/g, "$1_$2");
  return /^\[(READY|USER_HESITATED|CONTINUE|CONTINUE_ASSISTANT_STEPS)\]$/i.test(normalizedText);
}

/**
 * 返回正确的 lastMessage 类型，以匹配 ClientMessagePayload["message"]
 * useChat 提交的最后一条消息，role 不会是 system，只有用户输入的文本和 addToolResult 提交的 tool result 两种类型
 */
export function prepareLastUIMessageForRequest(messages: UIMessage[]) {
  return messages[messages.length - 1] as Omit<UIMessage, "role" | "parts"> & {
    role: "user" | "assistant";
    parts: Extract<UIMessage["parts"][number], { type: "text" }>[];
  };
}
