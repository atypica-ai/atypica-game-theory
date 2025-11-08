import { UIDataTypes, UIMessage } from "ai";
import { z } from "zod/v3";
import { TInterviewUITools } from "./tools/types";

// Question schema
export const questionSchema = z.object({
  text: z.string().min(1).max(1000),
  image: z
    .object({
      objectUrl: z.string(),
      name: z.string().max(255),
      mimeType: z.string(),
      size: z.number().positive().max(10 * 1024 * 1024), // 10MB max
    })
    .optional(),
  questionType: z.enum(["open", "single-choice", "multiple-choice"]).optional(),
});

export type Question = z.infer<typeof questionSchema>;

// InterviewProjectExtra schema
export const interviewProjectExtraSchema = z.object({
  questions: z.array(questionSchema).optional(),
  questionTypePreference: z.enum(["open-ended", "multiple-choice", "mixed"]).optional(),
});

export type InterviewProjectExtra = z.infer<typeof interviewProjectExtraSchema>;

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
