import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/prisma/prisma";

/**
 * List skills tool - shows all available skills in user's library
 */
export function listSkillsTool({ userId }: { userId: number }) {
  return tool({
    description: `List all skills available in your skill library.

Returns a list of skills with their names and descriptions. Use this to discover what specialized capabilities are available before loading a skill.`,

    inputSchema: z.object({}),

    execute: async () => {
      const skills = await prisma.agentSkill.findMany({
        where: { userId },
        select: {
          name: true,
          description: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      if (skills.length === 0) {
        return {
          success: true,
          skills: [],
          message: "No skills available. You can upload .skill files to add specialized capabilities.",
        };
      }

      return {
        success: true,
        skills: skills.map((skill) => ({
          name: skill.name,
          description: skill.description,
          path: `${skill.name}/SKILL.md`,
        })),
      };
    },
  });
}
