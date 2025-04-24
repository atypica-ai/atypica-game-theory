import { getDeployRegion } from "@/lib/deployRegion";
import { llm, LLMModelName, providerOptions } from "@/lib/llm";
import {
  appendChunkToStreamingMessage,
  convertDBMessageToAIMessage,
  convertStepsToAIMessage,
  createDebouncePersistentMessage,
  fixChatMessages,
  persistentAIMessageToDB,
} from "@/lib/messageUtils";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/utils";
import { scoutSystem } from "@/prompt";
import {
  dyPostCommentsTool,
  dySearchTool,
  dyUserPostsTool,
  insPostCommentsTool,
  insSearchTool,
  insUserPostsTool,
  reasoningThinkingTool,
  savePersonaTool,
  StatReporter,
  tiktokPostCommentsTool,
  tiktokSearchTool,
  tiktokUserPostsTool,
  ToolName,
  xhsNoteCommentsTool,
  xhsSearchTool,
  xhsUserNotesTool,
} from "@/tools";
import { PlainTextToolResult } from "@/tools/utils";
import { convertToCoreMessages, generateId, Message, streamText, TextStreamPart, tool } from "ai";
import { z } from "zod";

const REDUCE_TOKENS: {
  model: LLMModelName;
  ratio: number;
} = {
  model: "gemini-2.5-flash",
  ratio: 5,
};

export interface ScoutTaskChatResult extends PlainTextToolResult {
  personas: {
    id: number;
    name: string;
    tags: string[];
  }[];
  plainText: string;
}

export const scoutTaskChatTool = ({
  userId,
  abortSignal,
  statReport,
}: {
  userId: number;
  abortSignal: AbortSignal;
  statReport: StatReporter;
}) =>
  tool({
    description: "开始执行用户画像搜索任务",
    parameters: z.object({
      scoutUserChatToken: z
        .string()
        .optional()
        .describe(
          "用户画像搜索任务 (scoutTask) 的 token，用于创建任务，如果上一个 scoutTaskChat 任务未完成，请提供上一个 scoutUserChatToken，否则忽略这个参数，系统会自动生成",
        )
        .default(() => generateToken()),
      // 始终生成一个新的 token，并且这个会直接覆盖 message 里面 toolInvocation.args 上的参数
      // .transform(() => generateToken()),
      description: z.string().describe('用户画像搜索需求描述，可以用"帮我寻找"或类似英文短语开头'),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
    },
    execute: async ({ scoutUserChatToken, description }) => {
      // if (await prisma.userChat.findUnique({ where: { token: scoutUserChatToken } })) {
      //   return {
      //     personas: [],
      //     plainText: `你提供的 scoutUserChatToken ${scoutUserChatToken} 已经存在，无法使用，请重试。你可以忽略提供这个字段，系统会自动生成 token。`,
      //   };
      // }
      const title = description.substring(0, 50);
      const scoutUserChat = await prisma.userChat.upsert({
        where: {
          userId,
          kind: "scout",
          token: scoutUserChatToken,
        },
        create: {
          userId,
          title,
          kind: "scout",
          token: scoutUserChatToken,
        },
        update: {},
      });
      const scoutUserChatId = scoutUserChat.id;
      // 插入一条新的消息
      await persistentAIMessageToDB(scoutUserChatId, {
        id: generateId(),
        role: "user",
        content: description,
      });
      let hasError = false;
      try {
        await runScoutTaskChatStream({
          scoutUserChatId,
          abortSignal,
          statReport,
        });
      } catch (error) {
        console.log(
          `ScoutTaskChat [${scoutUserChatId}] runScoutTaskChatStream failed:`,
          (error as Error).message,
        );
        hasError = true;
      }
      const personasResult = await prisma.persona.findMany({
        where: { scoutUserChatId },
        orderBy: { createdAt: "desc" },
      });
      const personas = personasResult.map((persona) => ({
        id: persona.id,
        name: persona.name,
        tags: persona.tags as string[],
      }));
      return {
        personas: personas,
        // 如果有 personas，就算 hasError 也忽略，不要告诉 llm，不然容易给 llm 造成困扰以为找到的 personas 有问题
        plainText: personas.length
          ? `${personas.length} personas found: ${JSON.stringify(personas)}`
          : hasError
            ? "Something went wrong"
            : "No personas found",
      };
    },
  });

async function runScoutTaskChatStream({
  scoutUserChatId,
  abortSignal,
  statReport,
}: {
  scoutUserChatId: number;
  abortSignal: AbortSignal;
  statReport: StatReporter;
}): Promise<void> {
  const backgroundToken = new Date().valueOf().toString();
  try {
    await prisma.userChat.update({
      where: { id: scoutUserChatId, kind: "scout" },
      data: { backgroundToken },
    });
  } catch (error) {
    console.log(
      `ScoutTaskChat [${scoutUserChatId}] Error resetting scoutyUserChat with token ${backgroundToken}`,
      error,
    );
    throw error;
  }

  const clearBackgroundToken = async () => {
    try {
      // mark as background running end
      await prisma.userChat.update({
        where: { id: scoutUserChatId, backgroundToken },
        data: { backgroundToken: null },
      });
    } catch (error) {
      console.log(
        `ScoutTaskChat [${scoutUserChatId}] Error clearing background token ${backgroundToken}`,
        error,
      );
    }
  };
  const allTools = {
    [ToolName.reasoningThinking]: reasoningThinkingTool({ abortSignal, statReport }),
    [ToolName.xhsSearch]: xhsSearchTool,
    [ToolName.xhsUserNotes]: xhsUserNotesTool,
    [ToolName.xhsNoteComments]: xhsNoteCommentsTool,
    [ToolName.dySearch]: dySearchTool,
    [ToolName.dyPostComments]: dyPostCommentsTool,
    [ToolName.dyUserPosts]: dyUserPostsTool,
    [ToolName.tiktokSearch]: tiktokSearchTool,
    [ToolName.tiktokPostComments]: tiktokPostCommentsTool,
    [ToolName.tiktokUserPosts]: tiktokUserPostsTool,
    [ToolName.insSearch]: insSearchTool,
    [ToolName.insUserPosts]: insUserPostsTool,
    [ToolName.insPostComments]: insPostCommentsTool,
    [ToolName.savePersona]: savePersonaTool({ scoutUserChatId, statReport }),
  };

  let reduceTokens: typeof REDUCE_TOKENS | null = REDUCE_TOKENS;
  let round = 0;
  while (true) {
    const tools =
      round < 2
        ? allTools
        : {
            [ToolName.reasoningThinking]: reasoningThinkingTool({ abortSignal, statReport }),
            [ToolName.savePersona]: savePersonaTool({ scoutUserChatId, statReport }),
          };

    const messagesInDB = await prisma.chatMessage.findMany({
      where: { userChatId: scoutUserChatId },
      orderBy: { id: "asc" },
    });
    const aiMessages = fixChatMessages(messagesInDB.map(convertDBMessageToAIMessage)); // 传给 LLM 的时候需要修复
    const coreMessages = convertToCoreMessages(aiMessages);
    const streamTextPromise = new Promise<Omit<Message, "role">>((resolve, reject) => {
      const streamingMessage: Omit<Message, "parts"> & { parts: NonNullable<Message["parts"]> } = {
        id: generateId(),
        role: "assistant",
        content: "",
        parts: [],
      };
      const { debouncePersistentMessage, immediatePersistentMessage } =
        createDebouncePersistentMessage("Scout", scoutUserChatId, 5000); // 5000 debounce
      const response = streamText({
        model: reduceTokens ? llm(reduceTokens.model) : llm("claude-3-7-sonnet"),
        // model: llm("claude-3-7-sonnet-beta")  // 这个模型不大好用，savePersona 总是返回一半输入
        providerOptions: providerOptions,
        system: scoutSystem(),
        messages: coreMessages,
        tools,
        maxSteps: 15,
        // onChunk: (chunk) => console.log(`[${scoutUserChatId}] ScoutTaskChat:`, JSON.stringify(chunk).substring(0, 100)),
        onFinish: async ({ steps }) => {
          const message = convertStepsToAIMessage(steps);
          resolve(message);
          await statReport("steps", steps.length, {
            reportedBy: "scoutTaskChat tool",
            scoutUserChatId,
          });
        },
        onChunk: async ({ chunk }: { chunk: TextStreamPart<typeof allTools> }) => {
          // console.log(`[${scoutUserChatId}] StudyChat onChunk:`, chunk);
          appendChunkToStreamingMessage(streamingMessage, chunk);
          await debouncePersistentMessage(streamingMessage, {
            immediate: chunk.type !== "text-delta",
            // 只在 text-delta 类型的时候才 debounce，靠谱点。see https://github.com/bmrlab/atypica-llm-app/issues/40
            // immediate: chunk.type === "tool-call" || chunk.type === "tool-result",
          });
        },
        onStepFinish: async (step) => {
          await immediatePersistentMessage();
          // 注意，stepFinish 一定要保存，并且强制 immediate:true
          // 有时候 llm 返回的消息很少，前面 onChunk 的 persistent 还在 debounce 的时候，后面 user 的 continue 消息已经保存了，这就会导致
          // - assistant 消息还来不及 create，新的 user 消息会覆盖前一条 user 消息
          // - assistant 消息还不完整，新一轮对话拿到的 messages 不完整
          console.log(
            `ScoutTaskChat [${scoutUserChatId}] step [${step.stepType}]`,
            step.toolCalls.map((call) => call.toolName),
            step.usage,
          );
          if (step.usage.totalTokens > 0) {
            let tokens = step.usage.totalTokens;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const extra: any = {
              reportedBy: "scoutTaskChat tool",
              scoutUserChatId,
            };
            if (reduceTokens) {
              extra["reduceTokens"] = { originalTokens: tokens, ...reduceTokens };
              tokens = Math.ceil(tokens / reduceTokens.ratio);
            }
            await statReport("tokens", tokens, extra);
          }
          // appendStepToStreamingMessage(streamingMessage, step);
          // if (streamingMessage.parts?.length && streamingMessage.content.trim()) {
          //   await persistentAIMessageToDB(scoutUserChatId, streamingMessage);
          // }
        },
        onError: ({ error }) => {
          console.log(
            `ScoutTaskChat [${scoutUserChatId}] runScoutTaskChatStream streamText onError:`,
            error,
          );
          reject(error);
        },
        abortSignal,
      });
      // 这里不要 await 而是用 then，否则会出现一系列嵌套的 await new promise 最终导致 abortController.abort() 操作被取消
      // 可能是 studychat 先断了，await 结束了，后面的 abort 就失败了
      response.consumeStream().catch((error) => reject(error));
    });

    try {
      const message = await streamTextPromise;
      console.log(
        `ScoutTaskChat [${scoutUserChatId}] message stream complete:`,
        message.content.substring(0, 20),
      );
    } catch (error) {
      const errMsg = (error as Error).message;
      console.log(`ScoutTaskChat [${scoutUserChatId}] message stream error:`, errMsg);
      if (errMsg.includes("RESOURCE_EXHAUSTED")) {
        // 如果遇到了用量限制，不报错，换个模型
        console.log(
          `ScoutTaskChat [${scoutUserChatId}] RESOURCE_EXHAUSTED, fallback to llm without reduceTokens`,
        );
        reduceTokens = null;
      } else {
        await clearBackgroundToken();
        throw error;
      }
    }

    const personasResult = await prisma.persona.findMany({
      where: { scoutUserChatId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (personasResult.length < 5) {
      // 开始一轮新的搜索，插入一条新消息，下一次循环开始的时候会从数据库里读取新的 messages 记录
      await persistentAIMessageToDB(scoutUserChatId, {
        id: generateId(),
        role: "user",
        content:
          getDeployRegion() === "mainland"
            ? `目前总结了${personasResult.length}个personas，还不够5个，请批量保存人设后再考虑是否继续`
            : `Currently we have identified ${personasResult.length} personas, which is not enough to reach 5. Please continue saving multiple personas and then consider whether to continue`,
      });
      round++;
      continue;
    } else {
      break;
    }
  }
  // while loop end
  //
  // 完全结束以后，清理 backgroundToken
  await clearBackgroundToken();
}

// export interface ScoutTaskCreateResult extends PlainTextToolResult {
//   scoutUserChatId: number;
//   scoutUserChatToken: string;
//   title: string;
//   plainText: string;
// }

// export const scoutTaskCreateTool = (userId: number) =>
//   tool({
//     description: "创建一个用户画像搜索任务",
//     parameters: z.object({
//       description: z.string().describe('用户画像搜索需求描述，用"帮我寻找"开头'),
//     }),
//     experimental_toToolResultContent: (result: PlainTextToolResult) => {
//       return [{ type: "text", text: result.plainText }];
//     },
//     execute: async ({ description }): Promise<ScoutTaskCreateResult> => {
//       const title = description.substring(0, 50);
//       const scoutUserChat = await prisma.userChat.create({
//         data: {
//           userId,
//           title,
//           kind: "scout",
//           token: generateToken(),
//         },
//       });
//       return {
//         scoutUserChatId: scoutUserChat.id,
//         scoutUserChatToken: scoutUserChat.token,
//         title: scoutUserChat.title,
//         plainText: JSON.stringify({
//           scoutUserChatId: scoutUserChat.id,
//           title: scoutUserChat.title,
//         }),
//       };
//     },
//   });
