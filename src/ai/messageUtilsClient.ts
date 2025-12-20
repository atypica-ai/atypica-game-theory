import { ChatMessageAttachment } from "@/prisma/client";
import { isToolUIPart, UIDataTypes, UIMessage, UIMessagePart, UITools } from "ai";
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
    metadata: z
      .object({
        shouldCorrectUserMessage: z.boolean().optional(), // 语音输入需要后台优化
      })
      .optional(),
  }),
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
export function prepareLastUIMessageForRequest<T extends UIMessage>(messages: T[]) {
  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role === "user" || lastMessage.role === "assistant") {
    const { id, role, parts: allParts, metadata } = lastMessage;
    const parts = allParts.filter((part) => part.type == "text" || isToolUIPart(part));
    return { id, role, parts, metadata: metadata as T["metadata"] };
  } else {
    throw new Error("Invalid message role");
  }
}
