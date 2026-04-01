import type { Locale as LocaleType } from "next-intl";
import type * as client from "./client";

// https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-json-fields#typed-json-fields
// 文件放在哪都行，只需要被 tsconfig.json 引用，同时在项目里被引入 (在 ./prisma.ts 里) 就可以
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Prisma requires global namespace for JSON field types
  namespace PrismaJson {
    // User and Team
    type UserLastLogin = client.UserLastLogin;
    type UserOnboardingData = client.UserOnboardingData;
    type UserProfileExtra = client.UserProfileExtra;
    type TeamExtra = client.TeamExtra;
    type ApiKeyExtra = client.ApiKeyExtra;

    // Agent Skill
    type AgentSkillExtra = client.AgentSkillExtra;

    // Featured Item
    type FeaturedItemResourceType = client.FeaturedItemResourceType;
    type FeaturedItemExtra = client.FeaturedItemExtra;

    // Analyst Report and Podcast
    type AnalystReportExtra = client.AnalystReportExtra;
    type AnalystPodcastExtra = client.AnalystPodcastExtra;

    // User Chat and Chat Message
    type UserChatExtra = client.UserChatExtra;
    type ChatMessagePart = client.ChatMessagePart;
    type ChatMessageAttachment = client.ChatMessageAttachment;
    type AgentStatisticsExtra = client.AgentStatisticsExtra;

    // Subscription and Tokens
    type SubscriptionExtra = client.SubscriptionExtra;
    type TokensAccountExtra = client.TokensAccountExtra;
    type TokensLogExtra = client.TokensLogExtra;

    // Image and Attachment
    type ImageGenerationExtra = client.ImageGenerationExtra;
    type AttachmentFileExtra = client.AttachmentFileExtra;

    // Persona
    type PersonaExtra = client.PersonaExtra;
    type PersonaImportExtra = client.PersonaImportExtra;
    type PersonaPanelExtra = client.PersonaPanelExtra;

    // Interview
    type InterviewProjectQuestion = client.InterviewProjectQuestion;
    type InterviewProjectExtra = client.InterviewProjectExtra;
    type InterviewSessionExtra = client.InterviewSessionExtra;
    type InterviewReportExtra = client.InterviewReportExtra;

    // Discussion
    type DiscussionTimelineExtra = client.DiscussionTimelineExtra;

    // Blog and Research Template
    type BlogArticleExtra = client.BlogArticleExtra;
    type ResearchTemplateExtra = client.ResearchTemplateExtra;

    // Pulse
    type PulseExtra = client.PulseExtra;

    // Locale
    type Locale = LocaleType;
  }
}

export {};
