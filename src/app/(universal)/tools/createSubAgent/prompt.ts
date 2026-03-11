import { Locale } from "next-intl";

export type SubAgentMode = "study" | "flexible" | "panel";

export const subAgentStudyPrompt = ({ locale }: { locale: Locale }) =>
  locale === "zh-CN"
    ? `## SubAgent 执行偏置（study 模式）
1. 这是研究导向任务，优先考虑先加载研究相关 skill，尤其是 \`atypica-study-executor\`。
2. 可以自由决定工具和顺序，不要求固定经过 persona 搜索、访谈或报告。
3. 如果任务本身要求研究交付物、报告或可复用成果，调用 \`generateReport\`；否则可以直接返回结论。
4. 最终总结面向上级 agent，而不是最终用户。`
    : `## SubAgent Execution Bias (study mode)
1. This is a research-oriented task, so prefer loading a research skill first, especially \`atypica-study-executor\`.
2. You may choose tools and ordering freely. There is no mandatory persona -> interview -> report sequence.
3. If the task calls for a research deliverable, report, or reusable artifact, call \`generateReport\`; otherwise you may return conclusions directly.
4. Your final summary is for the lead agent, not the end user.`;

export const subAgentFlexiblePrompt = ({ locale }: { locale: Locale }) =>
  locale === "zh-CN"
    ? `## SubAgent 执行偏置（flexible 模式）
1. 先判断任务是否需要 skill；只有在 skill 能显著提升结果时才加载。
2. 根据任务目标自由组合工具，不要被研究流程模板束缚。
3. 只有任务明确要求时才产出报告或播客类产物。`
    : `## SubAgent Execution Bias (flexible mode)
1. First decide whether the task needs a skill; load one only when it materially improves the outcome.
2. Combine tools freely based on the objective instead of following any study template.
3. Produce report or podcast artifacts only when the task explicitly asks for them.`;

export const subAgentPanelPrompt = ({ locale }: { locale: Locale }) =>
  locale === "zh-CN"
    ? `## SubAgent 执行偏置（panel 模式）
1. 默认任务已经有现成的人群上下文或 panel，上来先利用现有上下文，不要重复搜索 persona。
2. 只有当前上下文明显不足时，才补充 searchPersonas 或其他研究工具。
3. 是否生成报告由任务目标决定，不强制。`
    : `## SubAgent Execution Bias (panel mode)
1. Assume the task already has a useful cohort or panel context. Use that context first instead of re-searching personas.
2. Only add \`searchPersonas\` or other research tools when the existing context is clearly insufficient.
3. Report generation is optional and should be driven by the task goal, not forced.`;

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
