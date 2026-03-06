import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { prisma } from "@/prisma/prisma";
import { tool } from "ai";
import { Locale } from "next-intl";
import { endInterviewInputSchema, endInterviewOutputSchema } from "./types";

export const contextBuilderTools = ({ locale, userId }: { locale: Locale; userId: number }) => ({
  endInterview: tool({
    description:
      "End the interview and generate the user's personal memory. Call this when you have gathered sufficient information about their professional background, company, goals, and challenges (typically after 12-18 conversation rounds).",
    inputSchema: endInterviewInputSchema,
    outputSchema: endInterviewOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
    },
    execute: async ({ memory }) => {
      // 故意等1s，这样前端可以感觉到工具正在被执行。
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 存储 memory 到数据库
      try {
        // 获取当前最大版本号
        const latestMemory = await prisma.memory.findFirst({
          where: { userId },
          orderBy: { version: "desc" },
          select: { version: true },
        });

        const nextVersion = (latestMemory?.version ?? 0) + 1;

        await prisma.memory.create({
          data: {
            userId,
            teamId: null,
            version: nextVersion,
            core: memory,
            working: [],
            changeNotes: "Initial memory from personal context builder interview",
          },
        });

        console.log(`✅ Memory saved to database (user: ${userId}, version: ${nextVersion})`);
      } catch (error) {
        console.error("Failed to save memory to database:", error);
        // 不抛出错误，继续执行
      }

      return {
        plainText:
          locale === "zh-CN"
            ? "感谢你的分享！你的个人档案已经构建完成。"
            : "Thank you for sharing! Your personal profile has been created.",
      };
    },
  }),
});
