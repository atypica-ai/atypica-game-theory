import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { prisma } from "@/prisma/prisma";
import { tool } from "ai";
import { Locale } from "next-intl";
import { endInterviewInputSchema, endInterviewOutputSchema } from "./types";

export const endInterviewTool = ({
  locale,
  userId,
  teamId,
}: {
  locale: Locale;
  userId?: number;
  teamId?: number;
}) => ({
  endInterview: tool({
    description:
      "End the interview and generate the user's personal memory. Call this when you have gathered sufficient information about their professional background, company, goals, and challenges (typically after 12-18 conversation rounds).",
    inputSchema: endInterviewInputSchema,
    outputSchema: endInterviewOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
    },
    execute: async ({ memory }) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      try {
        const where = teamId ? { teamId } : { userId };
        const latestMemory = await prisma.memory.findFirst({
          where,
          orderBy: { version: "desc" },
          select: { version: true },
        });

        const nextVersion = (latestMemory?.version ?? 0) + 1;

        await prisma.memory.create({
          data: {
            userId: userId ?? null,
            teamId: teamId ?? null,
            version: nextVersion,
            core: memory,
            working: [],
            changeNotes: teamId
              ? "Initial memory from context builder interview"
              : "Initial memory from personal context builder interview",
          },
        });

        const label = teamId ? `team: ${teamId}` : `user: ${userId}`;
        console.log(`Memory saved to database (${label}, version: ${nextVersion})`);
      } catch (error) {
        console.error("Failed to save memory to database:", error);
      }

      return {
        plainText:
          locale === "zh-CN"
            ? "感谢你的分享！你的背景档案已经构建完成。"
            : "Thank you for sharing! Your background profile has been created.",
      };
    },
  }),
});
