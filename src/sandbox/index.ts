import "server-only";

import { rootLogger } from "@/lib/logging";
import type { BashToolkit, CreateBashToolOptions } from "bash-tool";
import { createBashTool } from "bash-tool";
import fs from "fs/promises";
import { Bash, MountableFs, OverlayFs, ReadWriteFs } from "just-bash";
import path from "path";
import {
  getSkillsDiskPath,
  getWorkspaceDiskPath,
  SANDBOX_CWD,
  SANDBOX_SKILLS_DIR,
  SANDBOX_WORKSPACE_DIR,
} from "./paths";
import { ensureAllSkillsCached } from "./skill";

export {
  getSkillLocalPath,
  getSkillsDiskPath,
  getWorkspaceDiskPath,
  SANDBOX_CWD,
  SANDBOX_SESSIONS_DIR,
  SANDBOX_SKILLS_DIR,
  SANDBOX_WORKSPACE_DIR,
} from "./paths";
export { sandboxSystemPrompt } from "./prompt";
export { cleanupSandboxCache, ensureAllSkillsCached, ensureSkillAvailable } from "./skill";

export async function createAgentSandbox({
  userId,
  skills,
  builtinSkills = [],
  sessionDir,
  onBeforeBashCall,
}: {
  userId: number;
  skills: Array<{ id: number; name: string }>;
  builtinSkills?: Array<{ name: string; sourcePath: string }>;
  /** 相对于 /workspace 的 session 目录，如 "sessions/{token}"。设置后 agent 的 cwd 和 destination 都会指向此目录。 */
  sessionDir?: string;
  onBeforeBashCall?: CreateBashToolOptions["onBeforeBashCall"];
}): Promise<BashToolkit> {
  // 1. 确保 skills 已缓存到本地磁盘
  await ensureAllSkillsCached(skills);

  // 2. 确保 workspace 和 skills 目录存在
  const workspaceDisk = getWorkspaceDiskPath({ userId });
  const skillsDisk = getSkillsDiskPath({ userId });
  const mkdirPromises = [
    fs.mkdir(workspaceDisk, { recursive: true }),
    fs.mkdir(skillsDisk, { recursive: true }),
  ];
  // 如果指定了 sessionDir，确保 session 子目录也存在
  if (sessionDir) {
    mkdirPromises.push(
      fs.mkdir(path.join(workspaceDisk, sessionDir), { recursive: true }),
    );
  }
  await Promise.all(mkdirPromises);

  await Promise.all(
    builtinSkills.map(async (skill) => {
      const targetPath = path.join(skillsDisk, skill.name);
      await fs.rm(targetPath, { recursive: true, force: true });
      await fs.cp(skill.sourcePath, targetPath, { recursive: true });
    }),
  );

  // 3. 构建虚拟文件系统
  //
  //    /workspace  → ReadWriteFs  双向直通磁盘（也是 cwd）
  //    /skills     → OverlayFs    只读，从磁盘缓存读取
  //
  const mountableFs = new MountableFs();
  mountableFs.mount(
    SANDBOX_WORKSPACE_DIR, // "/workspace"
    new ReadWriteFs({ root: workspaceDisk }),
  );
  mountableFs.mount(
    SANDBOX_SKILLS_DIR, // "/skills"
    new OverlayFs({
      root: skillsDisk,
      readOnly: true,
      // 显式设置 mountPoint="/"：MountableFs 已处理挂载点映射，
      // OverlayFs 默认值 "/home/user/project" 会在虚拟路径里多嵌套一层
      mountPoint: "/",
    }),
  );

  // 4. 创建 Bash 实例
  //    cwd 默认 /workspace，有 sessionDir 时指向 /workspace/sessions/{token}
  const cwd = sessionDir ? path.posix.join(SANDBOX_CWD, sessionDir) : SANDBOX_CWD;
  const bash = new Bash({
    fs: mountableFs,
    cwd,
  });

  rootLogger.info({
    msg: "[Sandbox] Created agent sandbox",
    userId,
    cwd,
    sessionDir,
    workspaceDisk,
    skillsDisk,
    skillCount: skills.length,
  });

  // 5. 传给 bash-tool
  return createBashTool({
    sandbox: bash,
    onBeforeBashCall,
    // 显式设置 destination：bash-tool 每次命令前会 cd 到此路径。
    // 默认值也是 "/workspace"，但显式设置避免隐式依赖库的默认值。
    destination: cwd,
  });
}
