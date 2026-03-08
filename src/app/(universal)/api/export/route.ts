import authOptions from "@/app/(auth)/authOptions";
import { getSkillsDiskPath, getWorkspaceDiskPath } from "@/sandbox/paths";
import fs from "fs/promises";
import JSZip from "jszip";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import path from "path";

/**
 * Export API - download file or folder
 * GET /api/export?filePath=workspace/hello.txt (download single file)
 * GET /api/export?folderPath=workspace/my-project (download folder as zip)
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { searchParams } = new URL(req.url);
  const folderPath = searchParams.get("folderPath");
  const filePath = searchParams.get("filePath");

  if (!folderPath && !filePath) {
    return NextResponse.json(
      { error: "Missing folderPath or filePath parameter" },
      { status: 400 },
    );
  }

  const targetParam = folderPath || filePath;
  if (!targetParam) {
    return NextResponse.json({ error: "Invalid parameter" }, { status: 400 });
  }

  // Validate path (must be workspace/ or skills/)
  if (!targetParam.startsWith("workspace/") && !targetParam.startsWith("skills/")) {
    return NextResponse.json(
      { error: "Invalid path. Can only export from workspace/ or skills/" },
      { status: 400 },
    );
  }

  // Handle single file download
  if (filePath) {
    return handleFileDownload(userId, filePath);
  }

  // Handle folder download (zip)
  return handleFolderDownload(userId, folderPath!);
}

/**
 * Download a single file
 */
async function handleFileDownload(userId: number, filePath: string) {
  try {
    // Get actual disk path
    const basePath = filePath.startsWith("workspace/")
      ? getWorkspaceDiskPath({ userId })
      : getSkillsDiskPath({ userId });

    const relativePath = filePath.replace(/^(workspace|skills)\//, "");
    const targetPath = path.join(basePath, relativePath);

    // Check if file exists
    let stat;
    try {
      stat = await fs.stat(targetPath);
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (!stat.isFile()) {
      return NextResponse.json({ error: "Path is not a file" }, { status: 400 });
    }

    // Read file content
    const content = await fs.readFile(targetPath);

    // Get file name and mime type
    const fileName = path.basename(relativePath);
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".txt": "text/plain",
      ".md": "text/markdown",
      ".json": "application/json",
      ".js": "application/javascript",
      ".ts": "text/typescript",
      ".html": "text/html",
      ".css": "text/css",
      ".xml": "application/xml",
      ".pdf": "application/pdf",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
    };
    const mimeType = mimeTypes[ext] || "application/octet-stream";

    // Return file
    return new NextResponse(content, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Content-Length": content.length.toString(),
      },
    });
  } catch (error) {
    console.error("File download error:", error);
    return NextResponse.json(
      {
        error: "Failed to download file",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

/**
 * Download a folder as zip
 */
async function handleFolderDownload(userId: number, folderPath: string) {
  try {
    // Get actual disk path
    const basePath = folderPath.startsWith("workspace/")
      ? getWorkspaceDiskPath({ userId })
      : getSkillsDiskPath({ userId });

    const relativePath = folderPath.replace(/^(workspace|skills)\//, "");
    const targetPath = path.join(basePath, relativePath);

    // Check if folder exists
    let stat;
    try {
      stat = await fs.stat(targetPath);
    } catch {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    if (!stat.isDirectory()) {
      return NextResponse.json({ error: "Path is not a directory" }, { status: 400 });
    }

    // Collect all files recursively
    const zip = new JSZip();
    let fileCount = 0;

    async function addFilesToZip(dir: string, zipFolder: JSZip) {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          const subFolder = zipFolder.folder(entry.name);
          if (subFolder) {
            await addFilesToZip(entryPath, subFolder);
          }
        } else if (entry.isFile()) {
          const content = await fs.readFile(entryPath);
          zipFolder.file(entry.name, content);
          fileCount++;
        }
      }
    }

    await addFilesToZip(targetPath, zip);

    if (fileCount === 0) {
      return NextResponse.json({ error: "Folder contains no files" }, { status: 400 });
    }

    // Generate zip buffer
    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    // Get folder name from folderPath directly
    // workspace/ → workspace.zip
    // workspace/xd-projects → xd-projects.zip
    const folderName = folderPath.split("/").filter(Boolean).pop() || "export";
    const filename = `${folderName}.zip`;

    // Return zip file (convert Buffer to Uint8Array for NextResponse)
    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      {
        error: "Failed to export folder",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
