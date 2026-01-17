import { rootLogger } from "@/lib//logging";
import { getS3Object } from "@/lib/attachments/s3";
import { prisma } from "@/prisma/prisma";
import fs from "fs/promises";
import JSZip from "jszip";
import path from "path";
import { getSkillLocalPath } from "./utils";

/**
 * 确保 skill 文件在本地可用
 * 如果不存在，从 S3 下载并解压
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

  // 构建本地路径（不从数据库读取）
  const localPath = getSkillLocalPath(skill.userId, skill.name);
  const skillMdPath = path.join(localPath, "SKILL.md");

  // 检查本地是否存在
  try {
    await fs.access(skillMdPath);
    // 文件存在，直接返回
    return localPath;
  } catch {
    // 文件不存在，从 S3 下载
    rootLogger.info(`[Skill] Downloading ${skill.name} from S3...`);

    try {
      // 1. 从 S3 下载
      const { fileBody } = await getS3Object(skill.objectUrl);

      // 2. 解压到本地
      const zip = await JSZip.loadAsync(fileBody);
      await fs.mkdir(localPath, { recursive: true });

      // 找到 SKILL.md 所在的目录前缀（可能在根目录或子目录）
      const files = Object.keys(zip.files);
      const skillMdFileName = files.find(
        (name) => name.endsWith("SKILL.md") && !zip.files[name].dir,
      );

      if (!skillMdFileName) {
        throw new Error("SKILL.md not found in zip file");
      }

      // 计算需要剥离的前缀（SKILL.md 所在的目录）
      const prefixToRemove = skillMdFileName.replace(/SKILL\.md$/, "");

      for (const [filename, file] of Object.entries(zip.files)) {
        if (!file.dir) {
          const content = await file.async("nodebuffer");
          // 剥离顶层目录前缀
          const relativePath = filename.startsWith(prefixToRemove)
            ? filename.slice(prefixToRemove.length)
            : filename;
          const filePath = path.join(localPath, relativePath);
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, content);
        }
      }

      rootLogger.info(`[Skill] Downloaded and extracted to ${localPath}`);
      return localPath;
    } catch (error) {
      rootLogger.error({
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        msg: `[Skill] Failed to download and extract ${skill.name} from S3:`,
      });
      throw error;
    }
  }
}

/**
 * 清理本地 sandbox 缓存（可在启动时或定期调用）
 */
export async function cleanupSkillsCache(): Promise<void> {
  const sandboxDir = path.join(process.cwd(), ".next", "cache", "sandbox");

  try {
    await fs.rm(sandboxDir, { recursive: true, force: true });
    rootLogger.info("[Skill] Cleaned up local sandbox cache");
  } catch (error) {
    rootLogger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      msg: "[Skill] Failed to clean cache:",
    });
  }
}
