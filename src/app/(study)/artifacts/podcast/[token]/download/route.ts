import authOptions from "@/app/(auth)/authOptions";
import { podcastObjectUrlToHttpUrl } from "@/app/(podcast)/lib/utils";
import { rootLogger } from "@/lib/logging";
import { AdminRole } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * Admin-only API endpoint for downloading podcast MP3 files
 * GET /artifacts/podcast/[token]/download
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const logger = rootLogger.child({
    method: "GET /artifacts/podcast/[token]/download",
  });

  try {
    const { token } = await params;

    // Validate admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.warn("Unauthorized download attempt: no session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const adminUser = await prisma.adminUser.findUnique({
      where: { userId: session.user.id },
    });

    if (!adminUser) {
      logger.warn({
        msg: "Unauthorized download attempt: user is not an admin",
        userId: session.user.id,
        email: session.user.email,
      });
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // Only allow SUPER_ADMIN or REGULAR_ADMIN roles
    if (adminUser.role !== AdminRole.SUPER_ADMIN && adminUser.role !== AdminRole.REGULAR_ADMIN) {
      logger.warn({
        msg: "Unauthorized download attempt: invalid admin role",
        userId: session.user.id,
        role: adminUser.role,
      });
      return NextResponse.json({ error: "Forbidden: Invalid admin role" }, { status: 403 });
    }

    // Fetch podcast from database
    const podcast = await prisma.analystPodcast.findUnique({
      where: { token },
      select: {
        id: true,
        token: true,
        objectUrl: true,
        extra: true,
        generatedAt: true,
        analyst: {
          select: {
            id: true,
            topic: true,
          },
        },
      },
    });

    if (!podcast) {
      logger.warn({
        msg: "Podcast not found",
        token,
        adminId: adminUser.userId,
      });
      return NextResponse.json({ error: "Podcast not found" }, { status: 404 });
    }

    if (!podcast.generatedAt || !podcast.objectUrl) {
      logger.warn({
        msg: "Podcast audio not yet generated",
        token,
        generatedAt: podcast.generatedAt,
        hasObjectUrl: !!podcast.objectUrl,
      });
      return NextResponse.json(
        { error: "Podcast audio has not been generated yet" },
        { status: 404 },
      );
    }

    // Get signed URL from S3
    const signedUrl = await podcastObjectUrlToHttpUrl(podcast);
    if (!signedUrl) {
      logger.error({
        msg: "Failed to generate signed URL",
        token,
        objectUrl: "[REDACTED]",
      });
      return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 });
    }

    // Fetch the audio file from S3 signed URL
    logger.info({
      msg: "Downloading podcast audio from S3",
      token,
      analystId: podcast.analyst.id,
    });

    const audioResponse = await fetch(signedUrl);
    if (!audioResponse.ok) {
      logger.error({
        msg: "Failed to fetch audio from S3",
        token,
        status: audioResponse.status,
        statusText: audioResponse.statusText,
      });
      return NextResponse.json(
        { error: `Failed to download audio: ${audioResponse.statusText}` },
        { status: 500 },
      );
    }

    // Check content type and length
    const contentType = audioResponse.headers.get("content-type") || "audio/mpeg";
    const contentLength = audioResponse.headers.get("content-length");

    if (contentLength) {
      const sizeInMB = parseInt(contentLength) / (1024 * 1024);
      if (sizeInMB > 50) {
        logger.error({
          msg: "Audio file too large",
          token,
          sizeInMB,
        });
        return NextResponse.json(
          { error: "Audio file too large to download" },
          { status: 400 },
        );
      }
    }

    // Get the audio buffer
    const audioBuffer = await audioResponse.arrayBuffer();

    logger.info({
      msg: "Podcast audio downloaded successfully",
      token,
      sizeBytes: audioBuffer.byteLength,
      analystTopic: podcast.analyst.id,
    });

    // Generate filename
    const filename = `podcast-${podcast.token}.mp3`;

    // Return audio file with proper headers
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": audioBuffer.byteLength.toString(),
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    logger.error({
      msg: "Error in podcast download API",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
