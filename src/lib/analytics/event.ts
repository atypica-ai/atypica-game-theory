import { UserLastLogin, UserOnboardingData } from "@/prisma/client";

export type TAnalyticsEvent = {
  "Signed Up": { email: string };
  "Signed In": UserLastLogin; // 在 recordAndTrackLastLogin 方法里后端上报，所有登录都会调用
  // "Onboarding Started": undefined; // 不需要，等价于 Page View (url = /auth/onboarding)
  "Onboarding Step Updated": UserOnboardingData;
  "Onboarding Completed": UserOnboardingData;
  "Study Brief Updated": { brief: string; interview?: boolean }; // 一旦开始输入就追踪
  "Study Session Started": { brief: string };
  "Study Session Completed": undefined;
  "Study Report Exported": undefined;
  "Study Feedback Submitted": undefined;
};
