import type { Locale as LocaleType } from "next-intl";
import type * as panel from "../app/(panel)/types";
import type * as persona from "../app/(persona)/types";
import type * as sage from "../app/(sage)/types";
import type * as study from "../app/(study)/context/types";
import type * as tokens from "../tokens/types";
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
    type UserChatContext = study.UserChatContext;
    type UserChatExtra = client.UserChatExtra;
    type ChatMessagePart = client.ChatMessagePart;
    type ChatMessageAttachment = client.ChatMessageAttachment;
    type AgentStatisticsExtra = client.AgentStatisticsExtra;

    // Subscription and Tokens
    type SubscriptionExtra = client.SubscriptionExtra;
    type TokensAccountExtra = client.TokensAccountExtra;
    type TokensLogResourceType = tokens.TokensLogResourceType;
    type TokensLogExtra = client.TokensLogExtra;

    // Image and Attachment
    type ImageGenerationExtra = client.ImageGenerationExtra;
    type AttachmentFileExtra = client.AttachmentFileExtra;

    // Persona
    type PersonaExtra = client.PersonaExtra;
    type PersonaImportAnalysis = persona.PersonaImportAnalysis;
    type PersonaImportExtra = client.PersonaImportExtra;
    type PersonaPanelExtra = client.PersonaPanelExtra;

    // Interview
    type InterviewProjectQuestion = client.InterviewProjectQuestion;
    type InterviewProjectExtra = client.InterviewProjectExtra;
    type InterviewSessionExtra = client.InterviewSessionExtra;
    type InterviewReportExtra = client.InterviewReportExtra;

    // Discussion
    type DiscussionTimelineEvent = panel.DiscussionTimelineEvent;
    type DiscussionTimelineExtra = client.DiscussionTimelineExtra;

    // Blog and Research Template
    type BlogArticleExtra = client.BlogArticleExtra;
    type ResearchTemplateExtra = client.ResearchTemplateExtra;

    // Sage
    type SageAvatar = sage.SageAvatar;
    type SageExtra = sage.SageExtra;
    type SageSourceType = sage.SageSourceType;
    type SageSourceContent = sage.SageSourceContent;
    type SageSourceExtra = sage.SageSourceExtra;
    type SageKnowledgeGapSeverity = sage.SageKnowledgeGapSeverity;
    type SageKnowledgeGapExtra = sage.SageKnowledgeGapExtra;
    type SageInterviewExtra = sage.SageInterviewExtra;
    type SageChatExtra = sage.SageChatExtra;
    type WorkingMemoryItem = sage.WorkingMemoryItem;

    // Pulse
    type PulseExtra = client.PulseExtra;

    // Locale
    type Locale = LocaleType;
  }
}

export {};
