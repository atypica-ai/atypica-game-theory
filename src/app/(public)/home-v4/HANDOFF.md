# Home-V4 交接文档

## 一句话总结当前状态

7个文件有未提交的改动（交互升级），**编译通过但用户不满意**。用户评价："换汤不换药"。核心问题是：所谓的"交互升级"只是把 opacity 过渡换成了 clipPath/translateX/translateY 过渡——本质上还是"图片的移动"，没有真正的交互灵魂。

---

## 项目概况

- **路径**: `src/app/(public)/home-v4/`
- **分支**: `feat/homepage-v4`
- **技术栈**: Next.js 15 + React 19 + framer-motion + Tailwind CSS v4 + next-intl
- **页面入口**: `localhost:3001/home-v4`
- **最后一次 committed**: `3d137e6c` (fix sticky scroll bugs)
- **当前 uncommitted 改动**: 7 个文件，+437/-167 行

---

## 页面结构（从上到下）

```
HomePageV4.tsx          — 根容器 + 全局特效层
├── HeroSection         — 全屏首图 + 口号 + CTA
├── ManifestoSection    — "客观 vs 主观" 双图宣言
├── ThesisSection       — "模拟器 vs 研究员" 双角色
├── CoreTechSection     — 轨道图 + 特性列表
├── ProductModulesSection — 4个产品模块
├── SubjectiveModelSection — 3个主观模型（Persona/Sage/Panel）
├── InteractionModesSection — 交互方式 + 模态列表
├── UseCasesSection     — 3张大卡+6张小卡用例
├── ClientsSection      — 客户名 marquee
└── CTASection          — 终章 CTA
```

---

## 每个文件的当前状态和问题

### HomePageV4.tsx (已改，未提交)

**添加了什么**：
- `FloatingParticles` — 25个绿色粒子漂浮动画（framer-motion animate）
- `CursorGlow` — 鼠标跟随的径向渐变光晕（直接 DOM 操作）
- `useStickyFix` hook — 修复 DefaultLayout 的 overflow-y:auto 破坏 sticky 定位

**问题**：
- 粒子太稀疏，几乎看不到
- 光晕效果太弱（rgba 0.04 的绿色），在暗色底上几乎不可见
- 这两个效果无法给页面带来"灵魂"，只是装饰

---

### HeroSection.tsx (未改)

**当前**：单张全屏图 + 滚动时 scale 放大 + opacity 淡出 + 文字上移
**效果**：OK，但没有什么记忆点。进来就是一张图+一段文字，没有任何动态元素。

---

### ManifestoSection.tsx (已改，未提交)

**原来**：两张图用 opacity 交叉淡入淡出 → 中间有黑屏
**改成**：clipPath inset wipe — 客观图在上层，从右向左 clip 掉，露出下面的主观图。加了一条绿色竖线标记 wipe 边界。

**问题**：
- 本质上还是"一张图慢慢变成另一张图"，只是过渡方式从淡入淡出变成了横向擦除
- 用户不会觉得这是有趣的交互，只是换了个 CSS 属性
- 没有参与感，没有惊喜

---

### ThesisSection.tsx (已改，未提交)

**原来**：两张图 opacity 交叉
**改成**：横向推移 — 模拟器图向左推出，研究员图从右推入。加了绿色分割线。

**问题**：同上。translate 替代了 opacity，但体验本质不变：滚动 → 图片移动 → 文字出现。

---

### ProductModulesSection.tsx (已改，未提交)

**原来**：4张图 opacity 交叉
**改成**：卡片堆栈剥离 — 4张图叠放（z-index 4/3/2/1），最上面的卡片向上滑出并带轻微 rotateX，露出下一张。加了进度条。

**问题**：
- 这个相对好一些，有"翻页"的物理感
- 但依然只是滚动驱动的位移动画，用户没有主动参与
- rotateX 只有 3 度，肉眼很难感知

---

### SubjectiveModelSection.tsx (已改，未提交)

**原来**：3张图 opacity 交叉
**改成**：圆形 clipPath 从中心扩展 — 新图从中心圆向外扩展覆盖旧图。加了绿色光环随圆扩展。

**问题**：
- 圆形展开有一定视觉效果
- 但光环太微弱（opacity 0.4, border 2px），实际很难看到
- 依然只是滚动驱动的被动动画

---

### InteractionModesSection.tsx (已改，未提交)

**原来**：方法列表 = 普通竖排列表，模态 = 普通 2x3 网格
**改成**：
- 方法列表加了 spotlight hover（hover 一个时其他变暗）
- 模态卡片加了 3D tilt（鼠标移动时透视倾斜）

**问题**：
- spotlight hover 是好的交互改进
- 但 3D tilt 在这种小卡片上效果不明显
- 整体还是"一个列表+一个网格"的布局，没有突破

---

### UseCasesSection.tsx (已改，未提交)

**原来**：3张大卡水平滚动 + 6张小卡普通网格
**改成**：小卡加了 3D tilt + spotlight hover

**问题**：同 InteractionModesSection

---

### CoreTechSection.tsx (未改)

**当前**：左边旋转轨道图（6节点60秒自转）+ 右边 bullet list
**问题**：轨道图是唯一有持续动画的元素，但特性列表就是普通的列表

---

### ClientsSection.tsx (未改)

**当前**：三行 marquee 滚动，不同速度不同方向
**效果**：OK，这个部分的交互可以接受

---

### CTASection.tsx (未改)

**当前**：背景图 + 呼吸光晕 + 磁性按钮（hover 时跟随鼠标偏移）
**效果**：磁性按钮是好的，但整体比较安静

---

## 关键技术约束

### sticky 定位
- DefaultLayout 有 `overflow-y: auto`，会破坏 `position: sticky`
- HomePageV4.tsx 里的 `useStickyFix` hook 通过遍历 DOM 祖先并覆写 overflow-y 来修复
- **overflow-x 必须用 `clip` 不能用 `hidden`**，因为 CSS 规范中 hidden 会强制 overflow-y 变为 auto

### 滚动驱动动画
- 多个 section 用 `height: Xvh` 创建滚动空间 + `sticky top-0 h-screen` 创建固定视口
- `useScroll` + `useTransform` 把 scrollYProgress 映射到各种 CSS 属性
- framer-motion 能插值 clipPath 字符串（如 `"circle(0% at 50% 50%)"` → `"circle(100% at 50% 50%)"`），因为它能找到匹配的数字并插值

### 图片
- 所有图片通过 `/api/imagegen/dev/${encodeURIComponent(prompt)}?ratio=landscape` 动态生成
- prompt 是硬编码的长文本常量
- **用户明确要求不能修改任何文案和图片内容**

### i18n
- 中英文文案在 `src/app/(public)/messages/en-US.json` 和 `zh-CN.json`
- 使用 `next-intl` 的 `useTranslations` hook
- 中文有特殊排版类：`zh:text-2xl zh:tracking-wide` 等

---

## 用户真正想要什么

用户说的原话：
> "现在的设计，整体我感觉只是文字和图片的移动"
> "那些图片的 fadein fadeout 也没这么自然，都是突然出现。突然图片切换了，或者突然一片漆黑，然后突然出现个图"
> "你不一定都是靠图，也许还可以有些元素，一些 js 特效之类的，让整个网页，动起来"
> "针对多个 Grid 的情况：将其改成更有交互感的形式"
> "针对多张图的情况：可以通过切换、渐变或者各种 overlay 的效果进行展示"

最后评价："改得不好，换汤不换药"

**我的理解**：
1. 不是换一种 CSS transition 方式就行了
2. 需要的是**页面本身有生命力** —— 不依赖图片也能有视觉层次和动态感
3. 需要更多**主动交互**而不只是被动的滚动驱动
4. 可能需要：
   - Canvas/WebGL 粒子系统或几何动画
   - SVG 路径动画（连线、绘制效果）
   - 打字机效果、数据计数器、进度可视化
   - 鼠标驱动的视差或物理模拟
   - 卡片翻转、拖拽排序、手风琴展开等主动交互
   - 背景不只是静态图片 —— 可以有动态粒子、网格、波浪等 canvas 效果
   - section 之间的过渡可以是更有设计感的（不只是在同一个 sticky 容器里换图）

---

## 当前改动的 Git 状态

```
7 files changed, +437 insertions, -167 deletions (all uncommitted)

- HomePageV4.tsx           — 加了 FloatingParticles + CursorGlow
- ManifestoSection.tsx     — opacity → clipPath wipe
- ThesisSection.tsx        — opacity → translateX push
- ProductModulesSection.tsx — opacity → translateY card peel
- SubjectiveModelSection.tsx — opacity → clipPath circle reveal
- InteractionModesSection.tsx — 加了 useTilt + spotlight hover
- UseCasesSection.tsx      — 加了 useTilt + spotlight hover
```

可以 `git checkout .` 全部回退到 `3d137e6c`，也可以选择性保留部分改动。

---

## 建议方向（给接手的模型）

1. **不要再只调 CSS 过渡属性了**。clip-path、translate、opacity 本质都是同一种交互 —— 被动的滚动驱动属性变化。需要跳出这个思路。

2. **考虑加入真正的动态元素**：
   - Canvas 粒子背景（替代静态图片作为 section 背景）
   - SVG 路径动画（轨道连线 draw-in 效果、数据流动效果）
   - 数字/文字的打字机或计数效果
   - 物理引擎驱动的元素（弹性、碰撞、重力）

3. **考虑主动交互**：
   - 让 Grid 不只是网格 —— 可以是可切换的 tab、可拖拽的卡片、accordion、timeline
   - 让图片展示不只是滚动切换 —— 可以是 hover 触发、click 触发、或有交互式 overlay
   - 让列表不只是列表 —— 可以是 interactive timeline、flow chart、或 step-by-step reveal

4. **不要改文案和图片 prompt**，这是硬性要求。

5. **注意 sticky 定位的约束** —— 上面已经详细说明了 useStickyFix 的必要性。

6. **编译通过不等于没问题** —— 当前 `pnpm build` 会报两个预存的 PageNotFoundError（scout/[id] 和 api/chat/hello），与 home-v4 无关。只要类型检查通过就行。
