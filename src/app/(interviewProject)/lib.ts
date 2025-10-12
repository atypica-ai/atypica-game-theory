import "server-only";

import { convertDBMessageToAIMessage } from "@/ai/messageUtils";
import { decryptText, encryptText } from "@/lib/cipher";
import { truncateForTitle } from "@/lib/textUtils";
import { prisma } from "@/prisma/prisma";
import { InterviewToolName } from "./tools/types";
import { InterviewSharePayload, TInterviewMessageWithTool } from "./types";

/**
 * Generate an encrypted share token for an interview project
 * @param projectId - The project ID to generate token for
 * @param expiryHours - Token expiry time in hours (default: 24 hours)
 * @returns Encrypted share token
 */
export function generateInterviewShareToken(projectId: number, expiryHours: number = 24): string {
  const now = Date.now();
  const expiresAt = now + expiryHours * 60 * 60 * 1000; // Convert hours to milliseconds

  const payload: InterviewSharePayload = {
    projectId,
    timestamp: now,
    expiresAt,
  };

  return encryptText(JSON.stringify(payload));
}

/**
 * Decrypt and validate an interview share token
 * @param token - The encrypted share token
 * @returns Decoded payload if valid, null if invalid or expired
 */
export function decryptInterviewShareToken(token: string): InterviewSharePayload | null {
  try {
    const decrypted = decryptText(token);
    const payload: InterviewSharePayload = JSON.parse(decrypted);

    // Validate payload structure
    if (
      typeof payload.projectId !== "number" ||
      typeof payload.timestamp !== "number" ||
      typeof payload.expiresAt !== "number"
    ) {
      return null;
    }

    // Check if token has expired
    const now = Date.now();
    if (now > payload.expiresAt) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Generate title for interview session
 * @param brief - The interview project brief
 * @param isPersonaInterview - Whether this is a persona interview
 * @param personaName - Name of the persona (if applicable)
 * @returns Generated title
 */
export function generateInterviewTitle(
  brief: string,
  isPersonaInterview: boolean = false,
  personaName?: string,
): string {
  const truncatedBrief = truncateForTitle(brief, {
    maxDisplayWidth: 100,
    suffix: "...",
  });

  if (isPersonaInterview && personaName) {
    return `Interview with ${personaName.slice(0, 50)}: ${truncatedBrief}`;
  }

  return `Interview: ${truncatedBrief}`;
}

/**
 * Validate share token
 */
export async function validateInterviewShareToken(
  shareToken: string,
): Promise<{ projectId: number; ownerName: string } | null> {
  const payload = decryptInterviewShareToken(shareToken);
  if (!payload) {
    return null;
  }

  const project = await prisma.interviewProject.findUnique({
    where: { id: payload.projectId },
    select: {
      id: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!project) {
    return null;
  }

  return {
    projectId: project.id,
    ownerName: project.user.name,
  };
}

/**
 * Interview transcript type
 */
export type InterviewTranscript = {
  title: string | null;
  summary: string | null;
  personalInfo: Array<{ label: string; text: string }> | null; // Changed from participantInfo
  messages: Array<
    | {
        type: "message";
        role: "user" | "assistant";
        textContent: string;
      }
    | {
        type: "form";
        formData: {
          prologue: string;
          fields: Array<{ label: string; value: string | number }>;
        };
      }
  >;
};

/**
 * Extract interview transcript from UserChat
 */
export async function extractInterviewTranscript(userChatId: number): Promise<InterviewTranscript> {
  const uiMessages = (
    await prisma.chatMessage.findMany({
      where: { userChatId },
      orderBy: { createdAt: "asc" },
      select: {
        messageId: true,
        role: true,
        parts: true,
        extra: true,
      },
    })
  ).map(convertDBMessageToAIMessage) as TInterviewMessageWithTool[];

  let title: string | null = null;
  let summary: string | null = null;
  let personalInfo: Array<{ label: string; text: string }> | null = null;
  const transcriptMessages: InterviewTranscript["messages"] = [];

  for (const uiMessage of uiMessages) {
    for (const part of uiMessage.parts ?? []) {
      // Extract text content
      if (part.type === "text") {
        transcriptMessages.push({
          type: "message",
          role: uiMessage.role as "user" | "assistant",
          textContent: part.text,
        });
      }

      // Extract tool invocation results
      if (
        part.type.startsWith("tool-") &&
        "toolCallId" in part &&
        part.state === "output-available"
      ) {
        if (part.type === `tool-${InterviewToolName.endInterview}`) {
          title = part.output.title || null;
          summary = part.output.interviewSummary || null;
          // Extract personalInfo from endInterview tool
          if (part.output.personalInfo && Array.isArray(part.output.personalInfo)) {
            personalInfo = part.output.personalInfo;
          }
        }
        // Add form interactions to messages
        if (part.type === `tool-${InterviewToolName.requestInteractionForm}`) {
          if (part.output?.formResponses && part.input?.fields) {
            // Map response keys to field labels with values
            const fields: Array<{ label: string; value: string | number }> = [];
            Object.entries(part.output.formResponses).forEach(([key, value]) => {
              const field = part.input.fields.find((f) => f.id === key);
              const label = field?.label || key;
              fields.push({ label, value });
            });
            transcriptMessages.push({
              type: "form",
              formData: {
                prologue: part.input.prologue || "",
                fields,
              },
            });
          }
        }
      }
    }
  }

  return {
    title,
    summary,
    personalInfo,
    messages: transcriptMessages,
  };
}
