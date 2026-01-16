import path from "path";

/**
 * 构建 skill 的本地文件系统路径
 * 不存储在数据库，运行时动态计算
 * 缓存在 .next/cache/skills 目录
 */
export function getSkillLocalPath(userId: number, skillName: string): string {
  return path.join(process.cwd(), ".next", "cache", "skills", `user-${userId}`, skillName);
}
