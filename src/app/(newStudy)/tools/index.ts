import "server-only";

import { readAttachmentTool } from "@/ai/tools/readAttachment";
import { webFetchTool } from "@/ai/tools/tools";
import { AgentToolConfigArgs, BasicToolName, PlainTextToolResult } from "@/ai/tools/types";
import { tool } from "ai";
import { Locale } from "next-intl";
import { endInterviewInputSchema, endInterviewOutputSchema } from "./types";

export const newStudyTools = ({
  locale,
  userId,
  userChatId,
  ...agentArgs
}: {
  locale: Locale;
  userId: number;
  userChatId: number;
} & Omit<AgentToolConfigArgs, "locale">) => ({
  endInterview: tool({
    description: "End the planning session and generate the user's study brief",
    inputSchema: endInterviewInputSchema,
    outputSchema: endInterviewOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    execute: async ({ studyBrief }) => {
      // 故意等1s，这样前端可以感觉到工具正在被执行。
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return {
        plainText: "Study brief generated successfully.",
      };
    },
  }),
  [BasicToolName.webFetch]: webFetchTool({ locale }),
  readAttachment: readAttachmentTool({ userId, userChatId, locale, ...agentArgs }),
});
