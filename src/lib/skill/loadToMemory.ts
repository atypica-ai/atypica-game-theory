import fs from "fs/promises";
import path from "path";
import { ensureSkillAvailable } from "./fileManager";

/**
 * 递归加载 skill 目录的所有文件到内存
 * @param localPath - 本地文件系统路径（如 .next/cache/skills/user-123/ai-product-growth/）
 * @param virtualPath - 虚拟文件系统路径（如 ai-product-growth）
 * @param files - 输出的文件映射对象
 */
async function loadDirectoryToMemory(
  localPath: string,
  virtualPath: string,
  files: Record<string, string>,
): Promise<void> {
  const entries = await fs.readdir(localPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(localPath, entry.name);
    const virtualFilePath = virtualPath ? `${virtualPath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      // 递归处理子目录
      await loadDirectoryToMemory(fullPath, virtualFilePath, files);
    } else {
      // 读取文件内容到内存
      try {
        const content = await fs.readFile(fullPath, "utf-8");
        files[virtualFilePath] = content;
      } catch (error) {
        console.warn(`[Skill] Failed to read file ${fullPath}:`, error);
      }
    }
  }
}

/**
 * 加载单个 skill 的所有文件到内存
 * @param localPath - skill 的本地路径（如 .next/cache/skills/user-123/ai-product-growth/）
 * @param skillName - skill 名称（如 ai-product-growth）
 * @param files - 输出的文件映射对象
 */
export async function loadSkillFilesToMemory(
  localPath: string,
  skillName: string,
  files: Record<string, string>,
): Promise<void> {
  await loadDirectoryToMemory(localPath, skillName, files);
}

/**
 * 从本地加载所有 skills 到内存，准备给 bash-tool 使用
 * @param skills - skill 记录数组（需要包含 id 和 name）
 * @returns files 对象，键是虚拟路径，值是文件内容
 */
export async function loadAllSkillsToMemory(
  skills: Array<{ id: number; name: string }>,
): Promise<Record<string, string>> {
  const files: Record<string, string> = {};

  for (const skill of skills) {
    const localPath = await ensureSkillAvailable(skill.id);
    await loadSkillFilesToMemory(localPath, skill.name, files);
  }

  return files;
}
