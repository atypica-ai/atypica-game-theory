import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { waitUntil } from "@vercel/functions";
import { tool } from "ai";
import { Logger } from "pino";
import { z } from "zod";
import { processPersonaImport } from "./processing";

export const followUpInterviewTools = ({
  personaImportId,
  logger,
}: {
  personaImportId: number;
  logger: Logger;
}) => ({
  endInterview: tool({
    description: "结束后续访谈并重新生成人物画像",
    parameters: z.object({
      followUpSummary: z.string().describe("后续访谈的总结"),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
    },
    execute: async ({ followUpSummary }) => {
      waitUntil(
        (async () => {
          try {
            await processPersonaImport(personaImportId);
          } catch (error) {
            logger.error("Failed to regenerate personas:", error);
          }
        })(),
      );
      return {
        followUpSummary,
        plainText: "访谈结束。系统正在基于补充回答重新生成用户画像。",
      };
    },
  }),
});
