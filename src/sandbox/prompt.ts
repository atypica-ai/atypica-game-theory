import { Locale } from "next-intl";
import path from "path";
import { SANDBOX_CWD, SANDBOX_SKILLS_DIR } from "./paths";

/**
 * Sandbox 文件系统相关的系统提示词。
 * Lead agent 和 sub-agent 共用，保持一致。
 *
 * @param sessionDir  相对于 /workspace 的 session 目录，如 "sessions/{token}"
 * @param hasSkills   是否有 /skills/ 目录（sub-agent 通常没有）
 */
export const sandboxSystemPrompt = ({
  locale,
  sessionDir,
  hasSkills,
}: {
  locale: Locale;
  sessionDir?: string;
  hasSkills?: boolean;
}) => {
  const cwd = sessionDir ? path.posix.join(SANDBOX_CWD, sessionDir) : SANDBOX_CWD;

  return locale === "zh-CN"
    ? `## 文件系统

你有 bash、readFile、writeFile 工具，可以在沙箱环境中操作文件。

**目录结构：**
\`\`\`
${SANDBOX_CWD}/          # 工作区根目录（可读写，持久化）
${sessionDir ? `  ${sessionDir}/   # 你的当前工作目录\n` : ""}\
${hasSkills ? `${SANDBOX_SKILLS_DIR}/          # 专家技能库（只读，独立挂载）\n` : ""}\
\`\`\`

**当前工作目录（CWD）：** \`${cwd}\`
所有相对路径都相对于此目录。你可以用绝对路径 \`${SANDBOX_CWD}/...\` 访问工作区内的其他文件。

**操作示例：**
- 查看当前目录文件：\`ls -la\`
- 读取文件：\`readFile({ path: "file.txt" })\` 或 \`cat file.txt\`
- 写入文件：\`writeFile({ path: "output.md", content: "..." })\`
- 查看工作区全部内容：\`ls -la ${SANDBOX_CWD}/\`
${hasSkills ? `- 查看所有 skills：\`ls -la ${SANDBOX_SKILLS_DIR}/\`\n- 加载 skill：\`readFile({ path: "${SANDBOX_SKILLS_DIR}/skill-name/SKILL.md" })\`` : ""}

**持久化：**
- \`${SANDBOX_CWD}/\` 下的文件会自动保存，下次对话时会自动加载
${hasSkills ? `- \`${SANDBOX_SKILLS_DIR}/\` 下的文件是只读的，不要尝试修改` : ""}

**可用命令：** ls, cat, head, tail, grep, find, wc, sort, uniq 等
- ⚠️ 不支持脚本执行（python, node, php 等）
- ⚠️ 不支持压缩命令（tar -z, gzip, bzip2 等）`
    : `## Filesystem

You have bash, readFile, and writeFile tools to operate files in a sandboxed environment.

**Directory structure:**
\`\`\`
${SANDBOX_CWD}/          # Workspace root (read-write, persistent)
${sessionDir ? `  ${sessionDir}/   # Your current working directory\n` : ""}\
${hasSkills ? `${SANDBOX_SKILLS_DIR}/          # Expert skill library (read-only, separate mount)\n` : ""}\
\`\`\`

**Current working directory (CWD):** \`${cwd}\`
All relative paths are relative to this directory. Use absolute paths like \`${SANDBOX_CWD}/...\` to access other files in the workspace.

**Usage examples:**
- View current directory: \`ls -la\`
- Read file: \`readFile({ path: "file.txt" })\` or \`cat file.txt\`
- Write file: \`writeFile({ path: "output.md", content: "..." })\`
- View full workspace: \`ls -la ${SANDBOX_CWD}/\`
${hasSkills ? `- View all skills: \`ls -la ${SANDBOX_SKILLS_DIR}/\`\n- Load a skill: \`readFile({ path: "${SANDBOX_SKILLS_DIR}/skill-name/SKILL.md" })\`` : ""}

**Persistence:**
- Files under \`${SANDBOX_CWD}/\` are automatically saved and restored in future conversations
${hasSkills ? `- Files under \`${SANDBOX_SKILLS_DIR}/\` are read-only — do not attempt to modify them` : ""}

**Available commands:** ls, cat, head, tail, grep, find, wc, sort, uniq, etc.
- ⚠️ Script execution not supported (python, node, php, etc.)
- ⚠️ Compression commands not supported (tar -z, gzip, bzip2, etc.)`;
};
