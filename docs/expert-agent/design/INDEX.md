# 专家智能体系统 - UI 设计原型

本目录包含专家智能体系统的核心页面设计原型。所有设计均使用纯 HTML/CSS 实现，可以直接在浏览器中打开预览。

## 📁 文件说明

### 1. [专家创建流程](./01-expert-creation.html)
**文件**: `01-expert-creation.html`

**功能**:
- 分步骤引导用户创建专家
- 支持多模态内容输入（文本、文件、语音）
- 进度条展示当前步骤
- 实时文件上传预览

**核心交互**:
- Tab 切换不同输入方式
- 拖拽上传文件
- 语音录入模拟
- 表单验证

**设计亮点**:
- 清晰的4步流程指引
- 友好的提示信息
- 响应式布局
- 平滑的动画过渡

---

### 2. [记忆管理界面](./02-memory-management.html)
**文件**: `02-memory-management.html`

**功能**:
- Memory Document 查看和编辑
- 记忆条目列表管理
- 知识空白分析
- 记忆搜索和筛选

**核心交互**:
- 三个 Tab 页切换（记忆文档/记忆条目/知识空白）
- 搜索和筛选功能
- 添加记忆模态框
- 开启补充访谈

**设计亮点**:
- 侧边栏导航设计
- 记忆文档的 Markdown 展示
- 记忆条目卡片设计
- 知识空白卡片高亮显示

---

### 3. [专家对话界面](./03-expert-chat.html)
**文件**: `03-expert-chat.html`

**功能**:
- 实时对话交互
- 工具调用展示（Deep Research）
- 相关记忆展示
- 多模态输入（文本、语音、文件）

**核心交互**:
- 消息发送和接收
- 打字指示器
- 语音录入
- 文件附件上传
- 快速问题选择

**设计亮点**:
- 三栏布局（专家信息/对话区/上下文）
- 消息气泡设计
- 工具调用卡片
- 相关记忆实时展示
- 欢迎消息和快速问题

---

### 4. [专家公开页面](./04-expert-public-page.html)
**文件**: `04-expert-public-page.html`

**功能**:
- 专家主页展示
- 能力和知识领域介绍
- 用户评价展示
- 分享和嵌入功能

**核心交互**:
- 导航栏
- Hero 区域展示
- 分享按钮
- CTA 按钮

**设计亮点**:
- Landing Page 风格设计
- 渐变色背景
- 特性卡片网格
- 知识领域卡片
- 用户评价展示
- 响应式设计

---

### 5. [知识分析页面](./05-knowledge-analysis.html)
**文件**: `05-knowledge-analysis.html`

**功能**:
- 初始内容导入后的知识分析
- 7 维度知识完整度评估
- 整体得分和建议展示
- 引导进入补充访谈

**核心交互**:
- 加载动画和状态转换
- 圆形进度条动画
- 维度评分柱状图
- 改进建议卡片
- 行动按钮（跳过/开始访谈）

**设计亮点**:
- 专业的数据可视化
- 动态分数动画
- 清晰的维度分级（高/中/低）
- 针对性的改进建议
- 流畅的页面过渡

---

### 6. [补充访谈界面](./06-supplementary-interview.html)
**文件**: `06-supplementary-interview.html`

**功能**:
- 专注的全屏访谈体验
- 基于 FocusedInterviewChat 的设计
- 语音和文本双输入支持
- 实时语音转写显示
- 倒计时提醒机制

**核心交互**:
- 欢迎页到问答的流畅过渡
- 麦克风录音（点击开始/停止）
- 键盘输入切换
- 实时转写文本显示
- 打字机效果展示问题
- 思考状态动画

**设计亮点**:
- 极简的全屏对话界面
- 专注力引导设计
- 语音录入的脉冲动画
- 问题上下文提示
- 进度指示器
- 响应式计时器
- 平滑的状态切换动画

---

## 🎨 设计系统

### 颜色体系

本设计使用项目的 Tailwind CSS v4 颜色系统（oklch 色彩空间）：

```css
/* 主要颜色 */
--primary: oklch(0.87 0.29 142.57)      /* 绿色 - 主要操作 */
--background: oklch(0.985 0 0)          /* 浅灰背景 */
--foreground: oklch(0.145 0 0)          /* 深灰文字 */
--border: oklch(0.922 0 0)              /* 边框颜色 */
--muted: oklch(0.556 0 0)               /* 次要文字 */

/* 辅助颜色 */
--destructive: oklch(0.577 0.245 27.325) /* 红色 - 警告/删除 */
--secondary: oklch(0.6 0.118 184.704)    /* 蓝色 - 辅助 */
--accent: oklch(0.769 0.188 70.08)       /* 橙色 - 强调 */
```

### 圆角规范

```css
--radius-sm: 6px
--radius-md: 8px
--radius-lg: 12px
--radius-xl: 16px
```

### 字体系统

```css
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
```

### 间距系统

遵循 4px 基准间距:
- 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 80px

---

## 🔄 交互模式

### 1. 按钮状态
- **Normal**: 默认状态
- **Hover**: 背景色略深，轻微抬起效果
- **Active**: 按压效果
- **Disabled**: 50% 透明度，禁用光标

### 2. 表单输入
- **Focus**: 边框高亮 + 阴影
- **Error**: 红色边框 + 错误提示
- **Success**: 绿色边框 + 成功图标

### 3. 卡片交互
- **Hover**: 边框高亮 + 轻微阴影 + 向上 2px
- **Active**: 按压效果

### 4. 模态框
- **打开**: 淡入动画 + 背景遮罩
- **关闭**: 淡出动画
- **点击外部**: 关闭模态框

---

## 📱 响应式设计

所有页面都支持响应式设计：

### 断点
- **移动端**: < 768px
- **平板**: 768px - 1024px
- **桌面**: > 1024px

### 适配策略
- 移动端：单栏布局，堆叠展示
- 平板：2栏布局，适当调整间距
- 桌面：3栏布局，充分利用空间

---

## 🚀 使用方法

### 本地预览

1. **直接打开文件**
   ```bash
   # 在浏览器中打开任意 HTML 文件
   open 01-expert-creation.html
   ```

2. **使用本地服务器**
   ```bash
   # 在当前目录启动服务器
   python -m http.server 8000
   # 或使用 Node.js
   npx serve .
   ```

3. **在浏览器访问**
   ```
   http://localhost:8000/01-expert-creation.html
   ```

### 开发工具

推荐使用浏览器开发者工具：
- **Chrome DevTools**: 查看元素、调试样式
- **响应式模式**: 测试不同屏幕尺寸
- **Console**: 查看交互逻辑

---

## 🎯 设计原则

### 1. 简洁明了
- 清晰的信息层级
- 避免过度装饰
- 突出核心功能

### 2. 用户友好
- 直观的交互反馈
- 友好的错误提示
- 合理的默认值

### 3. 一致性
- 统一的颜色使用
- 一致的交互模式
- 标准化的组件

### 4. 性能优先
- 轻量级实现
- 平滑的动画
- 快速的响应

---

## 📝 实现建议

### Next.js 组件化

将这些设计转换为 Next.js 组件时：

1. **拆分组件**
   ```
   components/expert/
   ├── ExpertCreationWizard/
   │   ├── StepProgress.tsx
   │   ├── BasicInfoForm.tsx
   │   ├── ContentInput.tsx
   │   └── index.tsx
   ├── MemoryManagement/
   │   ├── MemoryDocument.tsx
   │   ├── MemoryList.tsx
   │   ├── KnowledgeGaps.tsx
   │   └── index.tsx
   ├── ExpertChat/
   │   ├── ChatHeader.tsx
   │   ├── MessageList.tsx
   │   ├── MessageInput.tsx
   │   └── ContextSidebar.tsx
   └── ExpertPublicPage/
       ├── Hero.tsx
       ├── Features.tsx
       ├── Topics.tsx
       └── index.tsx
   ```

2. **使用项目规范**
   - 遵循 `CLAUDE.md` 中的代码规范
   - 使用 Server Actions 处理表单提交
   - 使用 AI SDK 集成对话功能
   - 使用 Prisma 管理数据

3. **状态管理**
   - 使用 `useState` 管理局部状态
   - 使用 `useContext` 共享全局状态
   - 使用 Server Components 获取数据

4. **样式实现**
   - 使用 `cn()` 工具函数组合类名
   - 遵循 Tailwind CSS v4 规范
   - 使用 CSS 变量定义颜色

---

## 🔮 后续优化

### 短期
- [ ] 添加加载骨架屏
- [ ] 优化移动端体验
- [ ] 添加键盘快捷键
- [ ] 实现暗黑模式

### 中期
- [ ] 添加动画效果
- [ ] 实现拖拽排序
- [ ] 添加更多交互细节
- [ ] 优化性能

### 长期
- [ ] 知识图谱可视化
- [ ] 高级搜索功能
- [ ] 协作编辑
- [ ] 版本历史

---

## 📚 相关文档

- [技术设计文档](../README.md)
- [代码规范](../../../CLAUDE.md)
- [数据库设计](../README.md#数据库设计)
- [API 设计](../README.md#核心功能实现)

---

## 💬 反馈

如有设计建议或问题，请联系开发团队或提交 Issue。

---

**最后更新**: 2024年1月
**设计师**: Claude Code
**版本**: v1.0
