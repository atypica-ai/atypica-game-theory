import { z } from "zod";

// Interview Project types
export interface InterviewProjectWithSessions {
  id: number;
  token: string;
  userId: number;
  brief: string;
  createdAt: Date;
  updatedAt: Date;
  sessions: Array<{
    id: number;
    title: string;
    intervieweeUser: {
      id: number;
      name: string | null;
      email: string;
    };
    intervieweePersona: {
      id: number;
      name: string;
    };
    createdAt: Date;
  }>;
  interviewReport?: Array<{
    id: number;
    token: string;
    generatedAt: Date | null;
    createdAt: Date;
  }>;
}

// Create Interview Project schema
export const createInterviewProjectSchema = z.object({
  brief: z
    .string()
    .min(10, "Brief must be at least 10 characters")
    .max(2000, "Brief must be less than 2000 characters"),
});

export type CreateInterviewProjectInput = z.infer<typeof createInterviewProjectSchema>;

// Interview Session types
export interface InterviewSessionWithDetails {
  id: number;
  projectId: number;
  title: string;
  project: {
    id: number;
    token: string;
    userId: number;
    brief: string;
    user: {
      id: number;
      name: string | null;
      email: string;
    };
  };
  userChatId: number | null;
  userChat: {
    id: number;
    token: string;
    title: string;
  };
  intervieweeUser: {
    id: number;
    name: string | null;
    email: string;
  } | null;
  intervieweePersona: {
    id: number;
    name: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

// Share link payload
export interface InterviewSharePayload {
  projectId: number;
  timestamp: number;
  expiresAt: number;
}

// API schemas
export const interviewSessionChatBodySchema = z.object({
  message: z.object({
    id: z.string().optional(),
    role: z.enum(["user", "assistant"]),
    content: z.string(),
    // parts: z.array(z.any()).optional(),
  }),
  userChatToken: z.string(),
});

export type InterviewSessionChatBody = z.infer<typeof interviewSessionChatBodySchema>;

// Create session schemas
export const createHumanInterviewSessionSchema = z.object({
  projectId: z.number(),
  shareToken: z.string(),
});

export const createPersonaInterviewSessionSchema = z.object({
  projectId: z.number(),
  personaId: z.number(),
});

export type CreateHumanInterviewSessionInput = z.infer<typeof createHumanInterviewSessionSchema>;
export type CreatePersonaInterviewSessionInput = z.infer<
  typeof createPersonaInterviewSessionSchema
>;

// Interview Report types
export interface InterviewReport {
  id: number;
  token: string;
  projectId: number;
  onePageHtml: string;
  generatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InterviewReportWithProject extends InterviewReport {
  project: {
    id: number;
    brief: string;
    userId: number;
  };
}
