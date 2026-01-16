import { ensureSkillAvailable } from "@/lib/skill/fileManager";
import { prisma } from "@/prisma/prisma";
import { tool } from "ai";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";

/**
 * Read file tool - simulates bash 'cat' for skill files
 * Loads SKILL.md or reference files from the skill library
 */
export function readFileTool({ userId }: { userId: number }) {
  return tool({
    description: `Read a skill file or reference document from your skill library.

This tool simulates reading files from a virtual filesystem. Use it to:
- Load a skill: read_file({ path: "skill-name/SKILL.md" })
- Read references: read_file({ path: "skill-name/references/core-memory.md" })

Available paths follow the pattern:
- skill-name/SKILL.md
- skill-name/references/filename.md

The skill files are loaded on-demand from persistent storage.`,

    inputSchema: z.object({
      path: z
        .string()
        .describe(
          "Path to the file. Examples: 'product-expert/SKILL.md' or 'product-expert/references/core-memory.md'",
        ),
    }),

    execute: async ({ path: filePath }) => {
      // Parse path: skill-name/SKILL.md or skill-name/references/filename.md
      const parts = filePath.split("/");

      if (parts.length < 2) {
        return {
          success: false,
          error:
            "Invalid path format. Use: skill-name/SKILL.md or skill-name/references/filename.md",
        };
      }

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
          error: `Skill '${skillName}' not found. Use list_skills to see available skills.`,
        };
      }

      // 2. Ensure skill files are available locally (lazy loading from S3)
      const localPath = await ensureSkillAvailable(skill.id);

      // 3. Read the requested file
      const fullPath = path.join(localPath, ...parts.slice(1));

      try {
        const content = await fs.readFile(fullPath, "utf-8");
        return {
          success: true,
          content,
        };
      } catch {
        return {
          success: false,
          error: `File not found: ${filePath}. Check if the file exists using list_files.`,
        };
      }
    },
  });
}
