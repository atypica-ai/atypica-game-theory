import { Locale } from "next-intl";

export const sharedTechnicalSpecs = ({ locale }: { locale: Locale }) =>
  locale === "zh-CN"
    ? `
【核心设计哲学：越不AI越AI】
用最有力的人性化方式，呈现最智能的洞察。

我们研究的是人、模拟的是人、服务的是理解人。所以报告的视觉语言应该用成熟的专业手法（编辑设计、建筑摄影美学）而非廉价的科技感陈词滥调（霓虹渐变、3D渲染、浮夸特效）。

**关键原则**：
- 真实大于合成，但要有戏剧性 - 避免合成感的塑料质感，拥抱有力量的视觉呈现
- 力量和深度 - 既有视觉冲击力，又经得起细看
- 专业但不疏远 - McKinsey的严谨 + 人类学的人文关怀
- 色彩作为戏剧，不是装饰 - 有目的的戏剧性对比，而非无意义的彩色点缀

**配色策略**：
- 黑、白、灰作为基础，可选单一强调色（深蓝、炭灰、暖棕）
- 严禁大面积彩色卡片、背景色块、粗大彩色边框
- 排版克制不等于压制所有色彩 - 摄影内容可以有完整的电影化色彩
- 克制体现在版式和结构，不是把一切都变成灰色

**排版层级**：
- 通过字重建立层级（Regular → Medium → Bold），不靠颜色
- 通过字号表示重要性，通过留白创造呼吸感
- 最好的排版应该隐形，直到需要阅读时毫不费力

**信息密度与阅读效率**：
- 布局要紧凑，确保一屏内有足够的信息量，不要过度留白导致"一眼看不到什么"
- 但紧凑不等于密密麻麻 - 要有清晰的视觉分组和适度的呼吸空间
- 目标是高阅读效率：读者能快速扫视并抓住要点，深入阅读时又不感到拥挤
- 段落间距、标题间距要适中，既有区隔又不浪费空间

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
【Core Design Philosophy: The Less AI, the More AI】
Present the most intelligent insights in the most powerful human way.

We study people, simulate people, and serve the understanding of people. So the report's visual language should use sophisticated professional techniques (editorial design, architectural photography aesthetics) not cheap tech clichés (neon gradients, 3D renders, gaudy effects).

**Key Principles**:
- Real over synthetic, but with drama - avoid the plastic feel of composites, embrace powerful visual presentation
- Power and depth - both visual impact and substance that rewards closer examination
- Professional but not distant - McKinsey's rigor + anthropological humanistic care
- Color as drama, not decoration - purposeful dramatic contrast, not meaningless colorful accents

**Color Strategy**:
- Black, white, gray as foundation, optional single accent color (deep blue, charcoal, warm brown)
- Strictly forbid large colored cards, background blocks, thick colored borders
- Restrained layout doesn't mean suppressing all color - photographic content can have full cinematic color
- Restraint is in layout and structure, not turning everything gray

**Typography Hierarchy**:
- Build hierarchy through font weight (Regular → Medium → Bold), not color
- Size indicates importance, whitespace creates breathing room
- The best typography should be invisible until you need to read it, then effortless

**Information Density & Reading Efficiency**:
- Layout should be compact, ensuring sufficient information per screen - avoid excessive whitespace that makes "nothing visible at a glance"
- But compact ≠ cramped - maintain clear visual grouping and moderate breathing space
- Goal is high reading efficiency: readers can quickly scan and grasp key points, yet feel comfortable when reading deeply
- Paragraph spacing and heading spacing should be moderate - distinct yet space-efficient

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
- Use Tailwind CSS for responsive layouts
- Optimize layouts for different screen sizes
- All styles and content should be contained within a single HTML file
- No external image links or resources (except image generation API)
- Avoid generating invalid links and URLs
- Do not use complex CSS charts or visualizations
- Do not include date information in the report opening

Your response should contain only ready-to-use HTML code, starting with <!DOCTYPE html>.
`;
