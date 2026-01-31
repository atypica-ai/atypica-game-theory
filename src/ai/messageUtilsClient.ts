import { ChatMessageAttachment } from "@/prisma/client";
import { isToolUIPart, UIMessage } from "ai";
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
  // message: z.object({
  //   id: z.string().optional(),
  //   role: z.enum(["user", "assistant"]),
  //   // parts: z.custom<UIMessagePart<UIDataTypes, UITools>[]>(() => true),
  //   lastPart: z.custom<UIMessagePart<UIDataTypes, UITools>>(() => true),
  //   metadata: z
  //     .object({
  //       shouldCorrectUserMessage: z.boolean().optional(),
  //     })
  //     .passthrough()
  //     .optional(),
  // }),
  message: z.union([
    z.object({
      id: z.string().optional(),
      role: z.literal("user"),
      lastPart: z.object({
        type: z.literal("text"),
        text: z.string(),
      }),
      metadata: z
        .object({
          shouldCorrectUserMessage: z.boolean().optional(),
        })
        .passthrough()
        .optional(),
    }),
    z.object({
      id: z.string().optional(),
      role: z.literal("assistant"),
      lastPart: z.object({
        type: z.custom<`tool-${string}`>(
          (val) => typeof val === "string" && val.startsWith("tool-"),
        ),
        toolCallId: z.string(),
        state: z.literal("output-available"),
        input: z.union([
          z.object({}).passthrough(),
          z.array(z.unknown()),
          z.null(),
          z.number(),
          z.string(),
        ]),
        output: z.unknown(),
      }),
      metadata: z.undefined(),
    }),
  ]),
  userChatToken: z.string(),
  attachments: z
    .array(
      z
        .object({
          objectUrl: z.string(), // s3 object url without signature
          name: z.string(),
          mimeType: z.string(),
          size: z.number(), // bytes
        })
        .transform((v) => v as ChatMessageAttachment),
    )
    .optional(),
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
  // [a-zA-Z0-9] 后面不需要 +, 这样会循环(/g)替换 X X 为 X_X，支持1个 _ 或多个 _
  const normalizedText = trimmedText.replace(/([a-zA-Z0-9])(?:\s|-)([a-zA-Z0-9])/g, "$1_$2");
  return /^\[(READY|USER_HESITATED|CONTINUE|CONTINUE_ASSISTANT_STEPS|TOOL_RESULT|TEXT)\]$/i.test(
    normalizedText,
  );
}

/**
 * 返回正确的 lastMessage 类型，以匹配 ClientMessagePayload["message"]
 * useChat 提交的最后一条消息，role 不会是 system，只有用户输入的文本和 addToolResult 提交的 tool result 两种类型
 */
export function prepareLastUIMessageForRequest<T extends UIMessage>(
  messages: T[],
): ClientMessagePayload["message"] {
  const lastMessage = messages[messages.length - 1];
  // if (lastMessage.role === "user" || lastMessage.role === "assistant") {
  //   const { id, role, parts: allParts, metadata } = lastMessage;
  //   // ⚠️ 这是个严重的 bug，模型会返回 text 以外的类型的，比如 reasoning，因为 persistentAIMessageToDB 是覆盖 parts，
  //   // 这里不应该过滤，因为这里是一条返回所有 parts 的 message，而不只是一个 tool result part
  //   // const parts = allParts.filter((part) => part.type == "text" || isToolUIPart(part));
  //   // return { id, role, parts: allParts, metadata: metadata as T["metadata"] };
  //   // 以上都忽略，为了更靠谱的类型验证，现在 ClientMessagePayload 严格要求前端只能发送最后一个 part，后端从数据库取了以后合并
  //   const lastPart = allParts.at(-1);
  //   if (!lastPart) throw new Error("Last part is undefined");
  //   return {
  //     id,
  //     role,
  //     lastPart,
  //     metadata: metadata as ClientMessagePayload["message"]["metadata"],
  //   } satisfies ClientMessagePayload["message"];
  const { id, role, parts: allParts, metadata } = lastMessage;
  const lastPart = allParts.at(-1);
  if (role === "user") {
    if (lastPart?.type !== "text") throw new Error("Last part is missing or not text");
    return {
      id,
      role,
      lastPart,
      metadata: metadata as Extract<ClientMessagePayload["message"], { role: "user" }>["metadata"],
    } satisfies ClientMessagePayload["message"];
  } else if (role === "assistant") {
    if (!lastPart || !isToolUIPart(lastPart) || lastPart.state !== "output-available")
      throw new Error("Last part is not a tool output");
    return {
      id,
      role,
      lastPart: lastPart as Extract<
        ClientMessagePayload["message"],
        { role: "assistant" }
      >["lastPart"],
    } satisfies ClientMessagePayload["message"];
  } else {
    throw new Error("Invalid message role");
  }
}
