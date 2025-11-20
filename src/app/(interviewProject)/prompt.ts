import { Locale } from "next-intl";
import { interviewAgentSystemPromptForHuman, interviewAgentSystemPromptForPersona } from "./prompt";
import { QuestionData } from "./types";

/**
 * Interview Agent System Prompt Router
 * 根据访谈类型（真人/AI）路由到不同的 Prompt
 */
export function interviewAgentSystemPrompt({
  brief,
  questions,
  isPersonaInterview,
  personaName,
  locale,
}: {
  brief: string;
  questions?: Array<QuestionData>;
  isPersonaInterview: boolean;
  personaName?: string;
  locale?: Locale;
}): string {
  return isPersonaInterview
    ? interviewAgentSystemPromptForPersona({
        brief,
        questions,
        personaName: personaName || "Persona",
        locale,
      })
    : interviewAgentSystemPromptForHuman({
        brief,
        questions,
        locale,
      });
}

// 重新导出所有 prompts
export * from "./prompt";
