# 访谈问题占位符机制开发文档

## 需求概述

实现访谈系统中的问题占位符机制，使 AI 能够严格按照预设的 `questions[]` 数组顺序提问，支持开放题和选择题（单选/多选）。

## 核心需求

1. **占位符机制**：AI 输出 `{{NEXT_QUESTION}}` 占位符，系统自动替换为实际题目
2. **问题类型支持**：
   - 开放题（open）：用户在聊天框直接回答
   - 单选题（single-choice）：调用 `requestInteractionForm` 组件展示选项
   - 多选题（multiple-choice）：调用 `requestInteractionForm` 组件，允许多选
3. **图片支持**：题目可以包含图片，需要展示
4. **严格顺序**：按照 `questions[]` 数组顺序提问，前端/后端维护 `currentQuestionIndex`
5. **结束判定**：当 `currentQuestionIndex === questions.length` 时调用 `endInterview`

## 技术决策过程

### 决策1：占位符替换位置（前端 vs 后端）

#### 方案A：前端替换
- AI 输出 `{{NEXT_QUESTION}}`
- 前端检测占位符，从 `questions[]` 取题目
- 根据 `questionType` 决定展示方式

**缺点**：
- 替换后的内容不会保存到数据库，刷新页面后丢失
- 前端维护 `currentQuestionIndex`，刷新页面会丢失状态
- AI 的消息历史中仍然是占位符，AI 不知道实际问了什么题目

#### 方案B：后端替换 ✅ **（已选用）**
- AI 输出 `{{NEXT_QUESTION}}`
- **后端流式处理**：在 `route.ts` 中检测占位符
- 后端维护 `currentQuestionIndex`（存在 `InterviewSession.extra` 中）
- 替换为实际题目文本，保存到数据库
- AI 能看到完整的题目内容

**优点**：
- 数据一致性：替换后的内容保存到数据库
- AI 上下文正确：AI 能看到实际题目和答案
- 状态管理集中：`currentQuestionIndex` 存在后端，不怕刷新

**选择理由**：方案B 保证了数据一致性和 AI 上下文的正确性

### 决策2：题目类型处理方式

#### 方案A：系统自动调用 requestInteractionForm ✅ **（已选用）**
- 检测到选择题时，系统自动插入 `requestInteractionForm` tool call
- AI 不需要在输出时理解 questionType
- 用户回答后，将题目+答案一起返回给 AI

#### 方案B：AI 自己调用 requestInteractionForm
- AI 看到完整题目（包括 questionType 和 options）
- AI 根据 questionType 自己决定是否调用 `requestInteractionForm`
- 在 prompt 中说明机制

**选择理由**：
- 方案A 更简单可靠，系统统一处理题目类型
- AI 只需要输出占位符，不需要理解题目内容
- 但 AI 最终能看到完整的"题目+答案"，用于生成报告

**实现细节**：
1. AI 输出 `{{NEXT_QUESTION}}` 占位符
2. 系统检测占位符，获取 `questions[currentQuestionIndex]`
3. 根据 `questionType` 处理：
   - **开放题**：替换为题目文本，展示给用户，AI 继续对话
   - **选择题**：替换为题目文本，**同时自动调用 `requestInteractionForm`**
4. 用户回答后，**将"题目：XXX\n答案：XXX"格式的消息返回给 AI**
5. AI 基于题目和答案继续对话

### 决策3：占位符替换的技术实现

#### 挑战
- AI SDK 的 `streamText` 返回流式响应
- 需要在流中实时检测 `{{NEXT_QUESTION}}`
- 检测到后需要替换为题目文本

#### 考虑的方案

**方案A：使用 experimental_transform**
- 在流式输出时实时检测和替换
- 问题：`experimental_transform` 主要用于平滑输出，不适合复杂的文本替换逻辑

**方案B：在 onStepFinish 中处理**
- `onStepFinish` 时有完整文本
- 可以检测和替换占位符
- 可以修改已保存的消息
- 问题：用户会先看到占位符，然后才看到替换后的内容（体验不佳）

**方案C：自定义 transform 函数 ✅ **（计划采用）**
- 创建自定义的流转换函数
- 在流中检测 `{{NEXT_QUESTION}}`
- 实时替换为题目文本
- 更新 `currentQuestionIndex` 到数据库

## 数据结构变更

### InterviewSessionExtra 新增字段

```typescript
export type InterviewSessionExtra = Partial<{
  // ... 原有字段
  currentQuestionIndex: number; // 当前问题索引（用于占位符机制）
}>;
```

### Question 完整结构

```typescript
{
  text: string;
  image?: {
    objectUrl: string;
    name: string;
    mimeType: string;
    size: number;
  };
  questionType?: "open" | "single-choice" | "multiple-choice";
  options?: string[];  // 选择题的选项（2-4个）
}
```

## 实现步骤

### 已完成 ✅

1. **修改 prompt.ts**
   - 将 `questions?: string[]` 改为完整的 `Question[]` 对象
   - 移除 `questionTypePreference` 参数
   - 添加占位符机制说明
   - 说明 AI 应该输出 `{{NEXT_QUESTION}}` 占位符
   - 说明系统会自动替换占位符
   - 说明 AI 应根据 questionType 决定是否调用 `requestInteractionForm`

2. **更新调用处**
   - `route.ts`: 传入完整的 `questions` 对象而非只传 `text`
   - `auto-persona.ts`: 同样更新

3. **添加类型定义**
   - `InterviewSessionExtra` 添加 `currentQuestionIndex` 字段

4. **实现 requestInteractionForm 图片支持**
   - 添加 `image` 字段到 schema
   - 前端组件显示图片

### 进行中 🚧

5. **实现后端占位符检测和替换**
   - 在 `route.ts` 中实现流式处理中的占位符检测
   - 替换占位符为实际题目文本
   - 更新 `currentQuestionIndex` 到数据库

### 待实现 📋

6. **测试完整流程**
   - 测试开放题提问和回答
   - 测试单选题提问和回答
   - 测试多选题提问和回答
   - 测试图片题目展示
   - 测试问题索引追踪
   - 测试访谈结束判定

## 关键技术点

### 占位符检测和替换流程

```
1. AI 生成文本流，包含 {{NEXT_QUESTION}}
2. 流转换函数检测到占位符
3. 从 InterviewSession.extra.currentQuestionIndex 获取当前索引
4. 从 project.extra.questions[currentQuestionIndex] 获取题目
5. 替换占位符为题目文本
6. 更新 currentQuestionIndex++
7. 保存到数据库
8. 继续流式输出
```

### 选择题处理流程

```
1. AI 输出 {{NEXT_QUESTION}}
2. 系统检测到占位符，获取 questions[currentQuestionIndex]
3. 判断 questionType：
   - 如果是 "single-choice" 或 "multiple-choice"
4. 系统自动调用 requestInteractionForm 工具：
   - field.id: 使用题目索引 + 1（"1", "2", "3"...）
   - field.label: question.text
   - field.type: "choice"
   - field.options: question.options
   - field.multipleChoice: questionType === "multiple-choice"
   - image: question.image（如果有）
5. 将占位符替换为题目文本（给用户看）
6. 用户在表单中选择答案
7. 系统将"题目：XXX\n答案：XXX"格式的消息注入给 AI
8. AI 继续对话
```

## 待解决的问题

### 问题1：占位符替换的时机

**当前方案**：
- 在流式输出中实时检测和替换
- 需要处理跨 chunk 的占位符（`{{NEXT_` 在一个 chunk，`QUESTION}}` 在另一个）

**技术实现**：
- 维护一个 buffer 缓存最近的文本
- 检测完整的 `{{NEXT_QUESTION}}` 模式
- 替换后清空 buffer

## 文件变更清单

### 已修改文件

1. `src/app/(interviewProject)/prompt.ts`
   - 修改 `interviewAgentSystemPrompt` 函数签名
   - 更新中文和英文 prompt

2. `src/app/(interviewProject)/(session)/api/chat/interview-agent/route.ts`
   - 更新 `interviewAgentSystemPrompt` 调用

3. `src/app/(interviewProject)/(session)/api/chat/interview-agent/auto-persona.ts`
   - 更新 `interviewAgentSystemPrompt` 调用

4. `src/types/prisma.d.ts`
   - 添加 `currentQuestionIndex` 字段

5. `src/app/(interviewProject)/tools/types.ts`
   - 添加 `image` 字段到 `requestInteractionFormInputSchema`

6. `src/app/(interviewProject)/components/RequestInteractionForm/RequestInteractionFormToolMessage.tsx`
   - 添加图片显示逻辑

### 待修改文件

1. `src/app/(interviewProject)/(session)/api/chat/interview-agent/route.ts`
   - 实现占位符检测和替换逻辑

## 风险和注意事项

1. **流式处理的复杂性**
   - 占位符可能跨多个 chunk
   - 需要careful处理 buffer 和边界情况

2. **数据库更新时机**
   - `currentQuestionIndex` 更新需要及时
   - 避免并发更新冲突

3. **AI 理解题目类型**
   - 需要确保 AI 能正确理解题目类型
   - prompt 需要清晰说明

4. **用户体验**
   - 占位符替换要实时，不能让用户看到 `{{NEXT_QUESTION}}`
   - 流式输出要自然流畅

## 后续优化方向

1. **更智能的题目类型识别**
   - 可以考虑使用 structured output
   - 或者在 prompt 中使用更明确的格式

2. **更好的错误处理**
   - 如果 `currentQuestionIndex` 超出范围
   - 如果题目格式不正确

3. **支持题目跳过**
   - 允许 AI 根据对话情况跳过某些题目
   - 需要更复杂的状态管理

4. **支持题目回顾**
   - 允许用户查看已回答的题目
   - 允许修改之前的答案
