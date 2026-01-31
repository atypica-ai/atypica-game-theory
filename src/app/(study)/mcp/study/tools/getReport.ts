import "server-only";

import { rootLogger } from "@/lib/logging";
import { getMcpRequestContext } from "@/lib/mcp";
import { getS3SignedCdnUrl } from "@/lib/attachments/actions";
import { prisma } from "@/prisma/prisma";
import { AnalystReportExtra } from "@/prisma/client";
import {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { z } from "zod";

export const getReportInputSchema = z.object({
  token: z.string().describe("Report token"),
});

export async function handleGetReport(
  args: z.infer<typeof getReportInputSchema>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
): Promise<CallToolResult> {
  try {
    const context = getMcpRequestContext();
    if (!context?.userId) {
      throw new Error("Missing userId in request context");
    }

    const { token } = args;
    const userId = context.userId;

    // Fetch report from database
    const report = await prisma.analystReport.findUnique({
      where: { token },
      select: {
        id: true,
        token: true,
        userId: true,
        instruction: true,
        onePageHtml: true,
        extra: true,
        generatedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!report) {
      throw new Error("Report not found");
    }

    if (report.userId !== userId) {
      throw new Error("Unauthorized: Report does not belong to user");
    }

    if (!report.generatedAt) {
      throw new Error("Report not yet generated");
    }

    // Get metadata from extra field (similar to fetchAnalystReportByToken)
    const extra = report.extra as AnalystReportExtra;
    const title = extra.title;
    const description = extra.description;

    // Get signed CDN URL for cover image
    const coverUrl = extra.coverObjectUrl
      ? await getS3SignedCdnUrl(extra.coverObjectUrl)
      : undefined;

    return {
      content: [
        {
          type: "text",
          text: `Report retrieved. Token: ${report.token}\nTitle: ${title || "N/A"}\nDescription: ${description || "N/A"}`,
        },
      ],
      structuredContent: {
        token: report.token,
        instruction: report.instruction,
        title,
        description,
        content: report.onePageHtml,
        coverUrl,
        generatedAt: report.generatedAt.toISOString(),
        createdAt: report.createdAt.toISOString(),
        updatedAt: report.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    rootLogger.error({ msg: "Failed to get report", error: errorMessage });
    return {
      content: [{ type: "text", text: `Error getting report: ${errorMessage}` }],
      isError: true,
    };
  }
}
