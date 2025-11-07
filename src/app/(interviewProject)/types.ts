import { UIDataTypes, UIMessage } from "ai";
import { z } from "zod/v3";
import { TInterviewUITools } from "./tools/types";

// Create Interview Project schema
export const createInterviewProjectSchema = z.object({
  brief: z
    .string()
    .min(10, "Brief must be at least 10 characters")
    .max(5000, "Brief must be less than 5000 characters"),
  presetQuestions: z.string().optional(),
  questionTypePreference: z
    .enum(["open-ended", "multiple-choice", "mixed"])
    .optional()
    .default("open-ended"),
});

export type CreateInterviewProjectInput = z.infer<typeof createInterviewProjectSchema>;

// Update Interview Project schema
export const updateInterviewProjectSchema = z.object({
  brief: z
    .string()
    .min(10, "Brief must be at least 10 characters")
    .max(2000, "Brief must be less than 2000 characters"),
  questionTypePreference: z.enum(["open-ended", "multiple-choice", "mixed"]).optional(),
});

export type UpdateInterviewProjectInput = z.infer<typeof updateInterviewProjectSchema>;

// Share link payload
export interface InterviewSharePayload {
  projectId: number;
  timestamp?: number;
  expiresAt?: number;
  permanent?: string; // 永久链接标识，存储 permanentShareToken
}

export type TInterviewMessageWithTool = UIMessage<unknown, UIDataTypes, TInterviewUITools>;
