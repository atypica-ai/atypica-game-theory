# selectQuestion 工具不显示表单的问题分析

## 问题描述
选择题在访谈过程中，AI 并不是每次都会调用前端表单组件来展示选项，而是直接以文字形式提问。

## 问题根源

**不是提示词的问题，也不是 tool 调用的问题，而是数据结构的问题。**

## 数据流程

### 1. 用户创建/编辑问题
- 用户在前端 `EditQuestionDialog` 编辑问题
- 保存时传递 `QuestionData`，包含：`text`, `questionType`, `options`, `image`
- 调用 `updateInterviewQuestion` 保存到 `project.extra.questions`

### 2. 创建访谈 Session
- 调用 `createHumanInterviewSession` 或 `createPersonaInterviewSession`
- 从 `project.extra.questions` 读取问题
- 调用 `createQuestionsSnapshot(projectQuestions)`
- `generateFormFieldsForQuestion` 根据 `questionType` 和 `options` 生成 `formFields`
- 将带 `formFields` 的问题保存到 `session.extra.questions`

### 3. 访谈过程中
- AI 调用 `selectQuestion` 工具
- 返回 `question.formFields`
- 前端 `SelectQuestionToolMessage` 根据 `formFields` 渲染表单

## 关键代码

### `generateFormFieldsForQuestion` (actions.ts:31-66)

```typescript
function generateFormFieldsForQuestion(question: Question, questionIndex: number) {
  const { text, questionType = "open", options } = question;

  // Open-ended questions: single text field
  if (questionType === "open") {
    return [
      {
        id: `answer`,
        label: text,
        type: "text" as const,
      },
    ];
  }

  // Single-choice or multiple-choice questions
  if ((questionType === "single-choice" || questionType === "multiple-choice") && options) {
    return [
      {
        id: `answer`,
        label: text,
        type: "choice" as const,
        options,
        multipleChoice: questionType === "multiple-choice",
      },
    ];
  }

  // Fallback: treat as open-ended
  return [
    {
      id: `answer`,
      label: text,
      type: "text" as const,
    },
  ];
}
```

**第 46 行的条件是关键：**
```typescript
if ((questionType === "single-choice" || questionType === "multiple-choice") && options)
```

即使用户在前端设置了 `questionType` 为选择题，如果 `options` 为空数组或 undefined，就会 fallback 到开放式问题！

## 可能的原因

1. **旧的问题数据**：在添加 `questionType` 和 `options` 支持之前创建的问题，只有 `text` 字段
2. **用户没有编辑问题**：用户直接使用了默认创建的问题，没有手动设置问题类型和选项
3. **数据不完整**：某些问题的 `questionType` 设置了但 `options` 为空

## 前端验证逻辑

前端在保存时有验证（EditQuestionDialog.tsx:121-132）：

```typescript
if (questionType === "single-choice" || questionType === "multiple-choice") {
  const validOptions = options.filter((opt) => opt.trim().length > 0);

  if (validOptions.length < 2) {
    toast.error(t("atLeastTwoOptions"));
    return;
  }

  if (validOptions.length > 15) {
    toast.error(t("atMostFourOptions"));
    return;
  }

  onSave({
    text: text.trim(),
    image,
    questionType,
    options: validOptions,
  });
}
```

前端验证是正确的，至少需要 2 个选项才能保存。

## 解决方案

### 方案 1: 检查现有数据
1. 查看数据库中问题的实际结构
2. 检查是否有问题缺少 `questionType` 或 `options` 字段
3. 手动编辑这些问题，添加选项

### 方案 2: 数据迁移
为所有缺少 `questionType` 和 `options` 的问题设置默认值

### 方案 3: 后端容错
修改 `generateFormFieldsForQuestion`，为没有设置类型的问题智能推断（但不够准确）

## 调试步骤

1. 在访谈过程中，找到一个不显示表单的问题
2. 查看数据库中这个问题的完整数据结构：
   ```sql
   SELECT extra FROM "InterviewSession" WHERE id = <session_id>;
   ```
3. 检查 `extra.questions[index]` 是否包含：
   - `questionType`: "single-choice" 或 "multiple-choice"
   - `options`: 至少 2 个选项的数组
4. 如果缺少这些字段，手动编辑问题补充即可

## 提示词无关性

提示词中已经有清晰的指示（prompt.ts:481-492）：

```
**使用 selectQuestion 工具提问**：
- 工具调用格式：selectQuestion({ questionIndex: 1 })（使用 1-based 索引）
- 每个问题只能选择一次，重复选择会报错
- 可以根据对话流程灵活选择提问顺序，不必按编号顺序
- 工具会自动展示预生成的表单，等待用户回答
- 用户提交答案后，你会收到包含问题和答案的 tool output

**重要提醒**：
- 使用 selectQuestion 工具时，不要在同一轮对话中输出额外的文字
- 只调用工具即可，让工具自动展示问题表单
- 等待用户回答后，再根据答案进行自然的追问或继续下一个问题
```

AI 的行为是正确的：调用 `selectQuestion` 工具，工具返回 `formFields`，前端根据 `formFields` 渲染。

**问题在于数据层，而不是 AI 或提示词层。**
