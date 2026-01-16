import "server-only";

import { tool } from "ai";
import JSZip from "jszip";
import { v4 as uuidv4 } from "uuid";
import type { Sandbox } from "bash-tool";
import fs from "fs/promises";
import path from "path";
import { getExportsPath } from "@/lib/skill/utils";
import { exportFolderInputSchema } from "./exportFolder/types";

/**
 * Export a folder from the sandbox as a zip file for download
 */
export const exportFolderTool = ({ sandbox, userId }: { sandbox: Sandbox; userId: number }) =>
  tool({
    description:
      "Export a folder from the sandbox filesystem as a zip file. The user can then download the zip file containing all files in the specified folder. Use this when the user wants to save or download their work.",
    inputSchema: exportFolderInputSchema,
    execute: async ({ folderPath }) => {
      try {
        // Normalize folder path
        const normalizedPath = folderPath.startsWith("/") ? folderPath : `/${folderPath}`;

        // List all files in the folder using find command
        const findResult = await sandbox.executeCommand(
          `find ${normalizedPath} -type f 2>/dev/null || echo ""`,
        );

        if (findResult.exitCode !== 0 || !findResult.stdout.trim()) {
          const message = `Folder "${folderPath}" not found or is empty`;
          return {
            success: false,
            message,
            fileCount: 0,
            plainText: message,
          };
        }

        const filePaths = findResult.stdout
          .split("\n")
          .filter((line) => line.trim() !== "")
          .map((line) => line.trim());

        if (filePaths.length === 0) {
          const message = `No files found in folder "${folderPath}"`;
          return {
            success: false,
            message,
            fileCount: 0,
            plainText: message,
          };
        }

        // Create zip file
        const zip = new JSZip();

        // Read each file and add to zip
        for (const filePath of filePaths) {
          try {
            const content = await sandbox.readFile(filePath);
            // Remove leading slash and folder prefix for clean zip structure
            const relativePath = filePath.startsWith(normalizedPath)
              ? filePath.slice(normalizedPath.length + 1)
              : filePath.slice(1);
            zip.file(relativePath, content);
          } catch (error) {
            console.warn(`Failed to read file ${filePath}:`, error);
          }
        }

        // Generate zip buffer
        const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

        // Save to user-specific exports directory
        const downloadToken = uuidv4().replace(/-/g, "");
        const exportsDir = getExportsPath(userId);
        await fs.mkdir(exportsDir, { recursive: true });

        const zipPath = path.join(exportsDir, `${downloadToken}.zip`);
        await fs.writeFile(zipPath, zipBuffer);

        const message = `Successfully exported ${filePaths.length} files from "${folderPath}". Download token: ${downloadToken}`;
        return {
          success: true,
          downloadToken,
          message,
          fileCount: filePaths.length,
          plainText: message,
        };
      } catch (error) {
        console.error("Export folder error:", error);
        const message = `Failed to export folder: ${error instanceof Error ? error.message : String(error)}`;
        return {
          success: false,
          message,
          fileCount: 0,
          plainText: message,
        };
      }
    },
  });
