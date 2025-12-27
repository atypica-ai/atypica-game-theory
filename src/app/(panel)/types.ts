// Timeline event types
export type DiscussionTimelineEvent =
  | {
      type: "question";
      content: string;
      author: "user" | "moderator";
    }
  | {
      type: "persona-reply";
      personaId: number;
      personaName: string;
      content: string;
    }
  | {
      type: "moderator";
      content: string;
    }
  | {
      type: "moderator-selection";
      selectedPersonaId: number;
      selectedPersonaName: string;
      reasoning?: string;
    };

// Persona session state (runtime only, not persisted)
export interface PersonaSession {
  personaId: number;
  personaName: string;
  systemPrompt: string; // System prompt (personaAgentSystem) for this persona
}

// Re-export discussion types from discussionTypes for convenience
// The actual definitions live in discussionTypes as the single source of truth
export type { DiscussionType, DiscussionTypeConfig } from "./discussionTypes";
