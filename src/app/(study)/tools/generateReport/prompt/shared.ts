import { Locale } from "next-intl";

export const sharedTechnicalSpecs = ({ locale }: { locale: Locale }) =>
  locale === "zh-CN"
    ? `
【核心设计哲学：用少创造视觉冲击】
目标：创造吸引眼球、美观、有视觉震撼力的报告。

少即是多 - 通过有限的颜色、精准的排版、强烈的对比，创造高级感和视觉冲击力。

**颜色策略**（创造对比与聚焦）：
- **文字颜色**：全部单色（黑或深灰），创造统一的阅读基线
- **品牌色**：选择一个强有力的品牌色，用于关键元素（边框、图标、背景装饰）
  - 品牌色的作用：吸引注意力、建立视觉焦点、创造品牌印象
  - 使用位置：关键数据、重要节点、视觉引导
- **背景氛围**：用抽象图形背景（天空、自然、渐变）营造视觉吸引力
  - 颜色明亮、饱和度低，不干扰阅读
  - 创造空间感和呼吸感
- **避免**：彩色文字（降低可读性）、多色混杂（降低品牌感）、粗边框（显得笨重）

**排版艺术**（创造视觉节奏与张力）：
- **字号对比**：大胆的尺寸落差创造视觉冲击（标题 vs 正文）
- **字重变化**：Regular/Medium/Bold 创造层级和重点
- **字体混搭**：无衬线（现代）+ 衬线（优雅）创造视觉趣味
- **留白节奏**：紧凑与宽松交替，创造呼吸感和阅读节奏
- **图形语言**：用单色 SVG 几何图形（圆、方、三角、线条）替代 emoji，保持现代感
- **细节精致**：细边框（1px）+ 小圆角（4-8px）体现精致感

**视觉吸引力**（创造第一印象）：
- **抽象插图**：扁平、几何、有设计感的插图吸引眼球
- **背景设计**：用渐变、光影、抽象形状创造氛围和深度
- **空间层次**：通过透明度、阴影、边框创造空间感
- **视觉焦点**：用品牌色、尺寸、留白引导视线

**开篇冲击力**（第一屏决定一切）：
- 用叙事张力抓住注意力：悬念、冲突、意外发现
- 首屏必须视觉震撼：大标题、关键数据、吸引人的配图
- 直接切入最有价值的洞察，不要铺垫

**Tailwind CSS 精准控制**：
- 用 Tailwind 实现精确的间距、对齐、响应式
- 通过 utility classes 控制排版节奏和视觉层次
- 保持设计的一致性和可预测性

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
【Core Design Philosophy: Create Visual Impact with Less】
Goal: Create eye-catching, beautiful, visually striking reports.

Less is more - through limited colors, precise typography, and strong contrast, create sophistication and visual impact.

**Color Strategy** (Create Contrast & Focus):
- **Text color**: All monochrome (black or dark gray), creating unified reading baseline
- **Brand color**: Choose one powerful brand color for key elements (borders, icons, background accents)
  - Purpose: attract attention, establish visual focus, create brand impression
  - Usage: key data, important nodes, visual guidance
- **Background atmosphere**: Use abstract graphic backgrounds (sky, nature, gradients) to create visual appeal
  - Bright colors, low saturation, don't interfere with reading
  - Create spatial sense and breathing room
- **Avoid**: Colored text (reduces readability), mixed colors (reduces brand coherence), thick borders (looks heavy)

**Typography Art** (Create Visual Rhythm & Tension):
- **Size contrast**: Bold size differences create visual impact (headings vs body)
- **Weight variation**: Regular/Medium/Bold create hierarchy and emphasis
- **Typeface mixing**: Sans-serif (modern) + Serif (elegant) create visual interest
- **Whitespace rhythm**: Alternate between compact and spacious, create breathing and reading rhythm
- **Graphic language**: Use monochrome SVG geometric shapes (circles, squares, triangles, lines) instead of emoji, maintain modern feel
- **Refined details**: Thin borders (1px) + small radius (4-8px) convey refinement

**Visual Appeal** (Create First Impression):
- **Abstract illustrations**: Flat, geometric, design-forward illustrations attract eyes
- **Background design**: Use gradients, lighting, abstract shapes to create atmosphere and depth
- **Spatial layers**: Create spatial sense through opacity, shadows, borders
- **Visual focus**: Guide sight lines with brand color, size, whitespace

**Opening Impact** (First Screen Decides Everything):
- Use narrative tension to grab attention: suspense, conflict, unexpected discoveries
- First screen must be visually striking: large headlines, key data, compelling visuals
- Lead directly with most valuable insights, no setup

**Tailwind CSS Precision Control**:
- Use Tailwind for precise spacing, alignment, responsiveness
- Control typography rhythm and visual hierarchy through utility classes
- Maintain design consistency and predictability

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
