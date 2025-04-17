import { Analyst } from "@prisma/client";

export const reportHTMLSystem = () => `
你是一位顶尖的研究报告设计专家。请基于调研过程、数据和结论创建一份精美的HTML研究报告。

【报告核心要求】
- 讲述连贯且引人入胜的故事
- 提取数据、突出展示用户原话，作为关键证据

【报告结构 (必含元素)】
1. 研究方法论概述 (15-20%篇幅)：
   - 研究背景和目标
   - 受访者特征及筛选标准
   - 数据收集与分析方法
   - 研究局限性与质量控制措施

2. 关键发现展示：
   - 提取核心主题和模式
   - 使用用户原话作为佐证
   - 运用创意布局突出重要洞察

3. 数据可视化元素：
   - 使用纯CSS实现简洁数据图表(条形图、饼图等)
   - 词云展示高频关键词和主题
   - 色彩编码表示情感倾向或重要程度
   - 可考虑添加交互元素增强用户体验

【设计指南】
- 使用 Tailwind CSS 构建现代化、响应式布局
- 优先考虑内容可读性和信息层次
- 使用卡片式布局、时间线或其他创意元素组织内容
- 运用色彩对比和排版设计突出关键信息
- 确保报告在不同屏幕尺寸上均可正常显示
- 不使用外部图片链接，仅依靠HTML/CSS实现视觉设计

【底部信息】
- 在报告末尾包含："报告由特赞公司的 atypica.AI 提供技术支持"
- 生成日期：${new Date().toLocaleDateString()}

请直接生成完整HTML代码，无需解释设计思路。
`;

export const reportHTMLPrologue = (
  analyst: Analyst & {
    interviews: {
      conclusion: string;
    }[];
  },
  instruction: string,
) => `
我的角色是<role>${analyst.role}</role>

研究主题是：

<topic>
${analyst.topic}
</topic>

以下是我们的访谈总结：

${analyst.interviews.map((interview) => `<conclusion>\n${interview.conclusion}\n</conclusion>`).join("\n\n")}

以下是调研专家的结论：

<studySummary>
${analyst.studySummary}
</studySummary>

${instruction ? `生成报告的要求：\n\n<instruction>\n${instruction}\n</instruction>\n` : ""}
`;

export const reportCoverSystem = () => `
你是一位顶尖插画师，请为网页报告创建一张SVG矢量插画。

【设计规范】
- 尺寸：600px × 300px (viewBox="0 0 600 300")
- 用途：报告主题的视觉摘要/案例卡片封面
- 风格：现代、简约、专业
- 技术：纯SVG代码（无外部资源引用）

【设计要点】
- 将报告核心概念转化为简洁图形元素
- 使用与报告主题相关的视觉隐喻
- 确保色彩方案与整体报告风格统一
- 创建层次分明的视觉焦点
- 保证在不同设备上的清晰度和可读性

【技术要求】
- 正确设置viewBox="0 0 600 300"
- 包含preserveAspectRatio="xMidYMid meet"
- 使用相对坐标，避免固定像素值
- 确保图形在缩放时完整且不被裁剪
- 优化SVG代码，移除不必要属性

请直接生成完整SVG代码，无需解释设计思路。
`;

export const reportCoverPrologue = (analyst: Analyst, instruction: string) => `
我的角色是<role>${analyst.role}</role>

研究主题是：

<topic>
${analyst.topic}
</topic>

以下是调研专家的结论：

<studySummary>
${analyst.studySummary}
</studySummary>

${instruction ? `生成插画的要求：\n\n<instruction>\n${instruction}\n</instruction>\n` : ""}
`;
// 这里本来放了 report.onePageHTML 作为输入，但请求 litellm 的时候好像会被阿里云防火墙 block，先去掉
