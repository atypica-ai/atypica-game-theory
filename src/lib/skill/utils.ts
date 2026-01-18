import path from "path";

/**
 * 构建 skill 的本地文件系统路径
 * 不存储在数据库，运行时动态计算
 * 缓存在 .next/cache/sandbox/user/{userId}/skills 目录
 */
export function getSkillLocalPath(userId: number, skillName: string): string {
  return path.join(
    process.cwd(),
    ".next",
    "cache",
    "sandbox",
    "user",
    String(userId),
    "skills",
    skillName,
  );
}

/**
 * 构建用户工作区的目录路径
 * 缓存在 .next/cache/sandbox/user/{userId}/workspace 目录
 * 用于持久化用户在 sandbox 中创建的文件
 */
export function getWorkspacePath(userId: number): string {
  return path.join(
    process.cwd(),
    ".next",
    "cache",
    "sandbox",
    "user",
    String(userId),
    "workspace",
  );
}
