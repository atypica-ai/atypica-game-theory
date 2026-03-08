import path from "path";

// ── Sandbox virtual paths (inside just-bash) ────────────────────────────
export const SANDBOX_CWD = "/home/agent";
export const SANDBOX_WORKSPACE_DIR = "/home/agent/workspace";
export const SANDBOX_SKILLS_DIR = "/home/agent/skills";

// ── Disk paths (host filesystem) ────────────────────────────────────────

function sandboxBasePath(userId: number): string {
  return path.join(process.cwd(), ".next", "cache", "sandbox", "user", String(userId));
}

export function getWorkspaceDiskPath(userId: number): string {
  return path.join(sandboxBasePath(userId), "workspace");
}

export function getSkillsDiskPath(userId: number): string {
  return path.join(sandboxBasePath(userId), "skills");
}

export function getSkillLocalPath(userId: number, skillName: string): string {
  return path.join(sandboxBasePath(userId), "skills", skillName);
}

export function getReportCacheDir(userId: number, reportToken: string): string {
  return path.join(sandboxBasePath(userId), "reports", reportToken);
}

export function getReportCacheFilePath(userId: number, reportToken: string): string {
  return path.join(getReportCacheDir(userId, reportToken), "onePageHtml.html");
}
