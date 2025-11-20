import { UIDataTypes, UIMessage } from "ai";
import { TInterviewUITools } from "./tools/types";

// Share link payload
export interface InterviewSharePayload {
  projectId: number;
  timestamp?: number;
  expiresAt?: number;
  permanent?: string; // 永久链接标识，存储 permanentShareToken
}

export type TInterviewMessageWithTool = UIMessage<unknown, UIDataTypes, TInterviewUITools>;

// Question data structure used in interview sessions
export type { QuestionData } from "./tools/types";
