import { Locale } from "next-intl";

export const sharedTechnicalSpecs = ({ locale }: { locale: Locale }) =>
  locale === "zh-CN"
    ? `
【技术实现要求】
- 使用 Tailwind CSS 构建响应式布局
- 选择易读的字体系统
- 为不同屏幕尺寸优化布局
- 重要发现和数据应突出显示
- 通过合理的留白和间距确保报告易于浏览

【风格实现原则】
- 严格按照指定的风格要求进行设计
- 如果未明确指定风格，使用简洁专业的默认样式
- 确保所选风格与报告内容和目标受众匹配

【视觉内容增强】
- 仅在特定场景下生成配图：创意设计、产品概念、包装设计、品牌视觉概念等
- 严格禁止：绘制人物、流程图、架构图、复杂的技术图表等
- 图片应该与研究发现紧密相关，用于具象化展示设计概念或产品方向
- 每张图片都应有明确的说明文字，解释其与研究内容的关联性
- 专注于简洁的设计元素展示，避免复杂图形
- 图片数量控制适度，避免过多配图影响阅读

【图片生成】
语法：\`<img src="/api/imagegen/[英文提示词]?ratio=[比例]" alt="[描述]" class="[样式]" />\`

图片样式要求：
- 必须限制最大宽度为100%，使用 Tailwind CSS 类 max-w-full 或直接添加 style="max-width: 100%" 内联样式
- 确保图片在不同设备上的响应式显示

图片策略：
- 多元素组合：单张图片可展示产品系列、设计变体、配色组合、多角度视图
- 文字处理原则：如果研究内容需要展示品牌名称、产品标识等文字信息，应在提示词中明确描述；否则专注纯视觉元素：外观、色彩、材质、形状、纹理
- 每张图片需明确说明与研究内容的关联性

英文提示词创作要求（以专业text-to-image艺术家视角）：
- 使用专业的视觉艺术术语和描述方式
- 构建富有层次和细节的画面描述
- 产品相关：包含品牌、类别、关键特征（如"Apple iPhone sleek black metal frame with Apple logo, minimalist design, premium materials"）
- 包装设计：多角度视觉呈现（如"product packaging design, front view and side angle, detailed close-up with brand identity, modern typography"）
- 品牌视觉：体现风格调性（如"modern minimalist aesthetic, blue and white color palette, tech-inspired design language, clean typography"）
- 纯视觉设计：明确说明"no text, pure visual design focus"
- 艺术指导词汇：使用lighting（光影）、composition（构图）、texture（质感）、color harmony（色彩和谐）等专业术语
- 比例：square/landscape/portrait

【技术实现】
- 所有样式和内容都应在单一HTML文件内完成
- 不使用外部图片链接和资源（图片生成API除外）
- 避免生成无效链接和URL
- 不使用复杂的CSS图表或可视化

【底部信息】
- 报告末尾包含："报告由 atypica.AI 提供技术支持"
- 生成日期

你的回复应该只包含可直接使用的HTML代码，从<!DOCTYPE html>开始。
`
    : `
【Technical Implementation Requirements】
- Use Tailwind CSS for responsive layouts
- Choose readable font systems
- Optimize layouts for different screen sizes
- Important findings and data should be prominently displayed
- Ensure report is easy to browse through proper whitespace and spacing

【Style Implementation Guidelines】
- Strictly follow the style requirements specified in the instruction
- If the style is not specified, use a clean and professional default style
- Ensure the selected style matches the report content and target audience

【Visual Content Enhancement】
- Generate illustrations only in specific scenarios: creative design, product concepts, packaging design, brand visual concepts, etc.
- Strictly prohibit: drawing people, flowcharts, architecture diagrams, complex technical charts, etc.
- Images should be closely related to research findings, used to visualize design concepts or product directions
- Each image should have clear explanatory text explaining its relevance to research content
- Focus on simple design element presentation, avoid complex graphics
- Control image quantity appropriately, avoid too many images affecting readability

【Image Generation】
Syntax: \`<img src="/api/imagegen/[English prompt]?ratio=[ratio]" alt="[description]" class="[styles]" />\`

Image Styling Requirements:
- Must limit maximum width to 100% using Tailwind CSS class max-w-full or directly add inline style="max-width: 100%"
- Ensure responsive display across different devices

Image Strategy:
- Multi-element combination: Single image can show product series, design variants, color combinations, multi-angle views
- Text handling principle: If research content requires showing brand names, product identifiers, or other text information, specify clearly in prompt; otherwise focus on pure visual elements: appearance, colors, materials, shapes, textures
- Each image needs clear explanation of its relevance to research content

English Prompt Creation Requirements (Professional Text-to-Image Artist Perspective):
- Use professional visual art terminology and descriptive approaches
- Build layered and detailed scene descriptions
- Product-related: Include brand, category, key features (e.g., "Apple iPhone sleek black metal frame with Apple logo, minimalist design, premium materials, studio lighting")
- Packaging design: Multi-angle visual presentation (e.g., "product packaging design, front view and side angle, detailed close-up with brand identity, modern typography, clean composition")
- Brand visuals: Convey style and tone (e.g., "modern minimalist aesthetic, blue and white color palette, tech-inspired design language, clean typography, balanced composition")
- Pure visual design: Specify "no text, pure visual design focus, emphasis on form and color"
- Artistic direction vocabulary: Use professional terms like lighting, composition, texture, color harmony, visual hierarchy, aesthetic balance
- Ratios: square/landscape/portrait

【Technical Implementation】
- All styles and content should be contained within a single HTML file
- No external image links or resources (except image generation API)
- Avoid generating invalid links and URLs
- Do not use complex CSS charts or visualizations

【Footer Information】
- Include at the end of report: "Report powered by atypica.AI"
- Generation date

Your response should contain only ready-to-use HTML code, starting with <!DOCTYPE html>.
`;
