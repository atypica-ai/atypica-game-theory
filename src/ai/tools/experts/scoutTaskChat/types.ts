import {
  dyPostCommentsTool,
  dySearchTool,
  dyUserPostsTool,
  insPostCommentsTool,
  insSearchTool,
  insUserPostsTool,
  tiktokPostCommentsTool,
  tiktokSearchTool,
  tiktokUserPostsTool,
  toolCallError,
  twitterPostCommentsTool,
  twitterSearchTool,
  twitterUserPostsTool,
  xhsNoteCommentsTool,
  xhsSearchTool,
  xhsUserNotesTool,
} from "@/ai/tools/tools";
import { ToolName } from "@/ai/tools/types";
import { generateToken } from "@/lib/utils";
import z from "zod/v3";

export type TPlatform = "小红书" | "抖音" | "TikTok" | "Instagram" | "Twitter";

export const scoutTaskChatInputSchema = z.object({
  scoutUserChatToken: z
    .string()
    .optional()
    .describe(
      "Unique identifier for the search task used to create the task. You don't need to provide this - the system will automatically generate it.",
    )
    .transform(() => generateToken()),
  // 始终生成一个新的 token，并且这个会直接覆盖 message 里面 toolInvocation.args 上的参数
  description: z
    .string()
    .describe(
      "Research objective describing the target user groups or behavioral patterns to investigate. Use descriptive phrases like 'Help me find users who...', 'Research people interested in...', '帮我寻找...', or similar research requests.",
    ),
});

export type ScoutTaskChatToolInput = z.infer<typeof scoutTaskChatInputSchema>;

export const scoutTaskChatOutputSchema = z.object({
  personas: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        tags: z.array(z.string()),
      }),
    )
    .optional()
    .describe("Historical messages may have personas"), // 历史消息的任务里是有 personas 的，新的没了，不过这个需要长期保留，不做迁移
  stats: z.record(z.string(), z.number()).optional().describe("Platform usage statistics"),
  plainText: z.string(),
});

export type ScoutTaskChatResult = z.infer<typeof scoutTaskChatOutputSchema>;

// 要给 buildPersona tool 的 prepareMessagesForStreaming 用，在转成 model message 的时候调用 toModelOutput
// 不能直接 export，不然 build 阶段会报错
export const scoutChatTools = () => ({
  [ToolName.dySearch]: dySearchTool,
  [ToolName.dyPostComments]: dyPostCommentsTool,
  [ToolName.dyUserPosts]: dyUserPostsTool,
  [ToolName.tiktokSearch]: tiktokSearchTool,
  [ToolName.tiktokPostComments]: tiktokPostCommentsTool,
  [ToolName.tiktokUserPosts]: tiktokUserPostsTool,
  [ToolName.insSearch]: insSearchTool,
  [ToolName.insUserPosts]: insUserPostsTool,
  [ToolName.insPostComments]: insPostCommentsTool,
  [ToolName.xhsSearch]: xhsSearchTool,
  [ToolName.xhsUserNotes]: xhsUserNotesTool,
  [ToolName.xhsNoteComments]: xhsNoteCommentsTool,
  [ToolName.twitterSearch]: twitterSearchTool,
  [ToolName.twitterUserPosts]: twitterUserPostsTool,
  [ToolName.twitterPostComments]: twitterPostCommentsTool,
  [ToolName.toolCallError]: toolCallError,
});
