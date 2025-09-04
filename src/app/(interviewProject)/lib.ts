import "server-only";

import { decryptText, encryptText } from "@/lib/cipher";
import { truncateForTitle } from "@/lib/textUtils";
import { prisma } from "@/prisma/prisma";
import { Message } from "ai";
import { InterviewSharePayload, InterviewToolName, RequestInteractionFormResult } from "./types";

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
  participantInfo: Record<string, string | number> | null;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
  }>;
};

/**
 * Extract interview transcript from UserChat
 */
export async function extractInterviewTranscript(userChatId: number): Promise<InterviewTranscript> {
  const messages = await prisma.chatMessage.findMany({
    where: { userChatId },
    orderBy: { createdAt: "asc" },
    select: {
      role: true,
      content: true,
      parts: true,
      createdAt: true,
    },
  });

  let title: string | null = null;
  let summary: string | null = null;
  let participantInfo: Record<string, string | number> | null = null;
  const transcriptMessages: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
  }> = [];

  for (const message of messages) {
    const parts = message.parts as Message["parts"];
    if (parts) {
      for (const part of parts) {
        // Extract text content
        if (part.type === "text") {
          transcriptMessages.push({
            role: message.role as "user" | "assistant",
            content: part.text,
            timestamp: message.createdAt,
          });
        }

        // Extract tool invocation results
        if (part.type === "tool-invocation" && part.toolInvocation?.state === "result") {
          const toolInvocation = part.toolInvocation;

          if (toolInvocation.toolName === InterviewToolName.endInterview) {
            const result = toolInvocation.result;
            title = result.title || null;
            summary = result.interviewSummary || null;
          }

          if (toolInvocation.toolName === InterviewToolName.requestInteractionForm) {
            const result = toolInvocation.result as RequestInteractionFormResult;
            const args = toolInvocation.args as { fields?: Array<{ id: string; label: string }> };

            if (result.formResponses && args.fields) {
              // Map response keys to field labels
              const labeledResponses: Record<string, string | number> = {};
              Object.entries(result.formResponses).forEach(([key, value]) => {
                const field = args.fields?.find((f) => f.id === key);
                const label = field?.label || key;
                labeledResponses[label] = value;
              });
              participantInfo = labeledResponses;
            } else {
              participantInfo = result.formResponses || null;
            }
          }
        }
      }
    }

    // Fallback: if no text parts found, use content directly
    if (!parts && message.content) {
      transcriptMessages.push({
        role: message.role as "user" | "assistant",
        content: message.content,
        timestamp: message.createdAt,
      });
    }
  }

  return {
    title,
    summary,
    participantInfo,
    messages: transcriptMessages,
  };
}

/**
 * Generate markdown transcript for an interview session
 */
export function generateTranscriptMarkdown(transcript: InterviewTranscript): string {
  const { title, summary, participantInfo, messages } = transcript;

  let markdown = "";

  // Title
  if (title) {
    markdown += `# ${title}\n\n`;
  }

  // Summary
  if (summary) {
    markdown += `## 访谈总结\n\n${summary}\n\n`;
  }

  // Participant Info
  if (participantInfo && Object.keys(participantInfo).length > 0) {
    markdown += `## 参与者信息\n\n`;
    Object.entries(participantInfo).forEach(([key, value]) => {
      markdown += `**${key}:** ${value}\n\n`;
    });
  }

  // Messages
  if (messages.length > 0) {
    markdown += `## 访谈对话\n\n`;
    messages.forEach((message) => {
      const role = message.role === "user" ? "👤 用户" : "🤖 助手";
      const timestamp = message.timestamp.toLocaleString("zh-CN");
      markdown += `### ${role} (${timestamp})\n\n${message.content}\n\n---\n\n`;
    });
  }

  return markdown;
}
