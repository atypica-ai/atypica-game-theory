export type UserChatContext = Partial<{
  interviewPersonaPanelId: number;
  /**
   * @todo 以下字段现在没用，需要从 extra 里面复制过来
   */
  // studyUserChat 专用
  referenceUserChats: string[]; // List of chat tokens used as context
  researchTemplateId: number; // Research template used to initiate this chat
  // study user chat 专用
  newStudyUserChatToken: string;
  briefUserChatId: number;
  // deepResearch 专用
  deepResearchExpert: "grok" | "trendExplorer"; // ExpertName enum (resolved, no "auto")
}>;
