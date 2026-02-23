# V4-3 设计决策

## 1. 整体方向

V4-3 是**完全独立的版本**，不复用 v4/v4-1/v4-2 的任何组件。

参考 fin.ai 的"规整"布局风格，核心目标：
- 结构清晰、统一宽度、大方留白
- 信息密度适中，不花哨
- 功能感强（用 UI mockup 而非抽象图）

## 2. 布局系统

### 2.1 左侧 Sticky 导航
- 固定在视口左侧，垂直居中
- 格式: `01  TWO WORLDS` — 编号 + 全大写标签
- 当前章节: 绿色编号 + 白色标签
- 其他: 全部灰色 (rgba(255,255,255,0.25))
- Hero 和 Closing 不在导航中，仅 01-06

### 2.2 内容区
- 所有章节统一 max-width: 1120px
- 章节之间以 border-top 分隔
- 内容区有 margin-left 为左侧导航留空间
- 移动端: 隐藏左侧导航，取消 margin-left

### 2.3 章节间距
- 参考 fin.ai 的大方留白
- padding: 120px top, 80px bottom（桌面端）
- 移动端: 80px top, 60px bottom

## 3. 排版

### 3.1 字体
- **标题**: EuclidCircularA（项目已有）— 替代 fin.ai 的衬线
- **标签/编号**: IBMPlexMono（项目已有）— 等宽字体
- **正文**: 系统默认无衬线

### 3.2 字号层级
- Hero 标题: clamp(48px, 7vw, 112px)
- 章节标题: clamp(28px, 3.5vw, 52px)
- 叙事长标题: clamp(22px, 2.5vw, 38px) — 用于 01 Two Worlds 的引言
- 正文: clamp(15px, 1.1vw, 18px)
- 标签: 10-11px, letter-spacing 0.12-0.18em

## 4. 色彩

### 4.1 主色
- 背景: #0a0a0c（深色主题）
- 暖白背景: #fafaf8（用于 05 Data Assets、06 Use Cases）
- 强调色: #2d8a4e（brand green）/ #4ade80（accent light）

### 4.2 文字层次（深色背景上）
- 标题: #fff
- 正文: rgba(255,255,255,0.55)
- 次要: rgba(255,255,255,0.25)
- 强调标签: #4ade80

### 4.3 文字层次（暖白背景上）
- 标题: #111
- 正文: rgba(17,17,17,0.55)
- 次要: rgba(17,17,17,0.25)
- 强调标签: #2d8a4e

## 5. 图片策略（重要！）

### 5.1 抽象AI生成图
仅用于：
- Hero 背景（深色多面体 + 绿色粒子流）
- 不再用于任何功能展示区域

### 5.2 CSS/SVG UI Mockup
用于所有功能展示区域，手绘极简风格：
- **Scout mockup**: 社媒feed流 — 头像圆圈 + 横线（模拟文字）+ 平台图标
- **Interview mockup**: 对话气泡 — AI气泡(绿边) + 用户气泡(灰边)
- **Panel mockup**: 多人讨论 — 多个彩色圆点 + 消息条
- **Persona mockup**: 人物卡片 — 圆形头像 + 标签chips
- **Sage mockup**: 知识层级 — Core Memory + Working Memory 两层面板
- **Report mockup**: 报告输出 — 标题行 + 段落线 + 数据图表线

所有 mockup 用 CSS 实现（div + border + 小色块），不用图片或截图，保持设计一致性。

## 6. 交互设计

### 6.1 World Model 环形图
- 4层同心环（SVG circle），从外到内: Expression → Story → Cognition → Behavior
- 6个维度节点在最外环外侧，辐射分布
- 中心: "SWM" 脉冲动画
- Hover 维度节点 → 右侧面板显示详情
- Hover 层级 → 右侧面板显示层级描述和对应产品

### 6.2 Three Modes 卡片
- 每个卡片包含: mockup区 + 信息区
- 整个卡片可点击，跳转到 /newstudy
- Hover: 边框变亮

### 6.3 左侧导航
- 跟随滚动，高亮当前可见章节
- 使用 IntersectionObserver 检测

### 6.4 Hero
- 背景图有 scroll-driven zoom + fade
- 内容有 staggered fade-in 动画
- 可选: 底部小终端动画（保留 v4-2 的 terminal block 概念）

## 7. 章节背景色分布

| 章节 | 背景 |
|------|------|
| Hero | #0a0a0c (深色) |
| 01 Two Worlds | #0a0a0c (深色) |
| 02 Two Agents | #0a0a0c (深色) |
| 03 World Model | #0a0a0c (深色) |
| 04 Three Modes | #0a0a0c (深色) |
| 05 Data Assets | #fafaf8 (暖白) |
| 06 Use Cases | #fafaf8 (暖白) |
| Closing | #0a0a0c (深色) |

## 8. 技术约束

- 路径: `src/app/(public)/home-v4-3/`
- **完全独立** — 不复用任何 v4/v4-1/v4-2 的组件、hooks、CSS
- CSS Modules
- 不依赖 i18n（先做英文版）
- 需处理 DefaultLayout overflow 问题（sticky scroll fix）
- framer-motion 用于动画
- Next.js Image 用于 Hero 背景图
