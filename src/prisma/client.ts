export * from "./generated/browser"; // 导出前端可以用的类型，包含 enum 和 models

/**
 * Types for Prisma JSON fields — only types used by kept models
 */

export type UserLastLogin = Partial<{
  timestamp: number;
  clientIp: string;
  userAgent: string;
  geo: Partial<{
    country: string;
    countryCode: string;
    city: string;
  }>;
  provider: "email-password" | "impersonation" | "team-switch" | "google" | "aws-marketplace";
}>;

export type UserProfileExtra = Partial<{
  lastTrack: number; // timestamp of last trackUser
  stripeCustomerIds: Partial<{
    USD: string;
    CNY: string;
  }>;
  acquisition: {
    utm?: {
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
      utm_term?: string;
      utm_content?: string;
      capturedAt?: string;
    };
    referer?: {
      referer: string;
      hostname: string;
      capturedAt?: string;
    };
  };
}>;

// for extra field on AgentStatistics / token usage tracking
export type AgentStatisticsExtra = {
  reportedBy: string;
} & Record<string, unknown>;

export type TeamExtra = Partial<{
  unlimitedSeats: boolean;
}>;

// ── Character Profile ─────────────────────────────────────────────────────────
// A general psychological profile derived from research into FBI profiling,
// Hogan Assessments, Enneagram, MBTI cognitive functions, adult attachment theory,
// Schwartz values, and Kegan developmental stages.

export type CharacterProfile = {
  core: {
    primaryFear: string;
    primaryDesire: string;
    defensiveStrategy: string;
    dominantValues: [string, string, string];
    valueTension: string | null;
  };
  style: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    emotionalStability: number;
    ambition: number;
  };
  relational: {
    attachmentStyle: "secure" | "anxious" | "dismissing" | "fearful";
    attachmentAnxiety: number;
    attachmentAvoidance: number;
    trustStance:
      | "trusts until proven wrong"
      | "cautiously extends trust"
      | "trust must be earned"
      | "assumes ulterior motives";
  };
  cognition: {
    informationStyle:
      | "concrete-sequential"
      | "concrete-adaptive"
      | "abstract-systematic"
      | "abstract-intuitive";
    decisionCriteria:
      | "logic-and-efficiency"
      | "internal-consistency"
      | "group-harmony"
      | "personal-values";
    emotionalPerception: number;
    emotionalRegulation: number;
  };
  shadow: {
    primaryDerailer:
      | "excitable"
      | "skeptical"
      | "cautious"
      | "reserved"
      | "leisurely"
      | "bold"
      | "mischievous"
      | "colorful"
      | "diligent"
      | "dutiful";
    secondaryDerailer?: CharacterProfile["shadow"]["primaryDerailer"];
    stressTrigger: string;
    shadowExpression: "organized" | "disorganized";
  };
  development: {
    level:
      | "impulsive"
      | "self-protective"
      | "socialized"
      | "self-authoring"
      | "self-transforming";
    moralAuthority:
      | "external-rules"
      | "relational"
      | "principled"
      | "contextual";
  };
};

export type PersonaExtra = Partial<{
  role: "consumer" | "buyer" | "expert";
  quote: string;
  age: number;
  location: string;
  industry: string;
  title: string;
  organization: string;
  experience: string;
  archived: boolean;
  characterProfile: CharacterProfile;
}>;
