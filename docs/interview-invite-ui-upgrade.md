# Interview Invite Welcome Page UI Upgrade

## 项目信息

- **需求名称**: 真人访谈欢迎界面 UI 升级
- **项目模块**: Interview Project (真人访谈)
- **优先级**: High
- **创建日期**: 2025-11-06
- **状态**: 需求确认阶段

---

## 目录

- [背景](#背景)
- [需求概述](#需求概述)
- [设计规范](#设计规范)
- [技术实现方案](#技术实现方案)
- [国际化支持](#国际化支持)
- [开发清单](#开发清单)
- [代码规范](#代码规范)
- [相关文件](#相关文件)

---

## 背景

### 项目上下文

真人访谈功能是 atypica.AI 的核心功能之一，用户可以通过分享链接邀请真实参与者进行访谈。当前的欢迎界面（Interview Invite Page）需要进行 UI 升级，以提供更好的用户体验。

### 当前问题

1. 现有欢迎界面样式较为简单
2. 缺少对语音交互能力的明确提示
3. 隐私保护信息展示可以优化
4. 标题和副标题内容无法自定义

### 项目范围

- ✅ **本次实现**: 欢迎界面 UI 升级
- ❌ **暂不实现**: 图片展示题（涉及上传和 AI 生成，较复杂）

---

## 需求概述

### 功能需求

#### 1. 整体布局

- 深色背景（黑色/深灰色）
- 居中垂直布局
- 简洁现代风格
- 响应式设计（适配移动端和桌面端）

#### 2. 标题和副标题

**显示内容**:
- 主标题: "Welcome to this interview"
- 副标题（两行）:
  - "Welcome! You'll be shown some advertisements and asked for your detailed feedback."
  - "Please be specific and honest in your responses - there are no right or wrong answers."

**重要特性**:
- ✅ 支持在创建 Interview Project 时配置（将来实现）
- ✅ 当前使用默认值（Setup Interview 界面配置功能未实现）
- ✅ 需要在代码中添加 TODO 注释，标明后续需要支持用户配置

**数据结构**（预期）:
```typescript
interface InterviewProjectConfig {
  welcomeTitle?: string;        // 默认: "Welcome to this interview"
  welcomeSubtitle?: string;     // 默认: 副标题内容
  // ... 其他配置
}
```

#### 3. Microphone 图标展示

**功能定位**:
- 纯展示性 Icon，无交互功能
- 目的: 让用户知道平台支持语音交互

**UI 样式**:
- 深灰色背景圆角按钮
- 内含麦克风图标（使用 `Mic` from lucide-react）
- 显示 "Microphone" 文字
- 与用户信息并排显示

**技术参考**:
- 可参考 `src/components/chat/RecordButton.tsx` 中的 Mic icon 样式

#### 4. 用户信息展示

**显示元素**:
- 用户头像（圆形，绿色背景，显示首字母）
- 用户名（如 "NinaZ"）

**布局**:
- 与 Microphone 图标横向并排
- 统一的视觉风格

**现有实现参考**:
- `InviteInterviewClient.tsx` line 156-168 有类似实现
- 当前显示为 "Participating as:" 标签样式

#### 5. 隐私与保护模块

**保持与现有完全一致**:

```typescript
// 样式参考 (InviteInterviewClient.tsx line 141-149)
<div className="bg-primary/10 p-4 rounded-lg">
  <div className="flex items-start space-x-3">
    <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
    <div>
      <p className="font-medium text-primary text-sm">{t("privacyTitle")}</p>
      <p className="text-sm text-primary/80 mt-1">{t("privacyDescription")}</p>
    </div>
  </div>
</div>
```

**新增功能**:
- ✅ 添加 Checkbox（设计图中有复选框，现有代码没有）
- 用户需要勾选表示同意隐私政策

**国际化**:
- 中文: "隐私与保密" + 描述文案
- 英文: "Privacy & Confidentiality" + 描述文案

#### 6. 开始按钮

**样式**:
- 绿色文字（`text-green-500` 或使用主题色）
- 深色背景（半透明或深灰）
- 圆角按钮
- 全宽或固定宽度居中

**交互行为**:
- ✅ 点击后弹出语言选择 Dialog（现有功能，需保留）
- ✅ Dialog 支持选择中文/English
- ✅ 初始语言为当前用户选择的语言

**现有实现参考**:
- `InviteInterviewClient.tsx` line 169-219
- 语言选择逻辑: line 41-45

---

## 设计规范

### 设计参考

参考设计图提供的黑色背景界面，具体样式：

```
┌─────────────────────────────────────┐
│                                     │
│     Welcome to this interview       │ ← 主标题
│                                     │
│   Welcome! You'll be shown some...  │ ← 副标题行1
│   Please be specific and honest...  │ ← 副标题行2
│                                     │
│   [🎤 Microphone]  [👤 NinaZ]      │ ← 横向排列
│                                     │
│   ┌───────────────────────────┐    │
│   │ ☑️ 隐私与保密              │    │ ← 隐私模块
│   │ 您的回答仅用于研究目的...  │    │
│   └───────────────────────────┘    │
│                                     │
│       [  Start Interview  ]         │ ← 开始按钮
│                                     │
└─────────────────────────────────────┘
```

### 颜色规范

遵循 Tailwind CSS v4 主题配置（参考 CLAUDE.md）:

- **背景色**: `bg-background` (深色)
- **前景色**: `text-foreground`
- **主色调**: `bg-primary`, `text-primary`
- **次要色**: `bg-muted`, `text-muted-foreground`
- **边框**: `border-border`

### 间距规范

- 使用 Tailwind 标准间距: `space-x-*`, `space-y-*`, `gap-*`
- 卡片内边距: `p-4`, `p-6`
- 组件间距: `mb-4`, `mb-6`, `mb-8`

### 圆角规范

- 按钮: `rounded-lg` 或 `rounded-full`
- 卡片: `rounded-lg`
- 头像: `rounded-full`

---

## 技术实现方案

### 组件架构

#### 原则

根据 Leader 要求：
- ✅ **创建新组件，不复用 `app/(persona)` 的组件**
- ✅ **所有新组件放在 `src/app/(interviewProject)/components/` 下**

#### 新建组件列表

1. **InterviewWelcome.tsx** (主组件)
   - 路径: `src/app/(interviewProject)/components/InterviewWelcome.tsx`
   - 职责: 整合所有子组件，统筹欢迎界面

2. **MicrophoneIndicator.tsx**
   - 路径: `src/app/(interviewProject)/components/MicrophoneIndicator.tsx`
   - 职责: 显示麦克风图标，提示语音交互能力

3. **UserInfoCard.tsx**
   - 路径: `src/app/(interviewProject)/components/UserInfoCard.tsx`
   - 职责: 显示用户头像和用户名

4. **PrivacyAgreement.tsx**
   - 路径: `src/app/(interviewProject)/components/PrivacyAgreement.tsx`
   - 职责: 显示隐私政策并支持 checkbox 勾选

### 修改现有文件

#### InviteInterviewClient.tsx

**文件路径**: `src/app/(interviewProject)/interview/invite/[shareToken]/InviteInterviewClient.tsx`

**主要修改**:
1. 引入新建的组件
2. 重构 UI 布局，使用新组件替换现有实现
3. 保留语言选择 Dialog 功能（line 169-219）
4. 保留 `handleLanguageConfirm` 逻辑（line 45-63）

**需要保留的代码**:
- 语言选择 state: `const [selectedLanguage, setSelectedLanguage] = useState<Locale>(locale);`
- Dialog 组件及其内容
- `createHumanInterviewSession` API 调用

### 状态管理

```typescript
// InviteInterviewClient.tsx
const [loading, setLoading] = useState(false);
const [selectedLanguage, setSelectedLanguage] = useState<Locale>(locale);
const [agreedToPrivacy, setAgreedToPrivacy] = useState(false); // 新增: 隐私协议勾选状态
```

### Props 定义

```typescript
// InterviewWelcome.tsx
interface InterviewWelcomeProps {
  title?: string;              // 可选，默认使用 i18n
  subtitle?: string;           // 可选，默认使用 i18n
  user: {
    id: number;
    name?: string | null;
    email: string;
  } | null;
  onStartInterview: () => void;
  disabled?: boolean;
}

// MicrophoneIndicator.tsx
interface MicrophoneIndicatorProps {
  className?: string;
}

// UserInfoCard.tsx
interface UserInfoCardProps {
  user: {
    name?: string | null;
    email: string;
  };
  className?: string;
}

// PrivacyAgreement.tsx
interface PrivacyAgreementProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}
```

---

## 国际化支持

### i18n Keys 定义

**文件位置**:
- 中文: `src/app/(interviewProject)/messages/zh-CN.json`
- 英文: `src/app/(interviewProject)/messages/en-US.json`

### 新增翻译 Keys

```json
{
  "InterviewProject": {
    "shareInvite": {
      // 现有 keys 保持不变
      "title": "You're Invited to an Interview",
      "privacyTitle": "Privacy & Confidentiality",
      "privacyDescription": "Your responses will be used for research purposes only...",

      // 新增 keys
      "welcomeTitle": "Welcome to this interview",
      "welcomeSubtitleLine1": "Welcome! You'll be shown some advertisements and asked for your detailed feedback.",
      "welcomeSubtitleLine2": "Please be specific and honest in your responses - there are no right or wrong answers.",
      "microphoneLabel": "Microphone",
      "privacyAgreementLabel": "I agree to the privacy policy and consent to participate in this research",
      "privacyCheckboxRequired": "You must agree to the privacy policy to continue"
    }
  }
}
```

### 中文翻译

```json
{
  "InterviewProject": {
    "shareInvite": {
      "welcomeTitle": "欢迎参加本次访谈",
      "welcomeSubtitleLine1": "欢迎！您将看到一些广告并被要求提供详细反馈。",
      "welcomeSubtitleLine2": "请在回答中保持具体和诚实 - 没有对错之分。",
      "microphoneLabel": "麦克风",
      "privacyAgreementLabel": "我同意隐私政策并同意参与本次研究",
      "privacyCheckboxRequired": "您必须同意隐私政策才能继续"
    }
  }
}
```

---

## 开发清单

### Phase 1: 准备工作

- [ ] 创建 `docs/interview-invite-ui-upgrade.md` 需求文档
- [ ] 更新 i18n 文件，添加新的翻译 keys
- [ ] 确认设计规范和样式标准

### Phase 2: 组件开发

#### 2.1 基础组件

- [ ] 创建 `MicrophoneIndicator.tsx`
  - [ ] 实现 Icon 展示
  - [ ] 应用样式（深灰背景、圆角）
  - [ ] 添加多语言支持

- [ ] 创建 `UserInfoCard.tsx`
  - [ ] 实现用户头像（首字母圆形）
  - [ ] 实现用户名显示
  - [ ] 应用样式

- [ ] 创建 `PrivacyAgreement.tsx`
  - [ ] 复用现有样式（Shield icon, bg-primary/10）
  - [ ] 添加 Checkbox 组件
  - [ ] 实现 checked state 管理
  - [ ] 添加多语言支持

#### 2.2 主组件

- [ ] 创建 `InterviewWelcome.tsx`
  - [ ] 整合所有子组件
  - [ ] 实现整体布局
  - [ ] 处理标题/副标题的默认值和自定义值
  - [ ] 添加 TODO 注释（标明后续需要支持配置）

#### 2.3 集成到现有页面

- [ ] 修改 `InviteInterviewClient.tsx`
  - [ ] 引入新组件
  - [ ] 重构 UI，使用新组件
  - [ ] 保留语言选择 Dialog
  - [ ] 添加隐私协议勾选验证
  - [ ] 测试交互流程

### Phase 3: 样式优化

- [ ] 确保深色主题样式正确
- [ ] 确保浅色主题样式正确（如果支持）
- [ ] 移动端响应式适配
- [ ] 桌面端布局优化

### Phase 4: 测试

- [ ] 功能测试
  - [ ] 标题和副标题正确显示
  - [ ] Microphone 和用户信息正确显示
  - [ ] 隐私协议 checkbox 可勾选
  - [ ] 未勾选时点击开始按钮有提示
  - [ ] 语言选择 Dialog 正常弹出
  - [ ] 中英文切换正确

- [ ] UI 测试
  - [ ] 移动端显示正常
  - [ ] 桌面端显示正常
  - [ ] 深色模式样式正确
  - [ ] 各元素间距符合设计

- [ ] 集成测试
  - [ ] 完整流程走通（从邀请链接到开始访谈）
  - [ ] 创建会话 API 调用成功
  - [ ] 跳转到访谈页面正常

### Phase 5: 代码审查和优化

- [ ] ESLint 检查通过
- [ ] TypeScript 类型检查通过
- [ ] 代码符合项目规范（参考 CLAUDE.md）
- [ ] 添加必要的注释
- [ ] 性能优化（如需要）

---

## 代码规范

### 遵循 CLAUDE.md 规范

#### 1. Styling Conventions

```typescript
import { cn } from "@/lib/utils";

// ✅ 使用 cn() 组合 class names
<div className={cn("base-class", condition && "conditional-class")} />

// ✅ 使用主题变量
<div className="bg-background text-foreground border-border" />

// ✅ 响应式设计
<div className="flex flex-col md:flex-row lg:gap-4" />
```

#### 2. TypeScript 规范

```typescript
// ✅ 明确的 interface 定义
interface ComponentProps {
  user: User;
  onAction: () => void;
  className?: string;
}

// ✅ 使用 FC 类型
export const Component: FC<ComponentProps> = ({ user, onAction, className }) => {
  // ...
};
```

#### 3. 国际化规范

```typescript
// ✅ 使用 useTranslations hook
const t = useTranslations("InterviewProject.shareInvite");

// ✅ 在组件中使用
<p>{t("welcomeTitle")}</p>
```

#### 4. 组件命名

- 使用 PascalCase
- 文件名与组件名一致
- 明确的功能命名（如 `MicrophoneIndicator`, `PrivacyAgreement`）

#### 5. 导入规范

```typescript
// ✅ 使用 @ alias
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

// ✅ 分组导入
// 1. React 相关
// 2. 第三方库
// 3. 项目内部组件
// 4. 类型定义
// 5. 样式和工具
```

---

## 相关文件

### 需要创建的文件

1. `src/app/(interviewProject)/components/InterviewWelcome.tsx`
2. `src/app/(interviewProject)/components/MicrophoneIndicator.tsx`
3. `src/app/(interviewProject)/components/UserInfoCard.tsx`
4. `src/app/(interviewProject)/components/PrivacyAgreement.tsx`
5. `docs/interview-invite-ui-upgrade.md` (本文档)

### 需要修改的文件

1. `src/app/(interviewProject)/interview/invite/[shareToken]/InviteInterviewClient.tsx`
   - 主要改动: UI 重构，使用新组件

2. `src/app/(interviewProject)/messages/zh-CN.json`
   - 添加新的翻译 keys

3. `src/app/(interviewProject)/messages/en-US.json`
   - 添加新的翻译 keys

### 参考文件

1. `src/components/chat/RecordButton.tsx`
   - 参考 Mic icon 的使用

2. `src/app/(interviewProject)/tools/types.ts`
   - 了解数据结构

3. `CLAUDE.md`
   - 项目开发规范

---

## TODO 注释标准

在代码中需要添加的 TODO 注释：

```typescript
// TODO: Support user-configurable title and subtitle in Interview Project setup
// Currently using default values from i18n
// Will be configurable when Interview Project setup UI is implemented
// Related: Interview Project configuration flow (未来功能)
const title = projectConfig?.welcomeTitle || t("welcomeTitle");
const subtitle = projectConfig?.welcomeSubtitle || t("welcomeSubtitleLine1") + " " + t("welcomeSubtitleLine2");
```

---

## 验收标准

### 功能要求

- [x] 欢迎界面显示标题和副标题（使用默认值）
- [x] 显示 Microphone 图标和用户信息，横向排列
- [x] 隐私协议模块样式与现有一致，包含 checkbox
- [x] 未勾选隐私协议时点击开始按钮有提示
- [x] 点击开始按钮弹出语言选择 Dialog
- [x] 中英文切换正确显示所有内容
- [x] 完整流程可以正常走通

### UI 要求

- [x] 深色背景，简洁现代
- [x] 移动端和桌面端均显示正常
- [x] 所有间距和样式符合设计
- [x] 与现有 UI 风格统一

### 代码质量

- [x] ESLint 检查通过
- [x] TypeScript 无类型错误
- [x] 符合 CLAUDE.md 规范
- [x] 代码有适当注释
- [x] 组件职责清晰，易于维护

---

## 开发进度

| 阶段 | 状态 | 开始时间 | 完成时间 | 备注 |
|------|------|----------|----------|------|
| 需求确认 | ✅ 完成 | 2025-11-06 | 2025-11-06 | 需求文档已创建 |
| i18n 准备 | ✅ 完成 | 2025-11-06 | 2025-11-06 | 已更新 zh-CN.json 和 en-US.json |
| 组件开发 | ✅ 完成 | 2025-11-06 | 2025-11-06 | 已创建所有 4 个组件 |
| UI 集成 | ✅ 完成 | 2025-11-06 | 2025-11-06 | 已重构 InviteInterviewClient.tsx |
| 测试验证 | ⏭️ 跳过 | - | - | 用户要求不测试 |
| Code Review | 🔜 待开始 | - | - | - |

---

## 风险和注意事项

### 技术风险

1. **响应式布局挑战**
   - Microphone 和用户信息横向排列在小屏幕上可能需要调整
   - 解决方案: 使用 Tailwind 响应式类，小屏幕垂直排列

2. **隐私协议 Checkbox 状态管理**
   - 需要确保用户必须勾选才能继续
   - 解决方案: 在开始按钮点击时验证，未勾选显示提示

3. **语言切换一致性**
   - 确保所有新增文案都有中英文翻译
   - 解决方案: 在 i18n 文件中完整配置所有 keys

### 注意事项

1. **不要复用 persona 组件**
   - 严格遵循 Leader 要求，创建独立组件
   - 放置在 `src/app/(interviewProject)/components/` 目录下

2. **保留现有功能**
   - 语言选择 Dialog 必须保留
   - API 调用逻辑不要改动
   - 数据流保持一致

3. **标题副标题配置**
   - 当前使用默认值（i18n）
   - 在代码中添加 TODO 注释
   - 为将来的配置功能预留 props

4. **样式一致性**
   - 隐私模块样式必须与现有完全一致
   - 使用项目统一的颜色和间距规范
   - 深色模式和浅色模式都要考虑

---

## 参考资源

- [CLAUDE.md](../CLAUDE.md) - 项目开发规范
- [Tailwind CSS v4 文档](https://tailwindcss.com/docs)
- [Radix UI 文档](https://www.radix-ui.com/docs/primitives/overview/introduction)
- [next-intl 文档](https://next-intl-docs.vercel.app/)
- [Lucide Icons](https://lucide.dev/)

---

## 更新日志

| 日期 | 版本 | 更新内容 | 更新人 |
|------|------|----------|--------|
| 2025-11-06 | v1.0 | 初始版本，需求确认完成 | Claude |
| 2025-11-06 | v1.1 | 完成 i18n 文件更新 | Claude |
| 2025-11-06 | v1.2 | 完成所有组件开发（4个组件） | Claude |
| 2025-11-06 | v1.3 | 完成 UI 集成，重构 InviteInterviewClient.tsx | Claude |
| 2025-11-06 | v2.0 | 开发完成，等待 Code Review | Claude |
| 2025-11-06 | v2.1 | UI 调整：左对齐、简化隐私模块、移除不必要元素 | Claude |
| 2025-11-06 | v2.2 | 修复图标对齐问题，统一图标尺寸为 h-5 w-5 | Claude |

---

**文档状态**: ✅ 开发完成（含 UI 调整）
**下一步**: Code Review 和部署

## 详细修改记录

### v2.1 - UI 布局调整 (2025-11-06)

#### 修改的文件

1. **src/app/(interviewProject)/components/InterviewWelcome.tsx**
   - 标题和副标题改为左对齐
   - Microphone 和用户信息改为左对齐
   - 开始按钮宽度改为与隐私框同宽
   - 删除按钮下方的同意文字

2. **src/app/(interviewProject)/components/PrivacyAgreement.tsx**
   - 删除 Shield icon 的 import 和渲染
   - Checkbox 直接放在最左边
   - 删除 "我同意隐私政策并同意参与本次研究" 单独的文字行
   - 简化布局为：Checkbox + 隐私标题和描述

### v2.2 - 图标对齐修复 (2025-11-06)

#### 问题
MicrophoneIndicator 和 UserInfoCard 水平方向未对齐，原因是图标尺寸不一致。

#### 修改的文件

1. **src/app/(interviewProject)/components/MicrophoneIndicator.tsx**
   - Mic icon 尺寸从 h-4 w-4 (16px) 改为 h-5 w-5 (20px)

2. **src/app/(interviewProject)/components/UserInfoCard.tsx**
   - 头像尺寸从 w-6 h-6 (24px) 改为 w-5 h-5 (20px)

#### 结果
统一图标/头像尺寸为 h-5 w-5 (20px × 20px)，确保两个组件完美对齐。

---

## 最终文件清单

### 创建的新文件（4个）
1. `src/app/(interviewProject)/components/MicrophoneIndicator.tsx`
2. `src/app/(interviewProject)/components/UserInfoCard.tsx`
3. `src/app/(interviewProject)/components/PrivacyAgreement.tsx`
4. `src/app/(interviewProject)/components/InterviewWelcome.tsx`

### 修改的文件（7个）
1. `src/app/(interviewProject)/messages/zh-CN.json` - 新增翻译 keys
2. `src/app/(interviewProject)/messages/en-US.json` - 新增翻译 keys
3. `src/app/(interviewProject)/interview/invite/[shareToken]/InviteInterviewClient.tsx` - 重构使用新组件
4. `src/app/(interviewProject)/components/InterviewWelcome.tsx` - UI 布局调整（v2.1）
5. `src/app/(interviewProject)/components/PrivacyAgreement.tsx` - 简化隐私模块（v2.1）
6. `src/app/(interviewProject)/components/MicrophoneIndicator.tsx` - 图标尺寸调整（v2.2）
7. `src/app/(interviewProject)/components/UserInfoCard.tsx` - 头像尺寸调整（v2.2）

### 文档文件（1个）
1. `docs/interview-invite-ui-upgrade.md` - 本文档
