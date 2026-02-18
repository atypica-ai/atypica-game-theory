# Home-V4 交互重构 — 交接文档

## 一、当前状态：诚实的自我批评

### 核心问题：所有"交互"都是同一种东西

整个页面的所谓"交互"本质上只有一个模式：

```
用户滚动 → useScroll() 捕获进度 → useTransform() 映射到 CSS 属性 → 元素移动/淡入淡出
```

我做的"改进"只是把 `opacity` 换成了 `clipPath`、`translateX`、`translateY`——但用户体验完全一样：**滚动，然后看东西动**。没有任何需要用户主动参与的交互，没有任何令人惊喜的动态元素。

### 具体问题清单

| Section | 当前做法 | 问题 |
|---------|---------|------|
| HeroSection | 滚动 → 图片放大 + 文字淡出 | 最标准的 hero parallax，毫无特色 |
| ManifestoSection | 滚动 → clipPath wipe 切图 | 只是换了一种"图片切换"方式，本质没变 |
| ThesisSection | 滚动 → 左推右进 | 又是一种"图片切换"，只是方向不同 |
| CoreTechSection | CSS rotate 60s 自转 | 唯一有持续动画的，但轨道图本身很基础 |
| ProductModulesSection | 滚动 → 卡片向上掀开 | 第三种"图片切换"变体 |
| SubjectiveModelSection | 滚动 → 圆形 clipPath 展开 | 第四种"图片切换"变体 |
| InteractionModesSection | 鼠标 hover → 3D tilt | 唯一有鼠标交互的，但只用在了小卡片上 |
| UseCasesSection | 滚动 → 水平滚动 | 标准横向轮播 |
| ClientsSection | CSS 无限滚动 marquee | 标准做法 |
| CTASection | 磁吸按钮 | 唯一有趣的交互，但只有一个按钮 |

**总结**：10 个 section，7 个靠 `useScroll + useTransform`，2 个靠 CSS 动画，1 个有鼠标追踪。整页就是一个被动的"滚动观影"体验。

### 全局效果也很弱

- `FloatingParticles`：25 个绿色圆点飘来飘去——太少、太慢、没有和页面内容产生关联
- `CursorGlow`：鼠标跟随的淡绿光圈——太淡，几乎看不到
- `Film Grain`：SVG 噪点叠加层——标准做法

---

## 二、文件结构

所有文件在 `src/app/(public)/home-v4/`：

```
page.tsx                    → 入口，只 import HomePageV4
HomePageV4.tsx              → 根容器 + 全局效果（粒子、光标光圈、胶片颗粒）
HeroSection.tsx             → Hero 区域（parallax zoom）
ManifestoSection.tsx        → 客观/主观 manifesto（clip wipe）
ThesisSection.tsx           → 模拟器/研究者 双角色（horizontal push）
CoreTechSection.tsx         → 核心技术轨道图（CSS orbit rotation）
ProductModulesSection.tsx   → 4 个产品模块（card peel stack）
SubjectiveModelSection.tsx  → 3 个主观模型（circle reveal）
InteractionModesSection.tsx → 交互模式（sticky bg + 3D tilt cards）
UseCasesSection.tsx         → 用例展示（horizontal scroll + tilt grid）
ClientsSection.tsx          → 客户 marquee
CTASection.tsx              → CTA 磁吸按钮
```

i18n 文件：
- `src/i18n/messages/en-US.json` → `HomePageV4` key
- `src/i18n/messages/zh-CN.json` → `HomePageV4` key

---

## 三、技术约束（接手者必须知道的）

### 1. position:sticky 修复

DefaultLayout 有 `overflow-y: auto` 的 wrapper，会破坏所有 sticky。`HomePageV4.tsx` 里的 `useStickyFix` hook 在 mount 时遍历所有祖先 DOM，把 `overflow-y` 强制设为 `visible`。**不要删除这个 hook**。

### 2. overflow-x: clip vs hidden

根容器用的是 `overflow-x-clip` 而不是 `overflow-x-hidden`。因为 CSS 规范中 `overflow-x: hidden` 会强制 `overflow-y` 也变成 `auto`，破坏 sticky。`clip` 不会。

### 3. 图片来源

所有图片通过 `/api/imagegen/dev/{prompt}?ratio=landscape` 动态生成。prompt 是长文本描述，已编码在各 section 的常量里。**不要修改这些 prompt**。

### 4. framer-motion 版本

使用 framer-motion（非 motion/react），支持 `useScroll`、`useTransform`、`useMotionValue`、`useSpring`、`motion.div` 等。

### 5. 滚动隧道模式

多个 section 使用 "scroll tunnel" 模式：
- 外层 div 设置 `height: 300-400vh`（创建滚动空间）
- 内层 `sticky top-0 h-screen`（视觉容器固定在视口）
- `useScroll({ target: ref, offset: ["start start", "end end"] })` 捕获进度
- `useTransform()` 把 0→1 的进度映射到各种 CSS 属性

### 6. 移动端

所有 section 都有 `hidden lg:block`（桌面复杂交互）和 `lg:hidden`（移动端简单堆叠）两套布局。移动端只用 `whileInView` 做简单的 fade-in。

---

## 四、真正需要做的方向（我没做到的）

### A. 需要"活的"元素，不只是"滚动驱动的动画"

当前页面的问题不是缺少动画，而是缺少**生命力**。以下是几个可能的方向：

1. **Canvas / WebGL 背景**：用 Three.js 或 p5.js 创建一个持续运行的粒子系统/流体/生成艺术作为背景层，响应鼠标位置和滚动位置。不是 25 个 div 假装粒子，而是真正的粒子引擎。

2. **交互式数据可视化**：CoreTechSection 的轨道图可以变成一个真正的交互图谱——拖拽节点、hover 显示连接、点击展开详情。用 D3.js 或 React Flow。

3. **滚动触发的生成式动画**：比如滚动到 ManifestoSection 时，文字一个字一个字"打字机"出现，同时背景有真正的 generative art 在实时生成（不是预录好的 CSS 动画）。

4. **鼠标交互无处不在**：不只是 tilt 小卡片。整个页面应该对鼠标有反应——粒子被推开、文字微微偏移、光影跟随。

5. **Scroll-triggered 状态机**：不是简单的 A→B 线性变换，而是滚动到特定位置触发一个完整的"表演"——元素组装、拆解、重组，有起承转合。

### B. 具体 section 的改进思路

| Section | 可能的方向 |
|---------|-----------|
| Hero | Canvas 粒子背景 + 文字 morphing/glitch 效果 + 鼠标视差（不只是滚动视差） |
| Manifesto | 文字 reveal 用 per-character stagger + mask animation，不要只是 opacity |
| Thesis | 两个角色可以做成交互对比——hover 左边高亮左边信息、hover 右边高亮右边、中间有动态连线 |
| CoreTech | 真正可交互的力导向图或轨道图，hover 节点展开说明，节点间有粒子流 |
| ProductModules | 与其掀卡片，不如做一个 3D 轮转展柜（carousel with depth），或者 scroll-triggered 组装动画（零件飞入组合） |
| SubjectiveModel | 与其圆形展开，不如做数据可视化风格——persona 是散点、sage 是层叠、panel 是网络图 |
| InteractionModes | 可以做成真正的 demo——点击某个 mode 就看到一小段模拟动画 |
| UseCases | Horizontal scroll 可以加入 depth（近远景），或者做成 3D 空间中的浮动卡片 |

### C. 技术选型建议

- **粒子/流体**：`tsparticles`（轻量）或 `three.js`（重但强大）或 `@react-three/fiber`
- **SVG 动画**：`lottie-react` 或手写 SVG path animation
- **文字动画**：`splitting.js` 配合 CSS、或 GSAP SplitText
- **高级滚动**：`@studio-freight/lenis` 做平滑滚动 + GSAP ScrollTrigger（比 framer-motion 的 useScroll 更强大）
- **3D**：`@react-three/fiber` + `@react-three/drei` 做 3D 场景
- **数据可视化**：`d3-force` 做力导向图

---

## 五、不要修改的内容

1. **所有 i18n 文案**——key 结构和翻译内容不要动
2. **所有图片 prompt 常量**——FEATURED_IMG_1、PERSONA_IMG 等不要动
3. **移动端布局**——`lg:hidden` 的部分基本可以保留，因为移动端不需要太花哨
4. **`useStickyFix` hook**——必须保留
5. **`overflow-x-clip`**——必须保留
6. **页面 section 顺序**——HomePageV4.tsx 中的 section 排列顺序不要变

---

## 六、Git 状态

- 分支：`feat/homepage-v4`
- 最近 commit：`ca261faf feat(homepage): add home-v4 with AI-generated visuals and native English copy`
- 当前改动：**未提交**（7 个文件有修改，全是交互改动）
- 如果要回退我的改动：`git checkout -- src/app/\(public\)/home-v4/`

---

## 七、运行方式

```bash
pnpm dev          # 开发服务器 localhost:3001
# 然后访问 /home-v4
```

`pnpm build` 会有两个预先存在的错误（`/agents/scout/[id]` 和 `/api/chat/hello` 缺失），与 home-v4 无关。TypeScript 编译和 lint 通过。
