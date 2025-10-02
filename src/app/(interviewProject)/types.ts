import { PlainTextToolResult } from "@/ai/tools/types";
import { z } from "zod/v3";

// Create Interview Project schema
export const createInterviewProjectSchema = z.object({
  brief: z
    .string()
    .min(10, "Brief must be at least 10 characters")
    .max(2000, "Brief must be less than 2000 characters"),
});

export type CreateInterviewProjectInput = z.infer<typeof createInterviewProjectSchema>;

// Update Interview Project schema
export const updateInterviewProjectSchema = z.object({
  brief: z
    .string()
    .min(10, "Brief must be at least 10 characters")
    .max(2000, "Brief must be less than 2000 characters"),
});

export type UpdateInterviewProjectInput = z.infer<typeof updateInterviewProjectSchema>;

// Share link payload
export interface InterviewSharePayload {
  projectId: number;
  timestamp: number;
  expiresAt: number;
}

export enum InterviewToolName {
  endInterview = "endInterview",
  requestInteractionForm = "requestInteractionForm",
}

export interface RequestInteractionFormResult extends PlainTextToolResult {
  formResponses: Record<string, string | number>;
  plainText: string;
}
