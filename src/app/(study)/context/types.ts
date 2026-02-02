import { ExpertName } from "@/app/(deepResearch)/experts/types";

export type UserChatContext = Partial<{
  // Report and Podcast tokens (array, multiple allowed)
  reportTokens: string[];
  podcastTokens: string[];
  // studyUserChat 专用
  interviewPersonaPanelId: number;
  referenceUserChats: string[]; // List of chat tokens used as context
  researchTemplateId: number; // Research template used to initiate this chat
  newStudyUserChatToken: string;
  briefUserChatId: number;
  // deepResearch 专用
  deepResearchExpert: ExpertName; // ExpertName enum (resolved, no "auto")
}>;
