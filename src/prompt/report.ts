import { Analyst } from "@prisma/client";
import { promptSystemConfig } from "./systemConfig";

export const reportHTMLSystem = () => `${promptSystemConfig()}
你是一位顶尖的研究报告设计专家。请基于调研过程、数据和结论创建一份精美的HTML研究报告。
你应理解并运用原研哉（Kenya Hara）的设计哲学——"白"的概念、留白的力量、以及通过克制达到的视觉纯净。这种设计追求的不是装饰，而是本质与感知的清晰度。

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
  - 使用纯CSS实现极简数据图表:
    - 优先考虑线条和几何形状的纯粹表达
    - 避免过度的装饰和渐变
    - 使用留白作为数据对比的视觉元素
    - 确保可视化元素中的文本标签使用与报告主体相同的语言
  - 词云展示高频关键词和主题，保持空间的呼吸感
  - 色彩编码克制使用，主要通过黑白灰的深浅变化表达差异
  - 可考虑添加简约而优雅的交互元素，遵循"less, but better"原则
  - 注重数据图表的节奏与整体报告的和谐统一

4. 请根据提供的研究内容和受访者信息，自动调整报告的语言：
   - 如果研究主题和受访者回复主要使用中文，则生成中文报告
   - 如果研究主题和受访者回复主要使用英文，则生成英文报告
   - 对于多语言研究，采用主导语言作为报告语言，但可适当保留原始语言的关键引用
   - 保持整个报告语言的一致性，包括标题、图表标签和结论

【设计指南】
- 采用原研哉设计风格核心理念：
  - 留白（"emptiness"）作为设计要素，创造宁静和视觉呼吸空间
  - 极简主义，追求本质而非装饰
  - 注重材质感和细微变化的表达（通过CSS实现纸张质感）
  - 高对比度的黑白为主色，辅以极少量的点缀色
- 使用 Tailwind CSS 构建响应式布局
- 精心设计排版层次：
  - 使用无衬线字体（如Helvetica或Noto Sans）
  - 精确控制行高和字间距
  - 标题采用更大的字重差异而非过度的尺寸变化
  - 针对不同语言特性调整排版（中文字间距较小，英文需注意断词）
- 使用卡片式布局、时间线或其他创意元素组织内容，但保持克制
- 确保报告在不同屏幕尺寸上均可正常显示
- 不使用外部图片链接，仅依靠HTML/CSS实现视觉设计
- 重视对称性与网格系统，创造秩序感

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

请分析以上内容中使用的主要语言（中文/英文/其他），并使用同样的语言创建报告。保持整个报告的语言一致性。

${instruction ? `额外指令（在遵循上述核心要求的基础上）：\n\n<instruction>\n${instruction}\n</instruction>\n` : ""}
`;

export const reportCoverSystem = () => `
你是一位顶尖插画师，请为网页报告创建一张SVG矢量插画。

【设计规范】
- 尺寸：600px × 300px (viewBox="0 0 600 300")
- 用途：报告主题的视觉摘要/案例卡片封面
- 风格：严格遵循原研哉设计美学：
  - 极致的简约与留白
  - 追求"白"的纯净感和空间感
  - 注重几何形状的平衡与精确
  - 使用微妙的线条变化传达深度
  - 避免过度装饰和不必要的复杂性
- 技术：纯SVG代码（无外部资源引用）

【设计要点】
- 将报告核心概念转化为简洁图形元素
- 使用与报告主题相关的视觉隐喻
- 确保色彩方案与整体报告风格统一
- 创建层次分明的视觉焦点
- 保证在不同设备上的清晰度和可读性
- 图形元素的设计应考虑文化语境，确保视觉隐喻对目标受众有效

【技术要求】
- 正确设置viewBox="0 0 600 300"
- 包含preserveAspectRatio="xMidYMid meet"
- 使用相对坐标，避免固定像素值
- 确保图形在缩放时完整且不被裁剪
- 优化SVG代码，移除不必要属性

请直接生成完整SVG代码，无需解释设计思路。
设计应充分体现原研哉的"白"（emptiness）概念，通过克制和精确的图形语言传达深层含义，而非表面的装饰性。
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

请分析以上内容中使用的主要语言（中文/英文/其他），并使用同样的语言创建插画。

${instruction ? `额外指令（在遵循上述核心要求的基础上）：\n\n<instruction>\n${instruction}\n</instruction>\n` : ""}
`;
// 这里本来放了 report.onePageHTML 作为输入，但请求 litellm 的时候好像会被阿里云防火墙 block，先去掉
