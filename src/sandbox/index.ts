import "server-only";

import { rootLogger } from "@/lib/logging";
import type { BashToolkit, CreateBashToolOptions } from "bash-tool";
import { createBashTool } from "bash-tool";
import fs from "fs/promises";
import { Bash, MountableFs, OverlayFs, ReadWriteFs } from "just-bash";
import {
  getSkillsDiskPath,
  getWorkspaceDiskPath,
  SANDBOX_CWD,
  SANDBOX_SKILLS_DIR,
  SANDBOX_WORKSPACE_DIR,
} from "./paths";
import { ensureAllSkillsCached } from "./skill";

export {
  getReportCacheDir,
  getReportCacheFilePath,
  getSkillLocalPath,
  getSkillsDiskPath,
  getWorkspaceDiskPath,
  SANDBOX_CWD,
  SANDBOX_SKILLS_DIR,
  SANDBOX_WORKSPACE_DIR,
} from "./paths";
export { cleanupSandboxCache, ensureAllSkillsCached, ensureSkillAvailable } from "./skill";

export async function createAgentSandbox({
  userId,
  skills,
  onBeforeBashCall,
}: {
  userId: number;
  skills: Array<{ id: number; name: string }>;
  onBeforeBashCall?: CreateBashToolOptions["onBeforeBashCall"];
}): Promise<BashToolkit> {
  // 1. 确保 skills 已缓存到本地磁盘
  await ensureAllSkillsCached(skills);

  // 2. 确保 workspace 和 skills 目录存在
  const workspaceDisk = getWorkspaceDiskPath(userId);
  const skillsDisk = getSkillsDiskPath(userId);
  await Promise.all([
    fs.mkdir(workspaceDisk, { recursive: true }),
    fs.mkdir(skillsDisk, { recursive: true }),
  ]);

  // 3. MountableFs: workspace 双向直通磁盘, skills 只读
  const mountableFs = new MountableFs();
  mountableFs.mount(SANDBOX_WORKSPACE_DIR, new ReadWriteFs({ root: workspaceDisk }));
  mountableFs.mount(SANDBOX_SKILLS_DIR, new OverlayFs({ root: skillsDisk, readOnly: true }));

  // 4. 创建 Bash 实例
  const bash = new Bash({ fs: mountableFs, cwd: SANDBOX_CWD });

  rootLogger.info({
    msg: "[Sandbox] Created agent sandbox",
    userId,
    workspaceDisk,
    skillsDisk,
    skillCount: skills.length,
  });

  // 5. 传给 bash-tool
  return createBashTool({ sandbox: bash, onBeforeBashCall });
}
