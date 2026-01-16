import authOptions from "@/app/(auth)/authOptions";
import { getExportsPath } from "@/lib/skill/utils";
import fs from "fs/promises";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import path from "path";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> | { token: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { token } = await Promise.resolve(params);

  // Validate token format (UUID without dashes)
  if (!/^[a-zA-Z0-9]+$/.test(token)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  try {
    // Use user-specific exports directory
    const exportsDir = getExportsPath(userId);
    const zipPath = path.join(exportsDir, `${token}.zip`);

    // Check if file exists
    try {
      await fs.access(zipPath);
    } catch {
      return NextResponse.json({ error: "File not found or expired" }, { status: 404 });
    }

    // Read file
    const fileBuffer = await fs.readFile(zipPath);

    // Delete file after reading (one-time download)
    await fs.unlink(zipPath).catch(() => {
      // Ignore deletion errors
    });

    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="export-${token}.zip"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
  }
}
