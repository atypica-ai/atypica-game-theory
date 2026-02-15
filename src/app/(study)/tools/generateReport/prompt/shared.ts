import { Locale } from "next-intl";

export const sharedTechnicalSpecs = ({ locale }: { locale: Locale }) =>
  locale === "zh-CN"
    ? `
【核心设计哲学：克制的专业主义】
用最克制的视觉语言，呈现最有力的洞察。

**颜色使用规范**：
- **文字**：全部单色（黑或深灰），绝不用彩色
- **品牌色**：最多一个，仅用于非文字元素（边框、图形、背景装饰）
- **背景**：白色或极浅灰为主，局部可用抽象图形（明亮、低饱和度）
- **严禁**：彩色文字、大面积色块、粗边框、高饱和度颜色

**排版与层级**：
- 用字号、粗细（Regular/Medium/Bold）、字体类型（无衬线/衬线）、倾斜建立层级
- 不依赖颜色区分层级
- 用单色 SVG 图形替代 emoji（简单几何、线条风格）
- 细边框（1px）+ 小圆角（4-8px）
- 紧凑布局，适度留白

**视觉元素**：
- 插图：扁平、几何、抽象风格，避免写实
- 背景：抽象图形（天空、自然、渐变），颜色柔和
- 透明度控制，背景不抢内容

**开篇设计方法**：
- 运用叙事张力：建立信息落差和阅读期待
- 首屏内容选择：优先最具冲击力和价值的洞察
- 避免线性铺陈：跳过背景铺垫，直接切入核心

【视觉内容增强】
- 仅在特定场景下生成配图：创意设计、产品概念、包装设计、品牌视觉概念等
- 严格禁止：绘制人物、流程图、架构图、复杂的技术图表等
- **严格禁止**：绝对禁止使用图片生成API生成任何图表、表格、数据可视化、统计图、流程图等需要基于真实数据的内容。图片生成API无法输入可信数据源，生成的图表会包含虚假数据，具有误导性。
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
- 使用 Tailwind CSS 构建响应式布局
- 为不同屏幕尺寸优化布局
- 所有样式和内容都应在单一HTML文件内完成
- 不使用外部图片链接和资源（图片生成API除外）
- 避免生成无效链接和URL
- 不使用复杂的CSS图表或可视化
- 报告正文开篇不要包含日期信息

你的回复应该只包含可直接使用的HTML代码，从<!DOCTYPE html>开始。
`
    : `
【Core Design Philosophy: Restrained Professionalism】
Use the most restrained visual language to present the most powerful insights.

**Color Usage Guidelines**:
- **Text**: Monochrome only (black or dark gray), never colored text
- **Brand accent**: Maximum one color, only for non-text elements (borders, graphics, backgrounds)
- **Backgrounds**: White or very light gray primary, abstract graphics optional (bright, low saturation)
- **Forbidden**: Colored text, large color blocks, thick borders, high saturation

**Typography & Hierarchy**:
- Use size, weight (Regular/Medium/Bold), typeface (sans-serif/serif), italics to establish hierarchy
- Never rely on color for hierarchy
- Replace emoji with monochrome SVG graphics (simple geometric, line-based style)
- Thin borders (1px) + small radius (4-8px)
- Compact layout, moderate whitespace

**Visual Elements**:
- Illustrations: Flat, geometric, abstract style - avoid photorealism
- Backgrounds: Abstract shapes (sky, nature, gradients), soft colors
- Control opacity, backgrounds never overpower content

**Opening Design Method**:
- Apply narrative tension: create information gaps and reading anticipation
- Content prioritization: lead with highest-impact insights
- Avoid linear exposition: skip setup, go straight to core

【Visual Content Enhancement】
- Generate illustrations only in specific scenarios: creative design, product concepts, packaging design, brand visual concepts, etc.
- Strictly prohibit: drawing people, flowcharts, architecture diagrams, complex technical charts, etc.
- **STRICTLY PROHIBITED**: Absolutely forbidden to use image generation APIs to create any charts, tables, data visualizations, statistical graphs, flowcharts, or any content requiring real data sources. Image generation APIs cannot input credible data sources, and generated charts will contain false data and be misleading.
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
- Use Tailwind CSS for responsive layouts
- Optimize layouts for different screen sizes
- All styles and content should be contained within a single HTML file
- No external image links or resources (except image generation API)
- Avoid generating invalid links and URLs
- Do not use complex CSS charts or visualizations
- Do not include date information in the report opening

Your response should contain only ready-to-use HTML code, starting with <!DOCTYPE html>.
`;
