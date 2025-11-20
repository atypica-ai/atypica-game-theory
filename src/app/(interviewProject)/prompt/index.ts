/**
 * Interview Prompts
 *
 * 访谈相关的所有 Prompt 统一导出
 */

// 真人访谈 Prompt
export { interviewAgentSystemPromptForHuman } from "./human";

// AI Persona 访谈 Prompt
export { interviewAgentSystemPromptForPersona } from "./persona";

// 问题优化 Prompt
export { interviewQuestionRefinementPrompt } from "./question-refinement";

// 报告生成 Prompts
export { interviewReportSystemPrompt, interviewReportPrologue } from "./report";
