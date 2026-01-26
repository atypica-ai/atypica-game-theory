import { ExpertName } from "@/app/(deepResearch)/experts/types";

export type UserChatContext = Partial<{
  interviewPersonaPanelId: number;
  // Report and Podcast tokens (array, multiple allowed)
  reportTokens: string[];
  podcastTokens: string[];
  // studyUserChat 专用
  referenceUserChats: string[]; // List of chat tokens used as context
  researchTemplateId: number; // Research template used to initiate this chat
  // study user chat 专用
  newStudyUserChatToken: string;
  briefUserChatId: number;
  // deepResearch 专用
  deepResearchExpert: ExpertName; // ExpertName enum (resolved, no "auto")
}>;
