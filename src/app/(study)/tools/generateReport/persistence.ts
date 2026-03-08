import { getWorkspaceDiskPath } from "@/sandbox/paths";
import { promises as fs } from "fs";
import path from "path";

const REPORTS_DIR = "reports";
const HTML_FILENAME = "onePageHtml.html";

function getDiskPath({ userId, reportToken }: { userId: number; reportToken: string }): string {
  return path.join(getWorkspaceDiskPath({ userId }), REPORTS_DIR, reportToken, HTML_FILENAME);
}

/** 报告产物的相对路径（相对于 /workspace cwd），agent 用 bash 读取 */
export function getReportArtifactPath({ reportToken }: { reportToken: string }): string {
  return `${REPORTS_DIR}/${reportToken}/${HTML_FILENAME}`;
}

/** 确保报告目录存在（生成前调用） */
export async function initReportDir({
  userId,
  reportToken,
}: {
  userId: number;
  reportToken: string;
}): Promise<void> {
  const dir = path.join(getWorkspaceDiskPath({ userId }), REPORTS_DIR, reportToken);
  await fs.mkdir(dir, { recursive: true });
}

/** 写入报告 HTML 到磁盘 */
export async function writeReportHtml({
  userId,
  reportToken,
  html,
}: {
  userId: number;
  reportToken: string;
  html: string;
}): Promise<void> {
  await fs.writeFile(getDiskPath({ userId, reportToken }), html, "utf-8");
}

/** 读取报告 HTML（生成中从磁盘缓存读取），不存在返回 null */
export async function readReportHtml({
  userId,
  reportToken,
}: {
  userId: number;
  reportToken: string;
}): Promise<string | null> {
  try {
    return await fs.readFile(getDiskPath({ userId, reportToken }), "utf-8");
  } catch {
    return null;
  }
}
