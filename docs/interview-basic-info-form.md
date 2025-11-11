# 访谈基本信息表单需求文档

## 需求概述

为真人访谈流程增加标准化的基本信息收集表单，在用户选择语言后、正式访谈开始前展示。表单包含 5 个固定字段（姓名、性别、职业、所在地、年龄段），支持中英文双语，并通过代码侧控制字段内容以确保一致性。

## 需求背景

### 当前流程问题

1. **字段不固定**：现有 prompt 允许 AI 根据研究简介自行添加 1-2 个额外字段，导致用户体验不一致
2. **多语言支持不完善**：选择英语后表单仍显示中文内容
3. **表单显示时机不稳定**：AI 有时会先输出欢迎词，再调用表单工具
4. **字段定义方式不合理**：字段定义写在 prompt 中，难以精确控制必填状态、顺序和多语言

### 现有代码机制

- **表单工具**：`requestInteractionForm` 工具（位于 `src/app/(interviewProject)/tools/index.ts`）
- **前端组件**：`RequestInteractionFormToolMessage.tsx` 负责表单渲染
- **触发机制**：在 `prompt.ts` 的 `interviewAgentSystemPrompt` 中通过 prompt 指示 AI 调用工具
- **数据存储**：通过 `endInterview` 工具的 `personalInfo` 字段保存至 `InterviewSession.extra.personalInfo`

## 需求详情

### 一、标准表单字段（5个固定字段）

| 字段 | 类型 | 必填 | 中文 Label | 英文 Label | 选项/说明 |
|------|------|------|-----------|-----------|----------|
| 姓名 | text | ✅ | 您的姓名 | Your Name | - |
| 性别 | choice (单选) | ✅ | 您的性别 | Your Gender | ["女性", "男性", "其他", "不愿透露"] / ["Female", "Male", "Other", "Prefer not to say"] |
| 职业 | text | ❌ | 您的职业 | Your Occupation | placeholder: "例如：产品经理、学生、自由职业者等" / "e.g., Product Manager, Student, Freelancer" |
| 所在地 | text | ✅ | 您的所在地 | Your Location | placeholder: "例如：北京、上海、纽约等" / "e.g., Beijing, Shanghai, New York" |
| 年龄段 | choice (单选) | ✅ | 您的年龄段 | Your Age Range | ["18-25", "26-35", "36-45", "46+"] |

### 二、用户流程

```
欢迎界面 (InterviewWelcome)
    ↓
选择语言 (Language Dialog)
    ↓
发送 [READY] 消息
    ↓
显示基本信息表单 (RequestInteractionFormToolMessage)
    ↓
用户填写并提交
    ↓
AI 问候并开始正式访谈
    ↓
访谈结束时保存表单数据到 personalInfo
```

### 三、技术要点

#### 1. 表单字段控制方式（核心修改）

**推荐方案：代码侧控制（API Route 拦截）**

- **实现位置**：`src/app/(interviewProject)/(session)/api/chat/interview-agent/route.ts`
- **逻辑**：
  - 检测到用户消息为 `[READY]` 且为真人访谈时
  - 不调用 AI，直接返回预构建的 assistant 消息
  - 消息包含标准的 `requestInteractionForm` 工具调用和固定的 5 个字段
  - 根据 `locale` 参数返回对应语言的 label 和选项

**优势**：
- 完全可控，AI 无法自由发挥
- 多语言支持清晰（使用 i18n）
- 字段顺序、必填状态精确控制
- 避免 AI 先输出欢迎词的问题

#### 2. Prompt 修改

**修改内容**：
1. **删除**具体字段列表定义（第 547-549 行）
2. **删除**"可补充1-2个相关问题"的描述（第 550 行）
3. **明确指示** AI 不要输出文字，直接调用工具
4. **说明**系统会自动提供标准表单

**修改位置**：
- `src/app/(interviewProject)/prompt.ts` 第 524-552 行
- 中英文版本均需修改

#### 3. 多语言支持

**i18n 新增字段**：
- `src/app/(interviewProject)/messages/zh-CN.json`
- `src/app/(interviewProject)/messages/en-US.json`

**新增键**：
```json
"requestInteractionForm": {
  "basicInfoPrologue": "请先填写以下基本信息，以便我们更好地进行访谈",
  "nameLabel": "您的姓名",
  "genderLabel": "您的性别",
  "genderFemale": "女性",
  "genderMale": "男性",
  "genderOther": "其他",
  "genderPreferNotToSay": "不愿透露",
  "occupationLabel": "您的职业",
  "occupationPlaceholder": "例如：产品经理、学生、自由职业者等",
  "locationLabel": "您的所在地",
  "locationPlaceholder": "例如：北京、上海、纽约等",
  "ageRangeLabel": "您的年龄段"
}
```

#### 4. 必填字段验证

**前端验证**：
- 在 `RequestInteractionFormToolMessage.tsx` 中添加提交前验证
- 检查必填字段（姓名、性别、所在地、年龄段）是否已填写
- 未填写时显示错误提示，禁用提交按钮

#### 5. 数据存储

**存储位置**：
- 通过 `endInterview` 工具的 `personalInfo` 参数保存
- 最终存储在 `InterviewSession.extra.personalInfo` 中

**数据格式**：
```typescript
personalInfo: [
  { label: "姓名", text: "张三" },
  { label: "性别", text: "男性" },
  { label: "职业", text: "产品经理" },
  { label: "所在地", text: "北京" },
  { label: "年龄段", text: "26-35" }
]
```

### 四、未来扩展（TODO）

**字段可配置化**：
- 在 Setup Interview 阶段允许研究员自定义表单字段
- 配置内容包括：字段类型、label、是否必填、选项（针对 choice 类型）
- 配置存储在 `InterviewProject.extra.customFormFields` 中
- API Route 读取配置动态生成表单

**实现时机**：
- 当前版本：硬编码 5 个固定字段
- 未来版本：支持字段配置（在代码中添加 TODO 注释标记）

## 设计要求

### 表单样式
- 复用现有 `RequestInteractionFormToolMessage` 组件样式
- 保持与欢迎界面视觉风格一致
- 必填字段在 label 后显示红色星号 `*`

### 用户体验
- 表单应在页面中央显示，最大宽度 `max-w-2xl`
- 字段按顺序垂直排列，间距适中
- 选择题使用按钮组样式（gender 和 ageRange）
- 文本输入框有清晰的 placeholder 提示
- 提交按钮在表单底部右侧，disabled 状态下置灰

### 错误处理
- 必填字段未填写时，提交按钮下方显示错误提示："请填写所有必填字段"
- 使用 toast 提示用户填写完整信息

## 实现文件清单

### 需要创建的文件
- 无（复用现有组件和工具）

### 需要修改的文件

#### 核心逻辑
1. `src/app/(interviewProject)/(session)/api/chat/interview-agent/route.ts`
   - 添加 `[READY]` 消息拦截逻辑
   - 返回预构建的表单工具调用响应

2. `src/app/(interviewProject)/prompt.ts`
   - 修改 `interviewAgentSystemPrompt` 函数
   - 更新第 524-552 行访谈开场流程和真人访谈特殊要求

#### 多语言文件
3. `src/app/(interviewProject)/messages/zh-CN.json`
   - 添加表单相关字段的中文 label 和选项

4. `src/app/(interviewProject)/messages/en-US.json`
   - 添加表单相关字段的英文 label 和选项

#### 前端组件（可选）
5. `src/app/(interviewProject)/components/RequestInteractionFormToolMessage.tsx`
   - （可选）添加必填字段验证逻辑
   - （可选）优化错误提示显示

## 验收标准

### 功能验收
- [ ] 选择语言后立即显示表单，不出现欢迎词
- [ ] 表单包含 5 个固定字段，顺序和类型符合需求
- [ ] 必填字段未填写时无法提交
- [ ] 中英文切换后表单 label 和选项正确显示
- [ ] 提交后 AI 使用填写的姓名进行问候
- [ ] 表单数据正确保存到 `InterviewSession.extra.personalInfo`

### 样式验收
- [ ] 表单居中显示，最大宽度合适
- [ ] 必填字段显示红色星号标识
- [ ] 选择题按钮组样式美观，选中状态清晰
- [ ] 文本输入框 placeholder 提示清晰
- [ ] 提交按钮位置合理，状态明确

### 多语言验收
- [ ] 中文环境下所有 label 和选项为中文
- [ ] 英文环境下所有 label 和选项为英文
- [ ] 错误提示支持多语言

## 风险与注意事项

### 技术风险
1. **API Route 拦截逻辑复杂度**
   - 需要正确识别 `[READY]` 消息和访谈类型
   - 返回的响应格式必须与正常 AI 响应兼容

2. **前端状态管理**
   - 确保表单提交后消息流正确传递给 AI
   - 工具调用状态（input-available → output-available）转换正常

### 用户体验风险
1. **表单字段过长**
   - 5 个字段可能让用户感觉繁琐
   - 建议：通过清晰的 UI 设计和流畅的交互缓解

2. **必填字段过多**
   - 4 个必填字段可能导致放弃率增加
   - 建议：在欢迎界面提前说明需要填写基本信息

### 数据隐私
- 确保用户知晓数据用途（已在欢迎界面隐私协议中说明）
- 敏感字段（性别）提供"不愿透露"选项

## 开发优先级

### P0（必须实现）
- API Route 拦截逻辑和标准表单生成
- Prompt 修改（删除字段定义，明确指示）
- 多语言 i18n 文件更新
- 5 个固定字段的实现

### P1（建议实现）
- 必填字段前端验证
- 错误提示优化

### P2（未来扩展）
- 字段可配置化（TODO 标记）
- Setup Interview 阶段的表单配置 UI

## 开发记录

### v1.1 (2025-01-XX) - 核心功能实现

#### 已完成功能

**1. i18n 多语言支持**
- 文件：`src/app/(interviewProject)/messages/zh-CN.json`
- 文件：`src/app/(interviewProject)/messages/en-US.json`
- 新增字段：
  - `basicInfoPrologue` - 表单引导语
  - `nameLabel`, `genderLabel`, `occupationLabel`, `locationLabel`, `ageRangeLabel` - 字段标签
  - `genderFemale`, `genderMale`, `genderOther`, `genderPreferNotToSay` - 性别选项
  - `occupationPlaceholder`, `locationPlaceholder` - 输入提示
  - `requiredFieldsError` - 必填字段错误提示

**2. 标准表单生成函数**
- 文件：`src/app/(interviewProject)/lib.ts` (第 272-329 行)
- 函数：`generateStandardBasicInfoForm(locale: Locale)`
- 功能：
  - 根据 locale 生成对应语言的表单配置
  - 5 个固定字段：name, gender, occupation, location, ageRange
  - 使用 i18n 翻译所有 label 和选项
  - 包含 TODO 注释标记未来可配置化功能

**3. API Route 拦截逻辑**
- 文件：`src/app/(interviewProject)/(session)/api/chat/interview-agent/route.ts`
- 修改位置：第 11 行（import）和第 120-172 行（拦截逻辑）
- 实现：
  - 检测用户消息是否为 `[READY]`
  - 拦截后直接调用 `generateStandardBasicInfoForm(locale)` 生成表单
  - 创建 assistant 消息包含 `requestInteractionForm` 工具调用
  - 持久化消息到数据库
  - 返回 JSON 响应触发前端表单显示
  - 添加日志记录拦截行为

**4. 必填字段验证**
- 文件：`src/app/(interviewProject)/components/RequestInteractionFormToolMessage.tsx`
- 修改内容：
  - 新增 `requiredFieldIds` 定义必填字段集合（name, gender, location, ageRange）
  - 新增 `isFormValid` 验证逻辑
  - 提交前验证，未通过显示 toast 错误提示
  - 必填字段 label 后显示红色星号 `*`
  - 提交按钮在表单无效时 disabled

#### 技术实现细节

**字段定义方式**：
- ✅ 采用代码侧控制方案（API Route 拦截）
- ❌ 未采用 Prompt 定义方案
- 优势：完全可控、多语言友好、AI 无法自由发挥

**必填字段**：
- name (姓名) - text 类型
- gender (性别) - choice 类型，单选
- location (所在地) - text 类型
- ageRange (年龄段) - choice 类型，单选

**可选字段**：
- occupation (职业) - text 类型

**数据流**：
```
用户选择语言 → 发送 [READY]
  ↓
API Route 拦截
  ↓
生成标准表单（基于 locale）
  ↓
返回 assistant 消息（含 requestInteractionForm 工具调用）
  ↓
前端显示表单
  ↓
用户填写并提交（验证必填字段）
  ↓
表单数据保存到 formResponses
  ↓
发送给 AI 继续访谈
  ↓
访谈结束时通过 endInterview.personalInfo 保存
```

#### 待完成任务

**Prompt 修改（等待确认）**：
- 文件：`src/app/(interviewProject)/prompt.ts`
- 修改内容：删除字段定义，明确指示不输出文字直接调用工具
- 状态：暂未修改，等待与团队成员讨论

**测试**：
- [ ] 中文环境表单显示和提交
- [ ] 英文环境表单显示和提交
- [ ] 必填字段验证逻辑
- [ ] 表单数据保存到 personalInfo

#### 文件清单

**已修改文件（4个）**：
1. `src/app/(interviewProject)/messages/zh-CN.json` - 中文翻译
2. `src/app/(interviewProject)/messages/en-US.json` - 英文翻译
3. `src/app/(interviewProject)/lib.ts` - 标准表单生成函数
4. `src/app/(interviewProject)/(session)/api/chat/interview-agent/route.ts` - [READY] 拦截逻辑
5. `src/app/(interviewProject)/components/RequestInteractionFormToolMessage.tsx` - 必填字段验证

**未修改文件（暂缓）**：
- `src/app/(interviewProject)/prompt.ts` - 等待团队讨论后修改

## 版本历史

### v1.0 (初始版本)
- 创建需求文档
- 定义 5 个标准字段
- 确定技术实现方案（API Route 拦截）

### v1.1 (开发中)
- 实现核心功能：i18n、标准表单生成、API 拦截、必填验证
- 完成 5 个文件的修改
- 等待 Prompt 修改确认和功能测试

### v1.2 (Bug 修复)
- **修复单选题问题**：gender 和 ageRange 改为单选（之前是多选）
  - 新增 `selectSingleChoice` 函数处理单选逻辑
  - 新增 `singleChoiceFieldIds` 标识单选字段
  - 单选字段不显示"可多选" badge
- **修复中文表单显示问题**：`[READY]` 消息拦截时优先使用 `sessionExtra.preferredLanguage`
  - 之前：`detectInputLanguage` 检测 `[READY]` 文本导致识别为英文
  - 现在：直接使用用户在欢迎界面选择的语言

### v1.3 (核心问题修复 - 已回滚)

**注意：此版本方案已回滚，见 v1.4**


- **修复旧版本表单问题**：修改 Prompt 删除字段定义
  - 文件：`src/app/(interviewProject)/prompt.ts` (第544-548行和第645-649行)
  - 删除了旧版字段列表（姓名、称谓、职业）
  - 明确告诉 AI："不要使用 requestInteractionForm 工具，系统已自动收集"
  - 防止 AI 在刷新页面或其他情况下生成旧版表单

- **修复中英文切换bug**：语言变化时创建新 session
  - 文件：`src/app/(interviewProject)/actions.ts` (第559-577行)
  - 检测到 `preferredLanguage` 变化时，不返回已存在的 session
  - 继续执行创建新 session 的逻辑
  - 确保用户切换语言后看到全新的对应语言的表单和访谈
  - 优点：每个语言有独立的访谈记录，用户体验清晰

#### 中英文切换流程
```
场景1：首次访问，选择中文
→ 创建新 session (preferredLanguage="zh-CN")
→ 发送 [READY]
→ 显示中文表单
✅ 正常

场景2：重新进入，仍选中文
→ 返回已存在的 session
→ 显示历史消息
✅ 正常

场景3：重新进入，改选英文
→ 检测到语言变化 (zh-CN → en-US)
→ 创建新 session (preferredLanguage="en-US")
→ 发送 [READY]
→ 显示英文表单
✅ 已修复

场景4：刷新页面
→ 加载历史消息
→ AI 不会生成旧版表单（Prompt 已阻止）
✅ 已修复
```

### v1.4 (修复流式响应问题)

**问题**：v1.3 的 API Route 拦截方案导致响应格式错误
- 现象：选择语言后卡在"准备开始..."页面
- 原因：返回的是普通 JSON 而非 AI SDK 的流式响应格式
- 前端 `useChat` 无法正确处理响应

**解决方案**：恢复 Prompt 驱动的方案
- ✅ 删除 API Route 中的 `[READY]` 拦截逻辑
- ✅ 在 Prompt 中恢复字段定义，但使用新的5个字段
- ✅ 保持正常的流式响应流程
- ✅ 修复语言检测：`[READY]` 消息使用 `preferredLanguage` 而不是检测文本

**修改内容**：
1. **src/app/(interviewProject)/prompt.ts** (第544-554行和第651-661行)
   - 恢复字段定义，但更新为5个新字段
   - 明确指示 AI：立即调用工具，不要输出文字
   - 中文：姓名、性别(女性/男性/其他/不愿透露)、职业、所在地、年龄段(18-25/26-35/36-45/46+)
   - 英文：Name、Gender(Female/Male/Other/Prefer not to say)、Occupation、Location、Age Range
   - 强调：不要添加其他字段，严格按5个字段

2. **src/app/(interviewProject)/(session)/api/chat/interview-agent/route.ts** (第108-133行)
   - 删除 `[READY]` 拦截逻辑
   - 修复语言检测：检测到 `[READY]` 时使用 `preferredLanguage`
   - 保持正常的 `streamText` 流程

3. **src/app/(interviewProject)/lib.ts**
   - 删除未使用的 `generateStandardBasicInfoForm` 函数
   - 清理 import

**优势**：
- ✅ 保持原有流程稳定，不破坏 AI SDK 的响应格式
- ✅ 中英文切换正常工作
- ✅ AI 根据 locale 生成对应语言的字段
- ✅ 语言变化时创建新 session 的逻辑保持不变

**流程**：
```
用户选择语言 (preferredLanguage)
  ↓
发送 [READY]
  ↓
检测到 [READY] → 使用 preferredLanguage 作为 locale
  ↓
生成对应语言的 system prompt
  ↓
AI 根据 prompt 调用 requestInteractionForm
  ↓
生成对应语言的5个字段
  ↓
正常流式响应返回
  ↓
前端显示表单
```

---

## 版本 1.5 - 表单界面语言切换功能 (2025-01-XX)

### 需求描述

当用户已经到达表单界面时，可以通过右上角的语言切换按钮来切换语言，表单会随着语言切换而重新生成。

### 实现内容

#### 1. 创建 LanguageSwitcher 组件

**文件**：`src/app/(interviewProject)/components/LanguageSwitcher.tsx`

**功能**：
- 显示语言图标按钮（Languages icon）
- 点击打开语言选择对话框
- 支持中文（zh-CN）和英文（en-US）切换
- 显示当前选中的语言（带 Check 图标）
- 切换语言后关闭对话框并触发回调

**Props**：
- `currentLocale: Locale` - 当前语言
- `onLanguageChange: (locale: Locale) => void` - 语言切换回调
- `disabled?: boolean` - 是否禁用（流式响应时禁用）

#### 2. 添加 i18n 翻译

**修改文件**：
- `src/app/(interviewProject)/messages/zh-CN.json`
- `src/app/(interviewProject)/messages/en-US.json`

**新增键**：
```json
"languageSwitcher": {
  "title": "选择语言" / "Select Language",
  "description": "切换语言将重新生成表单，当前填写的内容将被清除" / "Switching language will regenerate the form, and your current input will be cleared"
}
```

#### 3. 实现服务端语言更新 Action

**文件**：`src/app/(interviewProject)/actions.ts` (第997-1049行)

**新增函数**：`updateInterviewSessionLanguage`

**功能**：
- 接收 `userChatToken` 和 `preferredLanguage`
- 验证用户访问权限（通过 `fetchInterviewSessionChat`）
- 更新 `InterviewSession.extra.preferredLanguage` 字段
- 返回成功/失败状态

**参数类型**：
```typescript
{
  userChatToken: string;
  preferredLanguage: Locale;
}
```

**返回类型**：`ServerActionResult<{ success: boolean }>`

#### 4. 集成到 InterviewSessionChatClient

**文件**：`src/app/(interviewProject)/(session)/interview/session/chat/[userChatToken]/InterviewSessionChatClient.tsx`

**修改内容**：

1. **新增 imports** (第3-4行和第29行)：
   ```typescript
   import { updateInterviewSessionLanguage } from "@/app/(interviewProject)/actions";
   import { LanguageSwitcher } from "@/app/(interviewProject)/components/LanguageSwitcher";
   import { useState } from "react";
   import { toast } from "sonner";
   ```

2. **语言状态管理** (第43-49行)：
   ```typescript
   const [currentLocale, setCurrentLocale] = useState<Locale>(() => {
     return preferredLanguage && VALID_LOCALES.includes(preferredLanguage as Locale)
       ? (preferredLanguage as Locale)
       : _locale;
   });
   const locale = currentLocale;
   ```

3. **语言切换处理函数** (第56-87行)：
   ```typescript
   const handleLanguageChange = useCallback(
     async (newLocale: Locale) => {
       try {
         // 1. 更新服务端语言偏好
         const result = await updateInterviewSessionLanguage({
           userChatToken,
           preferredLanguage: newLocale,
         });

         if (!result.success) {
           toast.error("Failed to update language preference");
           return;
         }

         // 2. 更新本地状态
         setCurrentLocale(newLocale);

         // 3. 清空消息以触发表单重新生成
         useChatRef.current.setMessages([]);

         // 4. 重新发送 [READY] 消息以获取新语言的表单
         setTimeout(() => {
           useChatRef.current.sendMessage({ text: "[READY]" });
         }, 100);
       } catch (error) {
         console.error("Failed to change language:", error);
         toast.error("Failed to change language");
       }
     },
     [userChatToken],
   );
   ```

4. **在表单界面添加语言切换按钮** (第236-252行)：
   ```typescript
   if (useChatHelpers.status === "ready" && requestInteractionToolInvocation) {
     return (
       <FitToViewport className="flex flex-col items-center justify-start h-full p-4 sm:p-8 relative">
         {/* Language Switcher in top-right corner */}
         <div className="absolute top-4 right-4 z-10">
           <LanguageSwitcher
             currentLocale={locale}
             onLanguageChange={handleLanguageChange}
             disabled={useChatHelpers.status === "streaming" || useChatHelpers.status === "submitted"}
           />
         </div>
         <RequestInteractionFormToolMessage
           toolInvocation={requestInteractionToolInvocation}
           addToolResult={addToolResult}
         />
       </FitToViewport>
     );
   }
   ```

### 用户流程

```
用户进入表单界面
  ↓
表单显示当前语言（中文/英文）
  ↓
用户点击右上角语言切换按钮
  ↓
打开语言选择对话框（显示中文/English选项）
  ↓
用户选择新语言
  ↓
关闭对话框
  ↓
【后端】更新 InterviewSession.extra.preferredLanguage
  ↓
【前端】更新本地语言状态
  ↓
【前端】清空所有消息
  ↓
【前端】重新发送 [READY] 消息
  ↓
【后端】根据新的 preferredLanguage 生成系统 prompt
  ↓
【AI】调用 requestInteractionForm 工具生成新语言的表单
  ↓
【前端】显示新语言的表单（用户之前填写的数据已清除）
```

### 技术要点

1. **状态管理**：
   - 使用 `useState` 维护当前语言状态
   - 语言切换时更新本地状态和服务端状态

2. **消息流控制**：
   - `setMessages([])` 清空消息历史
   - `sendMessage({ text: "[READY]" })` 触发新表单生成
   - 100ms 延迟确保状态更新完成

3. **用户体验**：
   - 语言切换按钮显示 Languages 图标
   - 流式响应时禁用按钮（避免冲突）
   - Toast 提示更新失败
   - 对话框显示当前选中语言

4. **数据清除策略**：
   - 用户切换语言时，清空所有消息
   - 表单重新生成，之前填写的数据丢失
   - 这是预期行为（用户在切换语言前应被告知）

### 优势

- ✅ 用户无需返回欢迎界面即可切换语言
- ✅ 表单内容随语言实时更新
- ✅ 利用现有的 [READY] 机制，无需额外逻辑
- ✅ 服务端状态和前端状态保持一致
- ✅ 清晰的用户提示（对话框描述）

### 注意事项

1. **数据丢失警告**：
   - 对话框中明确告知用户切换语言会清除当前填写的内容
   - 中文："切换语言将重新生成表单，当前填写的内容将被清除"
   - 英文："Switching language will regenerate the form, and your current input will be cleared"

2. **权限验证**：
   - `updateInterviewSessionLanguage` 通过 `fetchInterviewSessionChat` 验证访问权限
   - 确保只有当前会话的参与者可以修改语言设置

3. **日志记录**：
   - 语言更新失败时记录详细错误日志（包括 userChatToken 和 preferredLanguage）
   - 便于排查问题
