import { rootLogger } from "@/lib/logging";
import { getWorkspacePath } from "@/lib/skill/utils";
import fs from "fs/promises";
import path from "path";
import { tool } from "ai";
import { z } from "zod";

const DEFAULT_WORKSPACE_READ_PREVIEW_CHARS = 500;
const MAX_WORKSPACE_READ_PREVIEW_CHARS = 4000;

export type WorkspaceFileEntry = {
  path: string;
  name: string;
  type: "file" | "directory";
  size?: number;
};

function toPosixPath(value: string): string {
  return value.replaceAll("\\", "/");
}

export function normalizeWorkspaceRelativePath(inputPath: string, allowEmpty = false): string {
  const trimmed = inputPath.trim();
  if (!trimmed) {
    if (allowEmpty) return "";
    throw new Error("Path cannot be empty");
  }

  let candidate = toPosixPath(trimmed);
  if (candidate.startsWith("workspace/")) {
    candidate = candidate.slice("workspace/".length);
  }

  if (!candidate && allowEmpty) return "";
  if (!candidate) throw new Error("Path cannot be empty");
  if (candidate.startsWith("/")) throw new Error("Absolute paths are not allowed");

  const normalized = path.posix.normalize(candidate).replace(/^\.\//, "");
  if (!normalized || normalized === ".") {
    if (allowEmpty) return "";
    throw new Error("Path cannot be empty");
  }

  const segments = normalized.split("/");
  if (segments.includes("..")) {
    throw new Error("Path traversal is not allowed");
  }

  return normalized;
}

function resolveWorkspacePath(userId: number, relativePath: string): string {
  const workspaceRoot = getWorkspacePath(userId);
  const normalized = normalizeWorkspaceRelativePath(relativePath, true);
  const fullPath = path.join(workspaceRoot, normalized);
  const relative = path.relative(workspaceRoot, fullPath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Path traversal is not allowed");
  }

  return fullPath;
}

const SCAN_MAX_DEPTH = 8;
const SCAN_MAX_FILES = 500;

async function scanWorkspaceDirectory(
  dir: string,
  relativePath = "",
  depth = 0,
): Promise<WorkspaceFileEntry[]> {
  if (depth > SCAN_MAX_DEPTH) return [];

  const files: WorkspaceFileEntry[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (files.length >= SCAN_MAX_FILES) break;

    const fullPath = path.join(dir, entry.name);
    const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      files.push({
        path: relPath,
        name: entry.name,
        type: "directory",
      });
      if (files.length < SCAN_MAX_FILES) {
        const nested = await scanWorkspaceDirectory(fullPath, relPath, depth + 1);
        files.push(...nested.slice(0, SCAN_MAX_FILES - files.length));
      }
    } else if (entry.isFile()) {
      const stats = await fs.stat(fullPath);
      files.push({
        path: relPath,
        name: entry.name,
        type: "file",
        size: stats.size,
      });
    }
  }

  return files;
}

export function listWorkspaceFilesTool({ userId }: { userId: number }) {
  return tool({
    description:
      "List files in persistent workspace storage (real disk). Use this for cross-agent handoff files.",
    inputSchema: z.object({
      path: z
        .string()
        .optional()
        .describe("Optional workspace relative folder path. Defaults to workspace root."),
    }),
    execute: async ({ path: relativePath = "" }) => {
      const normalized = normalizeWorkspaceRelativePath(relativePath, true);
      const target = resolveWorkspacePath(userId, normalized);

      await fs.mkdir(getWorkspacePath(userId), { recursive: true });

      const stats = await fs
        .stat(target)
        .catch((error: NodeJS.ErrnoException) => (error.code === "ENOENT" ? null : Promise.reject(error)));

      if (!stats) {
        return {
          success: true,
          path: normalized,
          files: [] as WorkspaceFileEntry[],
          plainText: `Workspace path ${normalized || "."} has 0 entries.`,
        };
      }

      if (stats.isFile()) {
        const files = [
          {
            path: normalized,
            name: path.basename(normalized),
            type: "file" as const,
            size: stats.size,
          },
        ];
        return {
          success: true,
          path: normalized,
          files,
          plainText: `Workspace path ${normalized} is a file (${stats.size} bytes).`,
        };
      }

      const files = await scanWorkspaceDirectory(target);
      const truncated = files.length >= SCAN_MAX_FILES;
      return {
        success: true,
        path: normalized,
        files,
        plainText: truncated
          ? `Workspace path ${normalized || "."} has ${files.length}+ entries (listing truncated at ${SCAN_MAX_FILES}).`
          : `Workspace path ${normalized || "."} has ${files.length} entries.`,
      };
    },
  });
}

export function readWorkspaceFileTool({ userId }: { userId: number }) {
  return tool({
    description:
      "Read one file from persistent workspace storage (real disk). By default returns preview content (head/tail) to reduce token usage; set full=true only when truly needed.",
    inputSchema: z.object({
      path: z.string().describe("Workspace relative file path, e.g. study-subagents/x/reports/y/meta.json"),
      full: z
        .boolean()
        .optional()
        .default(false)
        .describe("Set true only when full file content is strictly required. Default false."),
      headChars: z
        .number()
        .int()
        .min(1)
        .max(MAX_WORKSPACE_READ_PREVIEW_CHARS)
        .optional()
        .default(DEFAULT_WORKSPACE_READ_PREVIEW_CHARS)
        .describe(`Preview head length when full=false. Default ${DEFAULT_WORKSPACE_READ_PREVIEW_CHARS}.`),
      tailChars: z
        .number()
        .int()
        .min(1)
        .max(MAX_WORKSPACE_READ_PREVIEW_CHARS)
        .optional()
        .default(DEFAULT_WORKSPACE_READ_PREVIEW_CHARS)
        .describe(`Preview tail length when full=false. Default ${DEFAULT_WORKSPACE_READ_PREVIEW_CHARS}.`),
    }),
    execute: async ({ path: relativePath, full = false, headChars, tailChars }) => {
      const normalized = normalizeWorkspaceRelativePath(relativePath);
      const target = resolveWorkspacePath(userId, normalized);
      const content = await fs.readFile(target, "utf-8");
      const previewHeadChars = headChars ?? DEFAULT_WORKSPACE_READ_PREVIEW_CHARS;
      const previewTailChars = tailChars ?? DEFAULT_WORKSPACE_READ_PREVIEW_CHARS;
      const totalChars = content.length;
      const totalBytes = Buffer.byteLength(content, "utf-8");

      if (full) {
        return {
          success: true,
          path: normalized,
          content,
          readMode: "full" as const,
          truncated: false,
          head: content,
          tail: content,
          totalChars,
          totalBytes,
          returnedChars: totalChars,
          plainText: `Read full workspace file ${normalized} (${totalBytes} bytes).`,
        };
      }

      const head = content.slice(0, previewHeadChars);
      const tail = content.slice(-previewTailChars);
      const truncated = totalChars > previewHeadChars + previewTailChars;

      const previewContent = truncated
        ? `${head}\n\n...[truncated preview: showing first ${previewHeadChars} and last ${previewTailChars} chars]...\n\n${tail}`
        : content;

      return {
        success: true,
        path: normalized,
        content: previewContent,
        readMode: "preview" as const,
        truncated,
        head,
        tail,
        totalChars,
        totalBytes,
        returnedChars: previewContent.length,
        plainText: truncated
          ? `Read workspace file ${normalized} in preview mode (${totalBytes} bytes total, full content omitted).`
          : `Read workspace file ${normalized} in preview mode (${totalBytes} bytes, file fits preview).`,
      };
    },
  });
}

export function writeWorkspaceFileTool({ userId }: { userId: number }) {
  return tool({
    description:
      "Write one file into persistent workspace storage (real disk). Use this for cross-agent communication artifacts.",
    inputSchema: z.object({
      path: z.string().describe("Workspace relative file path"),
      content: z.string().describe("UTF-8 file content"),
    }),
    execute: async ({ path: relativePath, content }) => {
      const normalized = normalizeWorkspaceRelativePath(relativePath);
      const target = resolveWorkspacePath(userId, normalized);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, content, "utf-8");

      rootLogger.info({ msg: "[WorkspaceTools] Wrote workspace file", userId, path: normalized });

      return {
        success: true,
        path: normalized,
        bytes: Buffer.byteLength(content, "utf-8"),
        plainText: `Wrote workspace file ${normalized}.`,
      };
    },
  });
}

export function ensureWorkspaceDirTool({ userId }: { userId: number }) {
  return tool({
    description: "Ensure a folder exists in persistent workspace storage (real disk).",
    inputSchema: z.object({
      path: z.string().describe("Workspace relative directory path"),
    }),
    execute: async ({ path: relativePath }) => {
      const normalized = normalizeWorkspaceRelativePath(relativePath);
      const target = resolveWorkspacePath(userId, normalized);
      await fs.mkdir(target, { recursive: true });
      return {
        success: true,
        path: normalized,
        plainText: `Ensured workspace directory ${normalized}.`,
      };
    },
  });
}
