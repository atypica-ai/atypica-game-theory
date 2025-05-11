import { PlainTextToolResult } from "@/ai/tools";
import { prisma } from "@/prisma/prisma";
import { tool } from "ai";
import { z } from "zod";

export interface UpdateInterviewProjectToolResult extends PlainTextToolResult {
  interviewProject?: {
    id: number;
    brief: string | null;
    objectives: string[];
    title: string;
    category: string;
  };
  plainText: string;
}

export const updateInterviewProjectTool = ({ projectId }: { projectId: number }) =>
  tool({
    description:
      "Updates the interview project's brief and objectives based on the clarification chat.",
    parameters: z.object({
      brief: z
        .string()
        .describe(
          "A clear and concise brief explaining the purpose and goals of the research project.",
        ),
      objectives: z
        .array(z.string())
        .describe("A list of specific research objectives that the project aims to achieve."),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
    },
    execute: async ({ brief, objectives }): Promise<UpdateInterviewProjectToolResult> => {
      try {
        // Update the project with the new brief and objectives
        const interviewProject = await prisma.interviewProject.update({
          where: {
            id: projectId,
          },
          data: {
            brief: brief,
            objectives: objectives,
          },
          select: {
            id: true,
            brief: true,
            objectives: true,
            title: true,
            category: true,
          },
        });
        return {
          plainText: "Project brief and objectives updated successfully",
          interviewProject,
        };
      } catch (error) {
        console.error("Error updating interview project:", error);
        return {
          plainText: "Failed to update interview project",
        };
      }
    },
  });
