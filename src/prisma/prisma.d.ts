import type { Locale } from "next-intl";
import type { DiscussionTimelineEvent } from "../app/(panel)/types";
import type * as sage from "../app/(sage)/types";
import type { UserChatContext } from "../app/(study)/context/types";
import type { TokensLogResourceType } from "../tokens/types";
import * as client from "./client";

// https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-json-fields#typed-json-fields
// 文件放在哪都行，只需要被 tsconfig.json 引用就可以
declare global {
  namespace PrismaJson {
    type DBType = {
      // User and Team
      UserLastLogin: client.UserLastLogin;
      UserOnboardingData: client.UserOnboardingData;
      UserProfileExtra: client.UserProfileExtra;
      TeamExtra: client.TeamExtra;
      ApiKeyExtra: client.ApiKeyExtra;

      // Agent Skill
      AgentSkillExtra: client.AgentSkillExtra;

      // Featured Item
      FeaturedItemResourceType: client.FeaturedItemResourceType;
      FeaturedItemExtra: client.FeaturedItemExtra;

      // Analyst Report and Podcast
      AnalystKind: client.AnalystKind;
      AnalystReportExtra: client.AnalystReportExtra;
      AnalystPodcastExtra: client.AnalystPodcastExtra;

      // User Chat and Chat Message
      UserChatContext: UserChatContext;
      UserChatExtra: client.UserChatExtra;
      ChatMessagePart: client.ChatMessagePart;
      ChatMessageAttachment: client.ChatMessageAttachment;

      // Subscription and Tokens
      SubscriptionExtra: client.SubscriptionExtra;
      TokensAccountExtra: client.TokensAccountExtra;
      TokensLogResourceType: TokensLogResourceType;
      TokensLogExtra: client.TokensLogExtra;

      // Image and Attachment
      ImageGenerationExtra: client.ImageGenerationExtra;
      AttachmentFileExtra: client.AttachmentFileExtra;

      // Persona
      PersonaExtra: client.PersonaExtra;
      PersonaImportExtra: client.PersonaImportExtra;
      PersonaPanelExtra: client.PersonaPanelExtra;

      // Interview
      InterviewProjectQuestion: client.InterviewProjectQuestion;
      InterviewProjectExtra: client.InterviewProjectExtra;
      InterviewSessionExtra: client.InterviewSessionExtra;
      InterviewReportExtra: client.InterviewReportExtra;

      // Discussion
      DiscussionTimelineEvent: DiscussionTimelineEvent;
      DiscussionTimelineExtra: client.DiscussionTimelineExtra;

      // Blog and Research Template
      BlogArticleExtra: client.BlogArticleExtra;
      ResearchTemplateExtra: client.ResearchTemplateExtra;

      // Sage
      SageAvatar: sage.SageAvatar;
      SageExtra: sage.SageExtra;
      SageSourceType: sage.SageSourceType;
      SageSourceContent: sage.SageSourceContent;
      SageSourceExtra: sage.SageSourceExtra;
      SageKnowledgeGapSeverity: sage.SageKnowledgeGapSeverity;
      SageKnowledgeGapExtra: sage.SageKnowledgeGapExtra;
      SageInterviewExtra: sage.SageInterviewExtra;
      SageChatExtra: sage.SageChatExtra;
      WorkingMemoryItem: sage.WorkingMemoryItem;

      // Locale
      Locale: Locale;
    };
  }
}

export {};
