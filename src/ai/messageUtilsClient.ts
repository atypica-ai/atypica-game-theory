import { UIDataTypes, UIMessage, UIMessagePart, UITools } from "ai";
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
    parts: z.custom<UIMessagePart<UIDataTypes, UITools>[]>(() => true),
    // parts: z.array(
    //   z.union([
    //     z.object({
    //       type: z.literal("step-start"),
    //     }),
    //     z
    //       .object({
    //         type: z.literal("text"),
    //         text: z.string(),
    //       })
    //       .describe("TextUIPart"),
    //     z
    //       .object({
    //         type: z.literal("reasoning"),
    //         text: z.string(),
    //       })
    //       .describe("ReasoningUIPart"),
    //     z
    //       .object({
    //         type: z.literal("file"),
    //         mediaType: z.string(),
    //         filename: z.string().optional(),
    //         url: z.string(),
    //         providerMetadata: z.any().optional(),
    //       })
    //       .describe("FileUIPart"),
    //     z
    //       .object({
    //         type: z.custom<`tool-${string}`>(
    //           (val) => typeof val === "string" && /^tool-[a-zA-Z0-9_-]+$/.test(val),
    //         ),
    //         toolCallId: z.string(),
    //         providerExecuted: z.boolean().optional(),
    //         callProviderMetadata: z.any().optional(),
    //       })
    //       .and(
    //         z.union([
    //           z.object({
    //             state: z.literal("output-available"),
    //             input: z.union([z.string(), z.record(z.any())]),
    //             output: z.union([z.string(), z.record(z.any())]),
    //           }),
    //           z.object({
    //             state: z.literal("output-error"),
    //             input: z.union([z.string(), z.record(z.any())]),
    //             errorText: z.string(),
    //           }),
    //           z.object({
    //             state: z.literal("input-available"),
    //             input: z.union([z.string(), z.record(z.any())]),
    //           }),
    //           z.object({
    //             state: z.literal("input-streaming"),
    //             input: z.union([z.string(), z.record(z.any()), z.undefined()]),
    //           }),
    //         ]),
    //       )
    //       .describe("ToolUIPart"),
    //   ]),
    // ),
  }),
  userChatToken: z.string(),
});

export type ClientMessagePayload = z.infer<typeof clientMessagePayloadSchema>;

// // eslint-disable-next-line @typescript-eslint/no-unused-vars
// type VERIFY =
//   Extract<
//     UIMessage["parts"][number],
//     { type: "step-start" | "text" | "reasoning" | "file" | `tool-${string}` }
//   > extends Extract<
//     ClientMessagePayload["message"]["parts"][number],
//     { type: "step-start" | "text" | "reasoning" | "file" | `tool-${string}` }
//   >
//     ? true
//     : false;

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
