import { rootLogger } from "@/lib/logging";
import { getS3Object } from "@/lib/attachments/s3";
import { prisma } from "@/prisma/prisma";
import fs from "fs/promises";
import JSZip from "jszip";
import path from "path";
import { getSkillLocalPath } from "./paths";

/**
 * 确保 skill 文件在本地磁盘可用。
 * 如果不存在，从 S3 下载并解压。
 */
export async function ensureSkillAvailable(skillId: number): Promise<string> {
  const skill = await prisma.agentSkill.findUniqueOrThrow({
    where: { id: skillId },
    select: {
      userId: true,
      name: true,
      objectUrl: true,
    },
  });

  const localPath = getSkillLocalPath({ userId: skill.userId, skillName: skill.name });
  const skillMdPath = path.join(localPath, "SKILL.md");

  try {
    await fs.access(skillMdPath);
    return localPath;
  } catch {
    rootLogger.info(`[Sandbox] Downloading skill ${skill.name} from S3...`);

    try {
      const { fileBody } = await getS3Object(skill.objectUrl);
      const zip = await JSZip.loadAsync(fileBody);
      await fs.mkdir(localPath, { recursive: true });

      const files = Object.keys(zip.files);
      const skillMdFileName = files.find(
        (name) => name.endsWith("SKILL.md") && !zip.files[name].dir,
      );

      if (!skillMdFileName) {
        throw new Error("SKILL.md not found in zip file");
      }

      const prefixToRemove = skillMdFileName.replace(/SKILL\.md$/, "");

      for (const [filename, file] of Object.entries(zip.files)) {
        if (!file.dir) {
          const content = await file.async("nodebuffer");
          const relativePath = filename.startsWith(prefixToRemove)
            ? filename.slice(prefixToRemove.length)
            : filename;
          const filePath = path.join(localPath, relativePath);
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, content);
        }
      }

      rootLogger.info({ msg: "[Sandbox] Skill extracted", skillName: skill.name, localPath });
      return localPath;
    } catch (error) {
      rootLogger.error({
        msg: "[Sandbox] Failed to download skill",
        skillName: skill.name,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}

/**
 * 确保所有 skill 文件已缓存到本地磁盘（不加载到内存）。
 */
export async function ensureAllSkillsCached(
  skills: Array<{ id: number; name: string }>,
): Promise<void> {
  for (const skill of skills) {
    await ensureSkillAvailable(skill.id);
  }
}

/**
 * 清理本地 sandbox 缓存
 */
export async function cleanupSandboxCache(): Promise<void> {
  const sandboxDir = path.join(process.cwd(), ".next", "cache", "sandbox");
  try {
    await fs.rm(sandboxDir, { recursive: true, force: true });
    rootLogger.info("[Sandbox] Cleaned up local cache");
  } catch (error) {
    rootLogger.error({
      msg: "[Sandbox] Failed to clean cache",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
