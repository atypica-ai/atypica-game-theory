import { tool } from "ai";
import { z } from "zod";
import { ensureSkillAvailable } from "@/lib/skill/fileManager";
import { prisma } from "@/prisma/prisma";
import fs from "fs/promises";
import path from "path";

/**
 * List files tool - simulates bash 'ls' for skill directories
 * Shows what files are available in a skill
 */
export function listFilesTool({ userId }: { userId: number }) {
  return tool({
    description: `List available files in a skill directory.

Use this to explore what files are available in a skill before reading them.

Examples:
- list_files({ path: "product-expert" }) - List root directory
- list_files({ path: "product-expert/references" }) - List references folder`,

    inputSchema: z.object({
      path: z
        .string()
        .describe("Skill directory path. Examples: 'product-expert' or 'product-expert/references'"),
    }),

    execute: async ({ path: dirPath }) => {
      const parts = dirPath.split("/");
      const skillName = parts[0];

      // 1. Get skill from database
      const skill = await prisma.agentSkill.findUnique({
        where: {
          userId_name: { userId, name: skillName },
        },
        select: { id: true, name: true },
      });

      if (!skill) {
        return {
          success: false,
          error: `Skill '${skillName}' not found`,
        };
      }

      // 2. Ensure skill files are available locally
      const localPath = await ensureSkillAvailable(skill.id);

      // 3. List files in the requested directory
      const targetPath = path.join(localPath, ...parts.slice(1));

      try {
        const entries = await fs.readdir(targetPath, { withFileTypes: true });

        const files = entries.map((entry) => {
          if (entry.isDirectory()) {
            return `${entry.name}/`;
          }
          return entry.name;
        });

        return {
          success: true,
          files,
          path: dirPath,
        };
      } catch {
        return {
          success: false,
          error: `Directory not found: ${dirPath}`,
        };
      }
    },
  });
}
