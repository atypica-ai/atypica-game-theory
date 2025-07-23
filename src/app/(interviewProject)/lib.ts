import { decryptText, encryptText } from "@/lib/cipher";
import { truncateForTitle } from "@/lib/textUtils";
import { InterviewSharePayload } from "./types";

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
  } catch (error) {
    return null;
  }
}

/**
 * Generate a share URL for an interview project
 * @param projectId - The project ID
 * @param baseUrl - The base URL of the application
 * @param expiryHours - Token expiry time in hours (default: 24 hours)
 * @returns Complete share URL
 */
export function generateInterviewShareUrl(
  projectId: number,
  baseUrl: string,
  expiryHours: number = 24,
): string {
  const token = generateInterviewShareToken(projectId, expiryHours);
  return `${baseUrl}/projects/share/${token}`;
}

/**
 * Generate interview session prompt based on project brief and context
 * @param brief - The interview project brief
 * @param isPersonaInterview - Whether this is a persona interview
 * @param personaName - Name of the persona (if applicable)
 * @returns System prompt for the interview
 */
export function generateInterviewPrompt(
  brief: string,
  isPersonaInterview: boolean = false,
  personaName?: string,
): string {
  const basePrompt = `You are conducting a research interview based on the following brief:

${brief}

Your role is to be a professional interviewer who:
- Asks thoughtful, open-ended questions
- Follows up on interesting responses with deeper questions
- Maintains a conversational but focused tone
- Helps the interviewee feel comfortable sharing their thoughts
- Guides the conversation to gather insights relevant to the research brief

Guidelines:
- Start with introductory questions to build rapport
- Ask one question at a time
- Listen actively and ask follow-up questions based on responses
- Avoid leading questions that might bias the responses
- Keep questions clear and easy to understand
- Adapt your questioning style to the interviewee's responses

Remember: Your goal is to gather authentic insights and understanding, not to validate any particular hypothesis.`;

  if (isPersonaInterview && personaName) {
    return `${basePrompt}

You are interviewing an AI persona named "${personaName}". Treat them as you would a real person, asking questions that would help you understand their perspective, experiences, and thoughts related to the research topic.`;
  }

  return `${basePrompt}

You are interviewing a real person. Be respectful, empathetic, and create a safe space for them to share their genuine thoughts and experiences.`;
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
 * Validate interview project brief
 * @param brief - The brief to validate
 * @returns Validation result with any errors
 */
export function validateInterviewBrief(brief: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!brief || brief.trim().length === 0) {
    errors.push("Brief is required");
  } else if (brief.trim().length < 10) {
    errors.push("Brief must be at least 10 characters long");
  } else if (brief.length > 2000) {
    errors.push("Brief must be less than 2000 characters");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
