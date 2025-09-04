"use server";

import { s3SignedUrl, uploadToS3 } from "@/lib/attachments/s3";
import { getRequestOrigin } from "@/lib/request/headers";
import { ServerActionResult } from "@/lib/serverAction";
import { InterviewSessionExtra } from "@/prisma/client";
import { InputJsonObject } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import { getLocale } from "next-intl/server";
import { createHash } from "node:crypto";

export async function generateInterviewTranscriptPDFAction(
  userChatToken: string,
): Promise<ServerActionResult<{ fileName: string; pdfUrl: string }>> {
  try {
    // Get session info
    const userChat = await prisma.userChat.findUnique({
      where: {
        token: userChatToken,
        kind: "interviewSession",
      },
      select: {
        id: true,
        interviewSession: {
          select: {
            id: true,
            title: true,
            extra: true,
          },
        },
      },
    });

    if (!userChat?.interviewSession) {
      return {
        success: false,
        code: "not_found",
        message: "Interview session not found",
      };
    }

    const session = userChat.interviewSession;
    const sessionExtra = session.extra as InterviewSessionExtra;

    // Generate filename
    const baseFileName = session.title || "Interview Transcript";
    const cleanFileName = baseFileName
      .replace(/\s+/g, " ")
      .replace(/[<>:"/\\|?*]/g, "")
      .slice(0, 30);
    const fileName = `${cleanFileName} [${userChatToken.slice(0, 8)}].pdf`;

    // Check if PDF already exists
    if (sessionExtra?.pdfObjectUrl) {
      const pdfUrl = await s3SignedUrl(sessionExtra.pdfObjectUrl);
      return {
        success: true,
        data: { fileName, pdfUrl },
      };
    }

    // Generate PDF
    const apiBase = process.env.BROWSER_API_BASE_URL;
    if (!apiBase) {
      return {
        success: false,
        code: "internal_server_error",
        message: "PDF generation service not configured",
      };
    }

    const locale = await getLocale();
    const origin = await getRequestOrigin();
    const transcriptUrl = `${origin}/artifacts/interview-transcript/${userChatToken}/raw?locale=${locale}`;

    const response = await fetch(`${apiBase}/html-to-pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: transcriptUrl,
        filename: userChatToken,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        code: "internal_server_error",
        message: `Failed to generate PDF: ${response.statusText}`,
      };
    }

    const pdfBuffer = Buffer.from(await response.arrayBuffer());

    // Upload to S3
    const hash = createHash("sha256")
      .update(`transcript-${userChatToken}`)
      .digest("hex")
      .substring(0, 40);

    const { getObjectUrl, objectUrl } = await uploadToS3({
      keySuffix: `interview-transcript-pdf/${hash}.pdf`,
      fileBody: new Uint8Array(pdfBuffer),
      mimeType: "application/pdf",
    });

    // Save PDF URL to session extra
    await prisma.interviewSession.update({
      where: { id: session.id },
      data: {
        extra: {
          ...(sessionExtra as InputJsonObject),
          pdfObjectUrl: objectUrl,
        },
      },
    });

    return {
      success: true,
      data: {
        fileName,
        pdfUrl: getObjectUrl,
      },
    };
  } catch (error) {
    console.error("Failed to generate interview transcript PDF:", error);
    return {
      success: false,
      code: "internal_server_error",
      message: "Failed to generate PDF",
    };
  }
}
