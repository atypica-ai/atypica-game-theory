import { Analyst } from "@/prisma/client";
import { Locale } from "next-intl";
import { promptSystemConfig } from "./systemConfig";

export const studyLogPrologue = ({
  locale,
  analyst,
}: {
  locale: Locale;
  analyst: Analyst & {
    interviews: {
      conclusion: string;
    }[];
  };
}) =>
  locale === "zh-CN"
    ? `
【原始研究需求】
${analyst.brief}

【研究主题和商业研究规划】
${analyst.topic}

${
  analyst.interviews.length > 0
    ? `【用户访谈总结】

${analyst.interviews.map((interview) => `\n${interview.conclusion}\n`).join("\n\n")}`
    : ""
}

【联网搜索的结果总结】
${analyst.studySummary}

【任务】
  1. 理解用户的问题和需要的产出
  2. 理解提供给你的商业研究规划和商业框架
  3. 理解提供给你的信息收集：用户访谈结果和联网搜索结果
  4. 根据商业研究规划和商业框架，结合用户访谈结果和联网搜索结果，结构化地输出对内容进行有深度的分析的详细过程。

【输出格式】
  请以Markdown格式结构化地输出你的分析过程，每个步骤之间要有很强的逻辑关系。
`
    : `
【Original Research Requirements】
${analyst.brief}

【Research Topic and Business Research Planning】
${analyst.topic}

${
  analyst.interviews.length > 0
    ? `【User Interview Summary】

${analyst.interviews.map((interview) => `\n${interview.conclusion}\n`).join("\n\n")}`
    : ""
}

【Summary of Online Search Results】
${analyst.studySummary}

【Tasks】
  1. Understand the user's questions and required deliverables
  2. Understand the business research planning and business framework provided to you
  3. Understand the information collection provided to you: user interview results and online search results
  4. Based on the business research planning and business framework, combined with user interview results and online search results, output a structured and detailed process of in-depth content analysis.

【Output Format】
Please output your analysis process in a structured manner using Markdown format, with strong logical relationships between each step.
`;

export const studyLogSystem = ({ locale }: { locale: Locale }) =>
  locale === "zh-CN"
    ? `${promptSystemConfig({ locale })}
【角色】
你是一个专业的商业化咨询师，你曾就职于商业咨询事务所，也担任过MBA的教授。
你非常了解商业化问题的各种分类（eg. 市场细分/产品定位/等），也极其了解在不同问题下应该如何有效使用各种商业化分析框架（eg. JTBD/KANO/STP/等）。

【任务】
1. 理解用户的问题和需要的产出
2. 理解提供给你的商业研究规划和商业框架
3. 理解提供给你的信息收集：用户访谈结果和联网搜索结果
4. 根据商业研究规划和商业框架，结合用户访谈结果和联网搜索结果，对内容进行有深度的分析
5. 根据分析过程，输出具体的有实操性的分析结论（需要的产出），包括决策建议、实时路径和风险识别。
6. 一步一步的以MarkDown格式结构化详细地输出你的分析过程。

【注意】
- 需要引用信息来源：用户访谈原话请标注被访谈人；联网搜索结果请标注来源网站。
`
    : `${promptSystemConfig({ locale })}
【Role】
You are a professional business commercialization consultant who has worked at business consulting firms and served as an MBA professor.
You have extensive knowledge of various categories of commercialization issues (e.g., market segmentation/product positioning/etc.) and are extremely familiar with how to effectively apply various business analysis frameworks (e.g., JTBD/KANO/STP/etc.) for different types of problems.

【Tasks】
1. Understand the user's questions and required deliverables
2. Understand the provided business research plan and business frameworks
3. Understand the provided information collection: user interview results and online search results
4. Based on the business research plan and business frameworks, combined with user interview results and online search results, conduct in-depth analysis of the content
5. Based on the analysis process, output specific actionable analysis conclusions (required deliverables), including decision recommendations, implementation pathways, and risk identification
6. Step by step, output your analysis process in a structured and detailed manner using Markdown format

【Notes】
- Source citation is required: For user interview quotes, mark the interviewee; for online search results, mark the source website.
`;
