import "server-only";

import { createStudyUserChat } from "@/app/(study)/study/lib";
import { rootLogger } from "@/lib/logging";
import { getMcpRequestContext } from "@/lib/mcp";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export const createStudyInputSchema = z.object({
  content: z.string().min(1).describe("The initial user message to start the study"),
  // 目前暂时不支持
  // attachments: z
  //   .array(
  //     z.object({
  //       objectUrl: z.string().describe("S3 object URL without signature"),
  //       name: z.string().describe("File name"),
  //       mimeType: z.string().describe("MIME type"),
  //       size: z.number().describe("File size in bytes"),
  //     }),
  //   )
  //   .optional()
  //   .describe("Optional file attachments"),
});

export async function handleCreateStudy(
  args: z.infer<typeof createStudyInputSchema>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
): Promise<CallToolResult> {
  try {
    const context = getMcpRequestContext();
    if (!context?.userId) {
      throw new Error("Missing userId in request context");
    }

    const { content } = args;
    const userId = context.userId;

    const logger = rootLogger.child({
      mcp: "atypica-study-mcp",
      tool: "create_study",
      userId,
    });

    // Call shared lib function
    const userChat = await createStudyUserChat({
      userId,
      role: "user",
      content,
      // attachments,
    });

    logger.info({
      msg: "Study created via MCP",
      studyId: userChat.id,
      token: userChat.token,
    });

    return {
      content: [
        {
          type: "text",
          text: `Study created successfully. Token: ${userChat.token}`,
        },
      ],
      structuredContent: {
        token: userChat.token,
        studyId: userChat.id,
        status: "created",
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    rootLogger.error({ msg: "Failed to create study", error: errorMessage });
    return {
      content: [{ type: "text", text: `Error creating study: ${errorMessage}` }],
      isError: true,
    };
  }
}
