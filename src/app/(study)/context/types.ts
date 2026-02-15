import { ExpertName } from "@/app/(deepResearch)/experts/types";

export type UserChatContext = Partial<{
  // studyUserChat 专用: 过程关键信息
  interviewPersonaPanelId: number;
  reportTokens: string[];
  podcastTokens: string[];

  // studyUserChat 专用: 创建来源
  referenceUserChats: string[]; // List of chat tokens used as context
  researchTemplateId: number; // Research template used to initiate this chat
  // briefUserChatId: number; // 前置的 clarify interview
  briefUserChatToken: string; // 前置的 clarify interview

  // clarify interview / newstudy interview 专用
  newStudyUserChatToken: string;

  // deepResearch 专用
  deepResearchExpert: ExpertName; // ExpertName enum (resolved, no "auto")
}>;
