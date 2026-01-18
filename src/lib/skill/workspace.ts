import { rootLogger } from "@/lib/logging";
import type { Sandbox } from "bash-tool";
import fs from "fs/promises";
import path from "path";
import { getWorkspacePath } from "./utils";

// Sandbox 内部的工作目录（与 createBashTool 的 destination 保持一致）
const SANDBOX_HOME = "/home/agent";

/**
 * 递归加载目录的所有文件到内存
 */
async function loadDirectoryToMemory(
  localPath: string,
  virtualPath: string,
  files: Record<string, string>,
): Promise<void> {
  try {
    const entries = await fs.readdir(localPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(localPath, entry.name);
      const virtualFilePath = virtualPath ? `${virtualPath}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        await loadDirectoryToMemory(fullPath, virtualFilePath, files);
      } else {
        try {
          const content = await fs.readFile(fullPath, "utf-8");
          files[virtualFilePath] = content;
        } catch (error) {
          rootLogger.warn({
            msg: "[Workspace] Failed to read file",
            filePath: fullPath,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  } catch (error) {
    // Directory doesn't exist yet - this is OK for first time users
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      rootLogger.error({
        msg: "[Workspace] Failed to read directory",
        localPath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/**
 * 确保用户工作区目录存在
 * @param userId - 用户 ID
 */
export async function ensureWorkspaceExists(userId: number): Promise<void> {
  const workspacePath = getWorkspacePath(userId);
  await fs.mkdir(workspacePath, { recursive: true });
}

/**
 * 加载用户工作区的所有文件到内存
 * @param userId - 用户 ID
 * @returns files 对象，键是虚拟路径（如 "my-project/index.js"），值是文件内容
 */
export async function loadUserWorkspace(userId: number): Promise<Record<string, string>> {
  const workspacePath = getWorkspacePath(userId);

  // Ensure workspace directory exists
  await ensureWorkspaceExists(userId);

  const files: Record<string, string> = {};
  await loadDirectoryToMemory(workspacePath, "", files);

  rootLogger.info({
    msg: "[Workspace] Loaded user workspace",
    userId,
    fileCount: Object.keys(files).length,
  });

  return files;
}

/**
 * 保存 sandbox 中的文件到用户工作区
 * @param userId - 用户 ID
 * @param sandbox - bash-tool 的 sandbox 实例
 */
export async function saveUserWorkspace(userId: number, sandbox: Sandbox): Promise<void> {
  const workspacePath = getWorkspacePath(userId);

  try {
    // 使用 find 命令获取 workspace/ 目录下的所有文件
    const findResult = await sandbox.executeCommand(
      `find workspace -type f 2>/dev/null || echo ""`,
    );

    if (findResult.exitCode !== 0 || !findResult.stdout.trim()) {
      rootLogger.debug({
        msg: "[Workspace] No files to save",
        userId,
      });
      return;
    }

    const filePaths = findResult.stdout
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => line.trim());

    // 清空现有 workspace（完全同步）
    await fs.rm(workspacePath, { recursive: true, force: true });
    await fs.mkdir(workspacePath, { recursive: true });

    // 保存所有文件
    let savedCount = 0;
    for (const filePath of filePaths) {
      try {
        // sandbox.readFile 需要绝对路径（从 SANDBOX_HOME 开始）
        const absolutePathInSandbox = `${SANDBOX_HOME}/${filePath}`;
        const content = await sandbox.readFile(absolutePathInSandbox);

        // Remove "workspace/" prefix for disk storage
        const relativePath = filePath.replace(/^workspace\//, "");
        const fullPath = path.join(workspacePath, relativePath);
        const dirPath = path.dirname(fullPath);

        // 创建父目录
        await fs.mkdir(dirPath, { recursive: true });

        // 写入文件
        await fs.writeFile(fullPath, content);
        savedCount++;
      } catch (error) {
        rootLogger.warn({
          msg: "[Workspace] Failed to save file",
          filePath,
          absolutePathInSandbox: `${SANDBOX_HOME}/${filePath}`,
          relativePath: filePath.replace(/^workspace\//, ""),
          fullPath: path.join(workspacePath, filePath.replace(/^workspace\//, "")),
          workspacePath,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    }

    rootLogger.info({
      msg: "[Workspace] Saved user workspace",
      userId,
      savedCount,
      totalFiles: filePaths.length,
    });
  } catch (error) {
    rootLogger.error({
      msg: "[Workspace] Failed to save workspace",
      userId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
