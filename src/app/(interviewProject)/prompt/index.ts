/**
 * Interview Prompts
 *
 * 访谈相关的所有 Prompt 统一导出
 */

import { InterviewProjectQuestion } from "@/prisma/client";
import { Locale } from "next-intl";
import { interviewAgentSystemPromptForHuman } from "./human";
import { interviewAgentSystemPromptForPersona } from "./persona";

// 真人访谈 Prompt
export { interviewAgentSystemPromptForHuman } from "./human";

// AI Persona 访谈 Prompt
export { interviewAgentSystemPromptForPersona } from "./persona";

// 问题优化 Prompt
export { interviewQuestionRefinementPrompt } from "./question-refinement";

// 报告生成 Prompts
export {
  interviewReportAppendSystemPrompt,
  interviewReportPrologue,
  interviewReportSystemPrompt,
} from "./report";

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
  questions?: Array<InterviewProjectQuestion>;
  isPersonaInterview: boolean;
  personaName?: string;
  locale: Locale;
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
