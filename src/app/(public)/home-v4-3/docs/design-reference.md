# V4-3 设计参考：fin.ai 分析

> 截图保存在同目录下 01-hero.png ~ 14-footer.png

## fin.ai 页面结构

| 屏 | 截图 | 内容 |
|----|------|------|
| 01 | 01-hero.png | Hero: 深色背景 + 衬线大标题 "The #1 AI Agent for all your customer service" + 4个social proof小标签(#1 IN BAKE-OFFS, #1 IN BENCHMARKS...) + 两个CTA按钮 |
| 02 | 02-product-showcase.png | 产品展示: 真实产品UI截图（聊天界面、配置面板、数据图表），密集但有序 |
| 03 | 03-client-logos.png | 客户logo横排: Amplitude, Anthropic, Asana, Aspire, Clay, Coda — 灰白色、统一大小、一行排列 |
| 04 | 04-section.png | **左侧sticky导航出现**: 01 CAPABILITIES ~ 06 PRICING。右侧内容区展示 "Topics Explorer" 数据图 + 下方 1.Train 2.Test 3.Deploy 4.Analyze 四步流程 |
| 05 | 05-section.png | 02 PERFORMANCE 章节: 左侧导航高亮02，右侧展示性能数据图表（柱状图、折线图）+ 大字标题 |
| 06 | 06-section.png | 性能数据续: 具体百分比指标卡片 + 引用块 |
| 07 | 07-section.png | 视频区 + 03 INTEGRATIONS 章节开始: "Fin works with any helpdesk" + 集成logo（Zendesk, Intercom, Gorgias...）|
| 08 | 08-section.png | 集成续: 更多集成选项 + 渠道图标 |
| 09 | 09-section.png | 04 TECHNOLOGY: 技术架构图（AI Engine层次结构图）|
| 10 | 10-section.png | 认证徽章横排 "TRUSTED AND FULLY CERTIFIED" + 05 AI TEAM: "Built by a world-class team of AI experts" |
| 11 | 11-section.png | 团队头像网格 + CTA重复 "Get the #1 AI Agent..." |
| 12 | 12-section.png | 06 PRICING: 定价卡片对比（Essential/Advanced/Expert）|
| 13 | 13-section.png | 定价续 + FAQ |
| 14 | 14-footer.png | Footer: 多列链接网格（Product / AI Technology / Solutions / Resources / Fin in Action / Company）|

## fin.ai 设计要素提取

### 布局系统
- **统一内容宽度**: 所有章节内容在相同 max-width 内，视觉非常规整
- **左侧 sticky 导航**:
  - 位于页面左侧约 2-3vw 处
  - 固定在视口中间偏上
  - 格式: `01  CAPABILITIES` — 数字 + 全大写标签
  - 当前章节高亮（白色），其他灰色
  - 有进度条效果（橙色横线标示当前位置）
- **章节间过渡**: 无花哨动画，简单的滚动切换，章节之间有充分间距

### 排版
- **标题**: 衬线字体（类似 Canela/Georgia），极大字号，白色
- **标签/编号**: 等宽字体，全大写，letter-spacing 较大，灰色/次要色
- **正文**: 无衬线，适中字号，灰白色
- **章节标记**: 左侧小圆点（橙色）+ 全大写标签，如 `● SEAMLESS INTEGRATION`

### 色彩
- **深色主题为主**: 背景 ~#1a1a2e 深蓝黑
- **单一强调色**: 橙色（用于导航高亮、标签圆点、CTA hover）
- **层次**: 纯白标题 → 灰白正文 → 深灰次要信息
- **卡片/模块**: 略亮于背景的深色面板，非常微妙的边框

### 内容呈现
- **真实产品UI**: 直接展示产品界面截图，不是抽象概念图
- **数据可视化**: 使用真实的图表（柱状图、折线图）展示性能数据
- **步骤流程**: 1. Train → 2. Test → 3. Deploy → 4. Analyze，编号清晰
- **客户logo**: 灰白色处理，横排一行，均匀间距
- **认证徽章**: 统一灰色调，横排展示
- **团队照片**: 圆形头像，网格排列，名字+职位

### 交互
- **极简交互**: 几乎没有hover效果、动画或花哨交互
- **导航跟随**: 左侧导航随滚动更新当前章节
- **视频嵌入**: 在适当位置嵌入产品演示视频

## 对 V4-3 的启示

1. **规整第一**: 所有内容对齐到统一宽度，不要溢出或错位
2. **左侧导航**: 实现 sticky 章节导航，格式 `01  TWO WORLDS`
3. **衬线标题 + mono标签**: 保持这个组合
4. **深色主题**: 主背景深色，但 Use Cases (06) 可用暖白
5. **真实感**: 用 CSS/SVG mockup 代替抽象AI图（对标 fin.ai 的真实产品截图）
6. **大方留白**: 章节间留足空间，不要挤压
7. **客户logo**: 学习 fin.ai 的横排规整布局
8. **单一强调色**: 我们用 green (#2d8a4e / #4ade80) 替代 fin.ai 的橙色
