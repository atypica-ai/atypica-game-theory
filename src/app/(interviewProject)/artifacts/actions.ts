"use server";

import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { InterviewReportExtra, InterviewSessionExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { getLocale } from "next-intl/server";
import { forbidden } from "next/navigation";
import { generateInterviewReportPDF, generateInterviewTranscriptPDF } from "./pdf";

export async function generateInterviewReportPDFAction(reportToken: string): Promise<{
  fileName: string;
  pdfUrl: string;
}> {
  return withAuth(async (user) => {
    const report = await prisma.interviewReport.findUniqueOrThrow({
      where: { token: reportToken },
      select: {
        token: true,
        onePageHtml: true,
        extra: true,
        project: {
          select: {
            id: true,
            brief: true,
            userId: true,
          },
        },
      },
    });

    if (report.project.userId !== user.id) {
      forbidden();
    }

    const title = report.project.brief
      .replace(/\s+/g, " ")
      .replace(/[<>:"/\\|?*]/g, "")
      .replace(/\./g, "");

    // Check if title contains Chinese characters
    const hasChinese = /[\u4e00-\u9fff]/.test(title);
    let titleExcept: string;
    if (hasChinese) {
      // For Chinese: limit to 20 characters
      titleExcept = title.slice(0, 20);
    } else {
      // For English: limit to 10 words
      const words = title.split(" ");
      titleExcept = words.slice(0, 10).join(" ");
    }
    const fileName = `${titleExcept} Interview Report [${reportToken}].pdf`;

    const { pdfUrl } = await generateInterviewReportPDF({
      token: report.token,
      project: {
        id: report.project.id,
        title: report.project.brief,
      },
      extra: report.extra as InterviewReportExtra,
      onePageHtml: report.onePageHtml,
    });

    return {
      fileName,
      pdfUrl,
    };
  });
}

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

    // Generate filename
    const baseFileName = session.title || "Interview Transcript";
    const cleanFileName = baseFileName
      .replace(/\s+/g, " ")
      .replace(/[<>:"/\\|?*]/g, "")
      .slice(0, 30);
    const fileName = `${cleanFileName} [${userChatToken.slice(0, 8)}].pdf`;

    const locale = await getLocale();
    const { pdfUrl } = await generateInterviewTranscriptPDF({
      userChatToken,
      sessionId: session.id,
      extra: session.extra as InterviewSessionExtra,
      locale,
    });

    return {
      success: true,
      data: {
        fileName,
        pdfUrl,
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
