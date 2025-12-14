import { UserLastLogin, UserOnboardingData } from "@/prisma/client";

export type TAnalyticsEvent = {
  "Signed Up": { email: string };
  /**
   *  在 recordAndTrackLastLogin 方法里后端上报，所有登录都会调用
   */
  "Signed In": UserLastLogin;
  // "Onboarding Started": undefined; // 不需要，等价于 Page View (url = /auth/onboarding)
  "Onboarding Step Updated": UserOnboardingData;
  "Onboarding Completed": UserOnboardingData;
  /**
   * 在发起研究界面，一旦开始输入就上报
   * @param interview: 是否使用 newstudy interview
   */
  "Study Brief Updated": { brief: string; interview?: boolean };
  /**
   * 新的研究创建后上报
   * @param userChatToken: 通过 token 来关联后续事件
   * @param studyType: 研究类型，常规研究、产品研发、快速洞察、等
   * @param attachments: 附件数量
   * @param references: 参考研究的数量
   */
  "Study Session Started": {
    userChatId: number;
    studyType: string;
    brief: string;
    interview?: boolean;
    attachments?: number;
    references?: number;
  };
  /**
   * 报告或播客生成后上报
   */
  "Study Session Completed": {
    userChatId: number;
  };
  "Study Report Exported": undefined;
  "Study Feedback Submitted": undefined;
};
