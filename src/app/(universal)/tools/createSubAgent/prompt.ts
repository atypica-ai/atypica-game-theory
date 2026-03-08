import { Locale } from "next-intl";

export type SubAgentMode = "study" | "flexible" | "panel";

/**
 * study: Full study workflow — search personas, interview/discuss, generate report
 * flexible: All tools available, no forced stage flow, follow taskRequirement freely
 * panel: Personas already selected, skip search/build, go straight to discussion/interview → report
 */
export const subAgentStudyPrompt = ({ locale }: { locale: Locale }) =>
  locale === "zh-CN"
    ? `## SubAgent 执行要求（study 模式）
1. 不要向用户请求交互确认，直接自主完成研究。
2. 先搜索或构建合适的人设（searchPersonas / buildPersona）。
3. 至少执行一次研究工具（interviewChat 或 discussionChat）收集数据。
4. 必须执行一次 generateReport 产出研究报告。
5. 在最终总结中，汇报你的关键发现、结论，以及产物的位置（如报告路径），供上级 agent 读取。`
    : `## SubAgent Execution Requirements (study mode)
1. Do not pause for user-interaction confirmation; finish the workflow autonomously.
2. Search or build suitable personas first (searchPersonas / buildPersona).
3. Run at least one research tool (interviewChat or discussionChat) to collect data.
4. Run generateReport once to produce a research report.
5. In your final summary, report your key findings, conclusions, and artifact locations (e.g. report path) so the lead agent can access them.`;

export const subAgentFlexiblePrompt = ({ locale }: { locale: Locale }) =>
  locale === "zh-CN"
    ? `## SubAgent 执行要求（flexible 模式）
1. 不要向用户请求交互确认，直接自主完成任务。
2. 你拥有所有研究工具，根据 taskRequirement 自行决定使用哪些工具、以什么顺序执行。
3. 没有强制阶段流程，灵活选择最合适的工具组合完成任务。
4. 如果任务需要产出报告，调用 generateReport；如果不需要，可以跳过。
5. 在最终总结中，汇报你的关键发现、结论，以及产物的位置（如有），供上级 agent 读取。`
    : `## SubAgent Execution Requirements (flexible mode)
1. Do not pause for user-interaction confirmation; finish the task autonomously.
2. You have all research tools available. Decide which tools to use and in what order based on the taskRequirement.
3. There is no mandatory stage flow — pick the best tool combination for the task.
4. If the task requires a report, call generateReport; otherwise you may skip it.
5. In your final summary, report your key findings, conclusions, and artifact locations (if any) so the lead agent can access them.`;

export const subAgentPanelPrompt = ({ locale }: { locale: Locale }) =>
  locale === "zh-CN"
    ? `## SubAgent 执行要求（panel 模式）
1. 不要向用户请求交互确认，直接自主完成研究。
2. 人设已经预先选定，不需要搜索或构建人设（跳过 searchPersonas / buildPersona）。
3. 直接执行 discussionChat 或 interviewChat 收集数据。
4. 必须执行一次 generateReport 产出研究报告。
5. 在最终总结中，汇报你的关键发现、结论，以及产物的位置（如报告路径），供上级 agent 读取。`
    : `## SubAgent Execution Requirements (panel mode)
1. Do not pause for user-interaction confirmation; finish the workflow autonomously.
2. Personas are already pre-selected — do NOT search or build personas (skip searchPersonas / buildPersona).
3. Go directly to discussionChat or interviewChat to collect data.
4. Run generateReport once to produce a research report.
5. In your final summary, report your key findings, conclusions, and artifact locations (e.g. report path) so the lead agent can access them.`;

export function getSubAgentModePrompt({
  mode,
  locale,
}: {
  mode: SubAgentMode;
  locale: Locale;
}): string {
  switch (mode) {
    case "study":
      return subAgentStudyPrompt({ locale });
    case "flexible":
      return subAgentFlexiblePrompt({ locale });
    case "panel":
      return subAgentPanelPrompt({ locale });
  }
}
