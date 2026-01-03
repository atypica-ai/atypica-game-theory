import { toolCallError } from "@/ai/tools/error";
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
  twitterPostCommentsTool,
  twitterSearchTool,
  twitterUserPostsTool,
  xhsNoteCommentsTool,
  xhsSearchTool,
  xhsUserNotesTool,
} from "@/ai/tools/social";
import { reasoningThinkingTool } from "@/ai/tools/tools";
import { AgentToolConfigArgs } from "@/ai/tools/types";
import { StudyToolName } from "@/app/(study)/tools/types";
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
export const scoutChatTools = ({
  locale,
  abortSignal,
  statReport,
  logger,
}: AgentToolConfigArgs) => ({
  [StudyToolName.dySearch]: dySearchTool,
  [StudyToolName.dyPostComments]: dyPostCommentsTool,
  [StudyToolName.dyUserPosts]: dyUserPostsTool,
  [StudyToolName.tiktokSearch]: tiktokSearchTool,
  [StudyToolName.tiktokPostComments]: tiktokPostCommentsTool,
  [StudyToolName.tiktokUserPosts]: tiktokUserPostsTool,
  [StudyToolName.insSearch]: insSearchTool,
  [StudyToolName.insUserPosts]: insUserPostsTool,
  [StudyToolName.insPostComments]: insPostCommentsTool,
  [StudyToolName.xhsSearch]: xhsSearchTool,
  [StudyToolName.xhsUserNotes]: xhsUserNotesTool,
  [StudyToolName.xhsNoteComments]: xhsNoteCommentsTool,
  [StudyToolName.twitterSearch]: twitterSearchTool,
  [StudyToolName.twitterUserPosts]: twitterUserPostsTool,
  [StudyToolName.twitterPostComments]: twitterPostCommentsTool,
  // 用于中间停下来思考一下，会在 prepareStep 里控制
  [StudyToolName.reasoningThinking]: reasoningThinkingTool({
    locale,
    abortSignal,
    statReport,
    logger,
  }),
  // 特殊用途，不应该被大模型主动调用
  [StudyToolName.toolCallError]: toolCallError,
});
