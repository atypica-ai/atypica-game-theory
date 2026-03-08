import path from "path";

// ── Sandbox virtual paths (inside just-bash) ────────────────────────────
// cwd 就是 workspace，agent 直接操作当前目录即可
export const SANDBOX_CWD = "/workspace";
export const SANDBOX_WORKSPACE_DIR = "/workspace";
// skills 独立挂载，与 workspace 隔离（只读）
export const SANDBOX_SKILLS_DIR = "/skills";

// ── Disk paths (host filesystem) ────────────────────────────────────────

function sandboxBasePath({ userId }: { userId: number }): string {
  return path.join(process.cwd(), ".next", "cache", "sandbox", "user", String(userId));
}

export function getWorkspaceDiskPath({ userId }: { userId: number }): string {
  return path.join(sandboxBasePath({ userId }), "workspace");
}

export function getSkillsDiskPath({ userId }: { userId: number }): string {
  return path.join(sandboxBasePath({ userId }), "skills");
}

export function getSkillLocalPath({
  userId,
  skillName,
}: {
  userId: number;
  skillName: string;
}): string {
  return path.join(sandboxBasePath({ userId }), "skills", skillName);
}
