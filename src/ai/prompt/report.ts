import { AnalystKind } from "@/app/(public)/featured-studies/data";
import { Analyst } from "@/prisma/client";
import { Locale } from "next-intl";
import { reportHTMLSystemCreation } from "./report/creation";
import { reportHTMLSystemInsights } from "./report/insights";
import { reportHTMLSystemMisc } from "./report/misc";
import { reportHTMLSystemPlanning } from "./report/planning";
import { reportHTMLSystemTesting } from "./report/testing";
import { promptSystemConfig } from "./systemConfig";

export const reportHTMLSystem = ({
  locale,
  analystKind,
}: {
  locale: Locale;
  analystKind: AnalystKind;
}) => {
  switch (analystKind) {
    case AnalystKind.testing:
      return reportHTMLSystemTesting({ locale });
    case AnalystKind.insights:
      return reportHTMLSystemInsights({ locale });
    case AnalystKind.creation:
      return reportHTMLSystemCreation({ locale });
    case AnalystKind.planning:
      return reportHTMLSystemPlanning({ locale });
    case AnalystKind.misc:
    default:
      return reportHTMLSystemMisc({ locale });
  }
};

export const reportHTMLPrologue = ({
  locale,
  analyst,
  instruction,
}: {
  locale: Locale;
  analyst: Analyst & {
    interviews: {
      conclusion: string;
    }[];
  };
  instruction: string;
}) =>
  locale === "zh-CN"
    ? `
我的角色是<role>${analyst.role}</role>

原始研究需求（brief）：

<brief>
${analyst.brief}
</brief>

经过澄清后的研究主题（topic）：

<topic>
${analyst.topic}
</topic>

以下是我们的访谈总结：

${analyst.interviews.map((interview) => `<conclusion>\n${interview.conclusion}\n</conclusion>`).join("\n\n")}

以下是研究过程总结：

<studySummary>
${analyst.studySummary}
</studySummary>

${instruction ? `额外指令（在遵循上述核心要求的基础上）：\n\n<instruction>\n${instruction}\n</instruction>\n` : ""}

请直接输出完整HTML代码，从<!DOCTYPE html>开始，不要包含任何解释、前言或markdown标记。
`
    : `
My role is <role>${analyst.role}</role>

Original study brief:

<brief>
${analyst.brief}
</brief>

Clarified study topic:

<topic>
${analyst.topic}
</topic>

Here are our interview summaries:

${analyst.interviews.map((interview) => `<conclusion>\n${interview.conclusion}\n</conclusion>`).join("\n\n")}

Here is the study process summary:

<studySummary>
${analyst.studySummary}
</studySummary>

${instruction ? `Additional instructions (while following the core requirements above):\n\n<instruction>\n${instruction}\n</instruction>\n` : ""}

Please directly output complete HTML code, starting with <!DOCTYPE html>, without any explanations, preface, or markdown formatting.
`;

export const reportCoverSystem = ({ locale }: { locale: Locale }) =>
  locale === "zh-CN"
    ? `${promptSystemConfig({ locale })}
你是商业研究智能体 atypica.AI 团队里的研究报告专家。作为顶尖的SVG设计师，请为研究报告创建一张以文本为主的简约专业封面。

【设计目标】
- 创建以精心排版的文本为主的封面设计
- 通过简约的文字排版传达研究主题的核心内容
- 设计符合高端商业美学的专业封面
- 可以有装饰性元素，但不要使用具象或抽象图形

【技术规格】
- 尺寸：600px × 300px (viewBox="0 0 600 300")
- 格式：纯SVG代码（无外部资源引用）
- 兼容性：确保在各种尺寸下可正确显示

【设计风格指南】
- 以排版和字体设计为核心的简约风格
- 注重文字大小、字重和间距的精细调整
- 通过文本本身创造层次感和视觉焦点
- 可以添加简单的装饰元素，如线条、几何形状等
- 避免使用具象或复杂抽象元素

【内容要点】
- 使用精选的标题和副标题传达研究核心内容
- 以文字排版为主，辅以简单的装饰元素
- 创建焦点明确的视觉层次
- 选用与报告主题相协调的配色方案
- 确保文本清晰易读，同时具有设计感

【技术实现要求】
- 正确设置viewBox="0 0 600 300"
- 包含preserveAspectRatio="xMidYMid meet"属性
- 使用相对坐标和比例，避免固定像素值
- 优化SVG代码以确保高效渲染
- 去除冗余或不必要的属性和元素

你的回复应该只包含可直接使用的SVG代码，从 <svg 开始到 </svg> 结束。
`
    : `${promptSystemConfig({ locale })}
You are a study report specialist from the atypica.AI business intelligence team. As a top-tier SVG designer, please create a minimalist professional cover for the study report that is primarily text-based.

【Design Objectives】
- Create a cover design primarily featuring carefully arranged typography
- Convey the core content of the study theme through minimalist text layout
- Design a professional cover that meets high-end business aesthetics
- May include decorative elements, but avoid figurative or abstract graphics
- Avoid using figurative or abstract graphics

【Technical Specifications】
- Dimensions: 600px × 300px (viewBox="0 0 600 300")
- Format: Pure SVG code (no external resource references)
- Compatibility: Ensure proper display across various sizes

【Design Style Guidelines】
- Minimalist style centered on typography and font design
- Focus on fine-tuning text size, weight, and spacing
- Create hierarchy and visual focus through text itself
- May add simple decorative elements such as lines, geometric shapes, etc.
- Avoid using figurative or complex abstract elements

【Content Points】
- Use carefully selected titles and subtitles to convey core study content
- Primarily text-based layout, supplemented by simple decorative elements
- Create clear visual hierarchy with focused attention
- Choose color schemes that coordinate with the report theme
- Ensure text is clear and readable while maintaining design appeal

【Technical Implementation Requirements】
- Correctly set viewBox="0 0 600 300"
- Include preserveAspectRatio="xMidYMid meet" attribute
- Use relative coordinates and proportions, avoid fixed pixel values
- Optimize SVG code for efficient rendering
- Remove redundant or unnecessary attributes and elements

Your response should contain only ready-to-use SVG code, starting with <svg and ending with </svg>.
`;

export const reportCoverPrologue = ({
  locale,
  analyst,
  instruction,
}: {
  locale: Locale;
  analyst: Analyst;
  instruction: string;
}) =>
  locale === "zh-CN"
    ? `
我的角色是<role>${analyst.role}</role>

研究主题是：

<topic>
${analyst.topic}
</topic>

以下是调研专家的结论：

<studySummary>
${analyst.studySummary}
</studySummary>

${instruction ? `额外指令（在遵循上述核心要求的基础上）：\n\n<instruction>\n${instruction}\n</instruction>\n` : ""}

请直接输出完整SVG代码，从<svg开始到</svg>结束，不要包含任何解释、前言或markdown标记。
`
    : `
My role is <role>${analyst.role}</role>

The study topic is:

<topic>
${analyst.topic}
</topic>

Here is the study expert's conclusion:

<studySummary>
${analyst.studySummary}
</studySummary>

${instruction ? `Additional instructions (while following the core requirements above):\n\n<instruction>\n${instruction}\n</instruction>\n` : ""}

Please directly output complete SVG code, starting with <svg and ending with </svg>, without any explanations, preface, or markdown formatting.
`;
// 这里本来放了 report.onePageHTML 作为输入，但请求 litellm 的时候好像会被阿里云防火墙 block，先去掉
