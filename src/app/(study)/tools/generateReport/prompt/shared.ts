import { Locale } from "next-intl";

export const sharedTechnicalSpecs = ({ locale }: { locale: Locale }) =>
  locale === "zh-CN"
    ? `
【核心设计哲学：排版即设计】
设计的力量来自字体，不是颜色。通过字号大小、加粗、斜体、衬线/无衬线的对比来建立所有层级和重点。颜色要少而精。

**第一原则：颜色极度克制**
- 文字颜色只有两种：黑色(#1a1a1a)和灰色(#6b7280)，绝不使用彩色文字
- 最多选择一个品牌色，用于少量非文字装饰：细边框(border-left)、时间线节点、图标填充、偶尔的小面积背景点缀
- 品牌色绝不用于：文字颜色、大段文字的背景
- 背景主要用白色(#ffffff)和极浅灰(#f9fafb/#f3f4f6)，品牌色背景只在关键位置偶尔出现且透明度要低(5%-8%)
- 整个报告的视觉是"以黑白灰为主体，品牌色作为克制的点睛"

**第二原则：字体建立全部层级**
字体方案（必须严格执行）：
- 标题/大数据：font-family: Georgia, 'Noto Serif SC', 'Source Han Serif SC', serif — 衬线体传达权威和印刷质感
- 正文/说明：font-family: system-ui, -apple-system, 'PingFang SC', sans-serif — 无衬线体保证可读性
- 数据/引用来源：font-family: 'SF Mono', 'JetBrains Mono', monospace — 等宽体传达精确感
- 禁止：Inter、Roboto、Arial 等泛用字体

层级完全通过字体属性区分（不靠颜色）：
- 核心冲击：text-5xl/text-6xl + serif + font-bold — 首屏大标题、震撼性数据
- 章节标题：text-3xl + serif + font-semibold — 清晰分界
- 小节标题：text-xl + sans-serif + font-bold — 内容导航
- 正文：text-base + sans-serif + font-normal — 舒适阅读
- 辅助：text-sm + sans-serif + text-gray-500 — 来源标注、脚注
- 强调：font-bold 或 italic，不用颜色来强调
- 禁止使用 text-lg、text-2xl 等中间值（Pull Quote 可用 text-xl italic serif）

**第三原则：用图形语言替代颜色装饰**
- 用单色(黑/深灰) SVG 几何图形（圆、方、三角、线条）替代 emoji
- 分隔线：细线 border-t border-gray-200（1px），不用粗线
- 边框：细边框 border(1px)，小圆角 rounded(4px) 或 rounded-md(6px)
- 绝不使用 rounded-xl/rounded-2xl（太圆显得廉价）
- 绝不使用 shadow-lg/shadow-xl（悬浮感太重），最多 shadow-sm
- 引用标记：border-left 2px 品牌色 + italic，这是品牌色为数不多的出现位置

**第四原则：留白是最重要的设计元素**
- 页面容器：max-w-5xl mx-auto
- 章节之间：py-16（64px）大留白，让读者的眼睛休息
- 段落之间：适度间距，不要拥挤也不要过散
- 首屏：大标题(text-5xl serif) + 大留白 + 一句话副标题，不要堆砌
- 视觉节奏：密集信息区 → 大留白 → 冲击性洞察(大字号) → 支撑细节 → 大留白...
- 标题 tracking-tight，正文 leading-relaxed(1.75)

**第五原则：如果需要插图和背景**
- 背景：用抽象图形（天空、自然、渐变色等），颜色明亮，饱和度低，不干扰阅读
- 插图：用扁平、几何、抽象的插画，不要写实照片
- 插图颜色也要克制，以黑白灰为主，可以有少量品牌色点缀

**❌ 必须避免的模式**：
- 彩色背景色块（每个 section 不同颜色 = 幼儿园墙）
- 品牌色文字（文字只能是黑色或灰色）
- 品牌色大面积高饱和度背景（品牌色背景只能低透明度、小面积、偶尔出现）
- 标题和正文字号差距太小（必须至少 2 倍差距）
- emoji 当图标（🔵🟢🔴❌✅）
- 圆角卡片 + 大阴影堆叠
- 蓝紫渐变 + 白色文字
- 所有信息等宽等距没有主次

**✅ 追求的质感**：
- 打开一本精心排版的书 — 留白、字体层级、克制的用色就是全部设计语言
- McKinsey/Bain 咨询报告 — 专业感来自排版克制而非颜色花哨
- Monocle/Kinfolk 杂志 — 大胆留白 + 精致的字体细节

**最低视觉标准**（生成报告时自查）：
1. 主标题是否用了 serif 字体？是否 >= 3rem（text-5xl）？
2. 标题和正文的字号差距是否 >= 2 倍？
3. 文字是否只有黑(#1a1a1a)和灰(#6b7280)两种颜色？
4. 品牌色是否仅用于细边框、节点等非文字小元素？
5. 章节之间是否有足够留白（>= py-16）？
6. 是否避免了所有彩色背景色块？
7. 用户引用是否用了 italic + 比正文大的字号 + border-left？

【图片生成策略】
当报告需要达到以下目的时，你需要生成相应类型的图片；否则，不生成图片。
- 实物参考：图像展示读者需要亲眼看到的内容（产品、界面截图、地点、人物等）。生成产品概念可视化、包装设计展示（无品牌或假想品牌）。
- 氛围营造：图像建立报告的情感基调，传递严肃、活力、温度、质感或其他氛围。生成提供情绪/氛围感/装饰性的抽象插图。
  eg: "Abstract emotional topology: soft drifting gradients, fractured signal ribbons, tiny pixel silhouettes appearing and dissolving at edges, no text, .."
  eg: "Two parallel decision rails in a minimal system space: one deterministic rail with rigid geometry, one adaptive rail with organic flowing paths, no text, .."
报告中的图片经常会让读者对报告内容产生误解（比如生成人物的人种；IP；品牌信息；图表等），因此必须遵守：
- 严格禁止：绘制人物、流程图、架构图、复杂的技术图表等
- **严格禁止**：绝对禁止使用图片生成API生成任何图表、表格、数据可视化、统计图、流程图等需要基于真实数据的内容。图片生成API无法输入可信数据源，生成的图表会包含虚假数据，具有误导性。
- 在提示词中不要包含品牌/IP/人物等名称

报告中生成图片的语法：\`<img src="/api/imagegen/[英文提示词]?ratio=[比例]" alt="[描述]" class="[样式]" />\`
- **重要**：英文提示词必须使用自然语言（如 "Abstract minimalist concept"），不要进行 URL 编码（不要写成 "Abstract%20minimalist%20concept"）
- 必须限制最大宽度为100%，使用 max-w-full 或 style="max-width: 100%"
- 图片数量最多1张，不要让图片主导页面
- 英文提示词撰写规范：
  - 使用专业视觉艺术术语，比例：square/landscape/portrait
  - 用专业详细的语言包含以下内容：1. 风格；2. 图片描述；3. 图片目的/类型；4. 禁止/注意

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
【Core Design Philosophy: Typography IS Design】
Design power comes from fonts, not colors. Establish all hierarchy and emphasis through font size, weight, italic, serif/sans-serif contrast. Use color sparingly and precisely.

**Principle 1: Extreme Color Restraint**
- Text colors only two kinds: black (#1a1a1a) and gray (#6b7280). Never use colored text.
- Choose at most one brand color, used only for sparse non-text decoration: thin borders (border-left), timeline nodes, icon fills, occasional small-area background accents
- Brand color NEVER used for: text color, backgrounds behind large blocks of text
- Backgrounds primarily white (#ffffff) and very light gray (#f9fafb/#f3f4f6). Brand color backgrounds only appear occasionally at key positions with low opacity (5%-8%)
- The overall visual should be "restrained palette with brand color as a precise accent"

**Principle 2: Font Establishes All Hierarchy**
Font scheme (must follow strictly):
- Headlines/Key data: font-family: Georgia, 'Noto Serif SC', 'Source Han Serif SC', serif — serif conveys authority and print quality
- Body/Descriptions: font-family: system-ui, -apple-system, 'PingFang SC', sans-serif — sans-serif ensures readability
- Data/Citations: font-family: 'SF Mono', 'JetBrains Mono', monospace — monospace conveys precision
- FORBIDDEN: Inter, Roboto, Arial or other generic fonts

Hierarchy established entirely through font properties (not color):
- Core impact: text-5xl/text-6xl + serif + font-bold — hero headlines, striking data
- Section titles: text-3xl + serif + font-semibold — clear division
- Subsection titles: text-xl + sans-serif + font-bold — content navigation
- Body: text-base + sans-serif + font-normal — comfortable reading
- Auxiliary: text-sm + sans-serif + text-gray-500 — source citations, footnotes
- Emphasis: font-bold or italic, not color
- FORBIDDEN: text-lg, text-2xl and other in-between sizes (Pull Quotes may use text-xl italic serif)

**Principle 3: Graphic Language Replaces Color Decoration**
- Use monochrome (black/dark gray) SVG geometric shapes (circles, squares, triangles, lines) instead of emoji
- Dividers: thin line border-t border-gray-200 (1px), no thick lines
- Borders: thin border (1px), small border-radius rounded (4px) or rounded-md (6px)
- NEVER use rounded-xl/rounded-2xl (too round, looks cheap)
- NEVER use shadow-lg/shadow-xl (too much floating effect), shadow-sm at most
- Quote marks: border-left 2px brand color + italic — one of the few places brand color appears

**Principle 4: Whitespace is the Most Important Design Element**
- Page container: max-w-5xl mx-auto
- Between sections: py-16 (64px) generous whitespace, let readers' eyes rest
- Between paragraphs: moderate spacing, not cramped or too loose
- Hero: large title (text-5xl serif) + generous whitespace + one-line subtitle, don't pile up elements
- Visual rhythm: dense information zone → large whitespace → striking insight (large type) → supporting details → large whitespace...
- Titles tracking-tight, body leading-relaxed (1.75)

**Principle 5: Illustrations and Backgrounds (If Needed)**
- Backgrounds: use abstract shapes (sky, nature, gradients), bright colors, low saturation, don't interfere with reading
- Illustrations: use flat, geometric, abstract illustrations, no realistic photos
- Illustration colors should also be restrained, primarily neutral tones with minimal brand color accents

**❌ Patterns to AVOID**:
- Colored background blocks (different color per section = kindergarten wall)
- Brand color text (text can only be black or gray)
- Brand color large-area high-saturation backgrounds (brand color backgrounds must be low opacity, small area, occasional)
- Title and body font sizes too close (must be at least 2x gap)
- Emoji as icons (🔵🟢🔴❌✅)
- Rounded cards + large shadow stacking
- Blue-purple gradient + white text
- All information equal width/spacing with no priority

**✅ Quality Benchmarks**:
- A carefully typeset book — whitespace, font hierarchy, and restrained color IS the entire design language
- McKinsey/Bain consulting reports — professionalism from typographic restraint, not flashy colors
- Monocle/Kinfolk magazine — bold whitespace + refined font details

**Minimum Visual Standards** (self-check when generating reports):
1. Does the hero title use serif font? Is it >= 3rem (text-5xl)?
2. Is the font size gap between title and body >= 2x?
3. Is text limited to only black (#1a1a1a) and gray (#6b7280)?
4. Is brand color used only for thin borders, nodes, and other small non-text elements?
5. Is there sufficient whitespace between sections (>= py-16)?
6. Are all colored background blocks avoided?
7. Do user quotes use italic + larger-than-body font size + border-left?

【Image Generation Strategy】
When the report needs to achieve the following purposes, you NEED to generate the corresponding type of image; otherwise, do not generate images.
- Concrete reference — the image shows something the reader needs to actually see to understand or verify (a product, a UI screenshot, a physical location, a face). Generate product concept visualizations, packaging design displays (no brand or hypothetical brand).
- Mood / tone-setting — the image establishes the emotional register of the report, signaling seriousness, energy, warmth, prestige, or other atmosphere. Generate abstract illustrations that provide mood/atmosphere/decorative value.
  eg: "Abstract emotional topology: soft drifting gradients, fractured signal ribbons, tiny pixel silhouettes appearing and dissolving at edges, no text, .."
  eg: "Two parallel decision rails in a minimal system space: one deterministic rail with rigid geometry, one adaptive rail with organic flowing paths, no text, .."
Images in reports often mislead readers (e.g., generated people's ethnicity; IP; brand information; charts, etc.), so the following must be followed:
- Strictly prohibit: drawing people, flowcharts, architecture diagrams, complex technical charts, etc.
- **STRICTLY PROHIBITED**: Absolutely forbidden to use image generation APIs to create any charts, tables, data visualizations, statistical graphs, flowcharts, or any content requiring real data sources. Image generation APIs cannot accept trusted data sources; generated charts would contain false data and be misleading.
- Do not include brand/IP/person names in prompts

Syntax for generating images in reports: \`<img src="/api/imagegen/[English prompt]?ratio=[ratio]" alt="[description]" class="[styles]" />\`
- Must limit maximum width to 100% using max-w-full or style="max-width: 100%"
- Maximum 1 image, do not let images dominate the page
- English prompt writing guidelines:
  - Use professional visual art terminology, ratios: square/landscape/portrait
  - Include the following in professional, detailed language: 1. Style; 2. Image description; 3. Image purpose/type; 4. Prohibitions/notes

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
