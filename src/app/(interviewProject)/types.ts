import { z } from "zod";

// Create Interview Project schema
export const createInterviewProjectSchema = z.object({
  brief: z
    .string()
    .min(10, "Brief must be at least 10 characters")
    .max(2000, "Brief must be less than 2000 characters"),
});

export type CreateInterviewProjectInput = z.infer<typeof createInterviewProjectSchema>;

// Share link payload
export interface InterviewSharePayload {
  projectId: number;
  timestamp: number;
  expiresAt: number;
}
