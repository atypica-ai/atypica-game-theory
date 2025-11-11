# 访谈选择题 UI 升级需求文档

## 需求概述

为访谈过程中的选择题（单选题和多选题）设计专门的 UI 组件，提升用户体验。AI 通过 `requestInteractionForm` 工具自主判断题目类型并呈现相应的 UI。

## 需求背景

### 当前问题

1. **单选题和多选题使用相同的 UI**：没有区分单选和多选的视觉差异
2. **多选题缺少提交按钮状态管理**：
   - 当 0 个选项被选择时，OK 按钮应为灰色（禁用）
   - 当 ≥1 个选项被选择时，OK 按钮应为绿色（可点击）
3. **UI 不够直观**：用户无法快速区分单选和多选题

### 设计参考

参考截图：
- **单选题**：例如 "What is your gender?" - 只能选择一个选项
- **多选题**：例如 "What is your ethnicity?" - 可选择多个选项，选中的选项显示 checkmark，底部有 OK 按钮

## 需求详情

### 一、单选题 UI 组件

**特点**：
- 选项以按钮形式展示
- 只能选择一个选项
- 选中的选项高亮显示
- 点击选项后立即提交（无需 OK 按钮）
- 不影响 interview 页面的整体 layout

**设计要求**：
- 选项按钮样式：`variant="outline"`（未选中）/ `variant="default"`（选中）
- 选中状态：显示 checkmark 图标
- 响应式布局：使用 grid 布局适配不同屏幕

### 二、多选题 UI 组件

**特点**：
- 选项以按钮形式展示
- 可选择多个选项
- 选中的选项显示 checkmark
- 底部有 OK 按钮用于提交
- OK 按钮状态根据选择数量动态变化
- 不影响 interview 页面的整体 layout

**设计要求**：
- 选项按钮样式：与单选题相同
- **OK 按钮状态**：
  - 0 个选项选中：灰色背景 `bg-zinc-300 dark:bg-zinc-700`，禁用状态，文字颜色 `text-zinc-500`
  - ≥1 个选项选中：绿色背景 `bg-green-600 hover:bg-green-700`，可点击，文字颜色 `text-white`
- OK 按钮文字：使用 i18n（"OK" / "确定"）

### 三、题目类型识别

**当前机制**：
- AI 根据问题内容和访谈需求自主判断使用单选题或多选题
- 通过 `requestInteractionForm` 工具的 `type: "choice"` 字段创建选择题
- **单选 vs 多选区分**：
  - 前端通过 `singleChoiceFieldIds` Set 判断（目前硬编码为 `["gender", "ageRange"]`）
  - 需要改进为更通用的判断机制

**改进方案**（待讨论）：
- 方案 A：扩展工具 schema，增加 `multipleChoice: boolean` 字段
- 方案 B：在 prompt 中指导 AI 使用特定的 field id 前缀/后缀标识
- **当前采用**：保持现有机制，但将判断逻辑改为基于选项数量或其他启发式规则

### 四、技术实现要点

#### 1. 组件位置
- 修改现有的 `RequestInteractionFormToolMessage.tsx` 组件
- 不创建新组件，保持代码集中

#### 2. 样式要求
- 遵循 Tailwind CSS v4 规范
- 使用 `cn()` 工具函数组合样式
- 使用项目主题色（`bg-background`, `text-foreground` 等）
- OK 按钮使用绿色（`bg-green-600`）作为特殊强调色

#### 3. 国际化
- OK 按钮文字需要 i18n 支持
- 在 `zh-CN.json` 和 `en-US.json` 中添加翻译

#### 4. 状态管理
- 使用 `useState` 管理选项选择状态
- 使用 `useMemo` 计算 OK 按钮是否可用
- 保持现有的 `addToolResult` 提交逻辑

## 开发计划

### Phase 1: 准备工作
- [x] 创建开发文档
- [ ] 添加 i18n 翻译
- [ ] 分析现有代码结构

### Phase 2: UI 组件开发
- [ ] 重构 choice 字段渲染逻辑
- [ ] 实现单选题 UI（立即提交）
- [ ] 实现多选题 UI（带 OK 按钮）
- [ ] 实现 OK 按钮状态管理

### Phase 3: 测试与优化
- [ ] 测试单选题功能
- [ ] 测试多选题功能
- [ ] 测试 OK 按钮状态切换
- [ ] 测试响应式布局

---

## 开发记录

### v1.2 - 添加多选题支持 (2025-01-07)

#### 功能描述
扩展 `requestInteractionForm` 工具，支持多选题（允许用户选择多个选项）。

**v1.2.2 更新**：统一选中样式为黑色背景
- 所有选择题（单选/多选）选中时使用**黑色背景 + 白色文字 + ✓ 图标**
- 深色模式下使用**白色背景 + 黑色文字 + ✓ 图标**
- 未选中时保持 outline 样式（边框）

**v1.2.1 更新**：添加多选题样式配置选项
- 提供两种多选题 UI 样式供选择
- 通过 `MULTIPLE_CHOICE_STYLE` 常量切换
- **样式 A**：垂直布局，与单选题一致
- **样式 B**：两列布局，符合原型图设计

#### 修改文件列表
- `src/app/(interviewProject)/tools/types.ts` - 添加 `multipleChoice` 字段到 schema
- `src/app/(interviewProject)/components/RequestInteractionFormToolMessage.tsx` - 使用 `multipleChoice` 字段判断题型
- `src/app/(interviewProject)/prompt.ts` - 更新中英文 prompt，说明如何使用多选题

#### 详细修改内容

**1. Schema 扩展**（tools/types.ts 第 53-58 行）

添加 `multipleChoice` 字段到 field 对象：
```typescript
multipleChoice: z
  .boolean()
  .optional()
  .describe(
    "For choice fields: true if multiple options can be selected, false or undefined for single choice",
  ),
```

**2. 组件逻辑修改**（RequestInteractionFormToolMessage.tsx 第 190-192 行）

修改单选/多选判断逻辑：
```typescript
// 从：: true; // Interview questions are single-choice by default
// 改为：: !field.multipleChoice; // Use the multipleChoice field from AI
```

**3. Prompt 更新**

**中文版本**（prompt.ts 第 504-506 行）：
```
- **单选题**：默认行为，multipleChoice 设为 false 或不设置，选项互斥
- **多选题**：设置 multipleChoice: true，允许用户选择多个选项（例如：种族、兴趣爱好等）
```

**英文版本**（prompt.ts 第 613-614 行）：
```
- **Single-choice**: Default behavior, set multipleChoice to false or leave unset, options are mutually exclusive
- **Multiple-choice**: Set multipleChoice: true, allows users to select multiple options (e.g., ethnicity, hobbies)
```

#### UI 效果

**所有选择题统一样式**：

**选中状态**：
- **黑色背景** + 白色文字 + ✓ 图标（亮色模式）
- **白色背景** + 黑色文字 + ✓ 图标（深色模式）

**未选中状态**：
- outline 边框样式
- 透明背景

**单选题**：
- **垂直布局**（`grid-cols-1`，一行一个选项）
- 只能选择一个选项
- 选中时：黑色背景 + 白色文字 + ✓ 图标
- OK 按钮在选中后可点击

**多选题**：

**样式 A（`MULTIPLE_CHOICE_STYLE = "A"`）**：
- **垂直布局**（`grid-cols-1`，一行一个选项）
- 可选择多个选项
- 选中时：黑色背景 + 白色文字 + ✓ 图标
- OK 按钮状态：
  - 0 个选项：灰色，禁用
  - ≥1 个选项：绿色，可点击

**样式 B（`MULTIPLE_CHOICE_STYLE = "B"`）**：
- **两列布局**（`grid-cols-2`）
- 可选择多个选项
- 选中时：黑色背景 + 白色文字 + ✓ 图标
- OK 按钮状态：
  - 0 个选项：灰色，禁用
  - ≥1 个选项：绿色，可点击

**基本信息表单**：
- 两列布局（`grid-cols-2`）
- 选中时：黑色背景 + 白色文字 + ✓ 图标

#### 如何切换多选题样式

1. 打开文件：`src/app/(interviewProject)/components/RequestInteractionFormToolMessage.tsx`
2. 找到第 29 行的配置常量：
   ```typescript
   const MULTIPLE_CHOICE_STYLE: "A" | "B" = "A";
   ```
3. 修改为：
   - `"A"` - 使用样式 A（垂直布局 + 绿色背景）
   - `"B"` - 使用样式 B（两列布局 + outline 样式）
4. 保存文件，刷新页面即可看到效果

**对比表格**：

| 特性 | 样式 A | 样式 B |
|------|--------|--------|
| 布局 | 垂直（1列） | 两列 |
| 选中效果 | 黑色背景 + 白色文字 + ✓ | 黑色背景 + 白色文字 + ✓ |
| 视觉一致性 | 与单选题一致 | 符合原型图 |
| 推荐场景 | 选项较多时 | 选项较少时 |

---

### v1.1 - 修复多选择题问题 (2025-01-07)

#### 问题描述
当 AI 同时调用多个 `requestInteractionForm` 展示多个选择题时，用户点击任何一个题目的 OK 按钮都会提交所有表单，导致未回答的题目也被提交。

#### 解决方案
采用**双重保护机制**：
1. **Prompt 约束**：在 AI 的 system prompt 中明确要求一次只展示一个选择题
2. **组件兜底**：在组件逻辑中检测多选择题情况并自动调整 UI

#### 修改文件列表
- `src/app/(interviewProject)/components/RequestInteractionFormToolMessage.tsx` - 添加多选择题检测和统一 OK 按钮
- `src/app/(interviewProject)/prompt.ts` - 修改中英文 prompt，要求 AI 一次只展示一个选择题

#### 详细修改内容

**1. 组件层面修改**（RequestInteractionFormToolMessage.tsx）

**1.1 添加选择题计数逻辑**（第 153-157 行）
```typescript
const choiceFieldsCount = useMemo(() => {
  if (isBasicInfoForm || !toolInvocation.input?.fields) return 0;
  return toolInvocation.input.fields.filter((f) => f.type === "choice").length;
}, [isBasicInfoForm, toolInvocation.input]);
```

**1.2 修改单个选择题的 OK 按钮显示条件**（第 254 行）
```typescript
// 从：isInterviewQuestion && !isCompleted
// 改为：isInterviewQuestion && !isCompleted && choiceFieldsCount === 1
```
只有当表单中只有 1 个选择题时，才在题目下方显示 OK 按钮。

**1.3 添加统一的 OK 按钮**（第 342-364 行）
当访谈问题中有多个选择题时，在所有题目下方显示统一的 OK 按钮：
- 使用 `isFormValid` 验证所有必填字段都已填写
- OK 按钮状态：所有题目都回答后才能点击
- 点击后提交整个表单

**2. Prompt 层面修改**（prompt.ts）

**2.1 中文版本**（第 504 行）
```typescript
- // 旧：可以在一个表单中组合多个相关的选择题
+ // 新：**重要：一次只展示一个选择题**，不要在一个表单中组合多个选择题，以确保用户逐题回答
```

**2.2 英文版本**（第 611 行）
```typescript
- // 旧：You can combine multiple related choice questions in one form
+ // 新：**Important: Present only one choice question at a time**, do not combine multiple choice questions in one form to ensure users answer each question individually
```

#### 效果验证

**场景 1：单个选择题（正常情况）**
- OK 按钮显示在题目下方
- 选择选项后即可点击提交

**场景 2：多个选择题（兜底保护）**
- 每个题目下方不显示 OK 按钮
- 所有题目下方显示统一的 OK 按钮
- 必须回答所有题目后才能提交

---

### v1.0 - 初始开发 (2025-01-06)

#### 修改文件列表
- `src/app/(interviewProject)/components/RequestInteractionFormToolMessage.tsx` - 核心组件重构
- `src/app/(interviewProject)/messages/zh-CN.json` - 添加中文翻译
- `src/app/(interviewProject)/messages/en-US.json` - 添加英文翻译

#### 详细修改内容

**1. 添加 i18n 翻译**

在 `zh-CN.json` 和 `en-US.json` 的 `requestInteractionForm` 部分添加：
```json
{
  "ok": "确定" / "OK",
  "selectAtLeastOne": "请至少选择一个选项" / "Please select at least one option"
}
```

**2. 重构 RequestInteractionFormToolMessage 组件**

**2.1 修改 `selectSingleChoice` 函数**（第67-73行）
- 简化函数，只负责更新选项状态
- **移除自动提交逻辑**：单选题和多选题都需要用户点击 OK 按钮确认

```typescript
const selectSingleChoice = useCallback((fieldId: string, option: string) => {
  setFormResponses((prev) => ({
    ...prev,
    [fieldId]: option,
  }));
}, []);
```

**2.2 添加表单类型判断**（第167-173行）
- 新增 `isBasicInfoForm` 判断逻辑
- 通过检查是否包含 "name" 和 "gender" 字段来区分基本信息表单和访谈问题表单

```typescript
const isBasicInfoForm = useMemo(() => {
  const fieldIds = toolInvocation.input?.fields.map((f) => f.id) || [];
  return fieldIds.includes("name") && fieldIds.includes("gender");
}, [toolInvocation.input]);
```

**2.3 重构 choice 字段渲染逻辑**（第181-262行）

**判断单选/多选**：
- 基本信息表单：使用硬编码的 `singleChoiceFieldIds`（gender, ageRange）
- 访谈问题：**默认为单选题**（假设 AI 会为需要多选的情况创建单独的问题）

**基本信息表单行为**：
- **始终使用两列布局**：性别、年龄段等字段都保持 `grid-cols-2`
- 不显示 OK 按钮（由底部的"提交表单"按钮统一提交）

**访谈问题 - 单选题行为**：
- **垂直布局**：选项一行一个，使用 `grid-cols-1`
- 点击选项只更新选中状态
- **选项样式**：选中时显示绿色背景（`variant="default"`）+ ✓ 图标
- **需要 OK 按钮**：用户点击 OK 后提交并跳转到下一题

**访谈问题 - 多选题行为**：
- **垂直布局**：选项一行一个，使用 `grid-cols-1`（与单选题保持一致）
- 可选择多个选项
- **选项样式**：选中时显示绿色背景（`variant="default"`）+ ✓ 图标（与单选题保持一致）
- 选项下方显示独立的 OK 按钮
- OK 按钮状态：
  - 0 个选项选中：灰色 `bg-zinc-300 dark:bg-zinc-700`，禁用，文字颜色 `text-zinc-500`
  - ≥1 个选项选中：绿色 `bg-green-600 hover:bg-green-700`，可点击，文字颜色 `text-white`

**代码结构**：
```typescript
case "choice": {
  const isSingleChoice = isBasicInfoForm
    ? singleChoiceFieldIds.has(field.id)
    : true; // 访谈问题默认单选

  const isInterviewQuestion = !isBasicInfoForm;
  const hasSelection = isSingleChoice
    ? !!fieldValue
    : Array.isArray(fieldValue) && fieldValue.length > 0;

  return (
    <div>
      {/* 选项按钮 - 基本信息表单始终两列，访谈问题根据题型调整布局 */}
      <div
        className={cn(
          "grid gap-2",
          // 基本信息表单：始终使用两列布局
          // 访谈问题：单选题垂直布局，多选题两列布局
          isBasicInfoForm ? "grid-cols-2" : isSingleChoice ? "grid-cols-1" : "grid-cols-2",
        )}
      >
        {field.options?.map((option, index) => (
          <Button
            onClick={() => {
              if (isSingleChoice) {
                selectSingleChoice(field.id, option);
              } else {
                toggleChoiceOption(field.id, option);
              }
            }}
          />
        ))}
      </div>

      {/* 访谈问题的 OK 按钮（单选题和多选题都需要） */}
      {isInterviewQuestion && !isCompleted && (
        <div className="flex justify-center pt-2">
          <Button
            onClick={() => hasSelection ? submitForm() : toast.error(t("selectAtLeastOne"))}
            disabled={!hasSelection}
            className={cn(
              "min-w-24",
              hasSelection
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-zinc-300 dark:bg-zinc-700 text-zinc-500 cursor-not-allowed",
            )}
          >
            {t("ok")}
          </Button>
        </div>
      )}
    </div>
  );
}
```

**2.4 隐藏访谈问题的底部提交按钮**（第320-326行）
- 基本信息表单：显示底部的"提交表单"按钮
- 访谈问题：隐藏底部按钮（因为每个选择题都有自己的 OK 按钮）

```typescript
{!isFormCompleted && isBasicInfoForm && (
  <div className="flex justify-end pt-4 border-t">
    <Button onClick={submitForm} disabled={!isFormValid}>
      {t("submitForm")}
    </Button>
  </div>
)}
```

#### 技术亮点

1. **差异化布局策略**：
   - 基本信息表单：两列布局（`grid-cols-2`）
   - 访谈问题（单选/多选）：统一使用垂直布局（`grid-cols-1`，一行一个选项）
2. **表单类型自动识别**：通过字段 ID 判断，无需额外配置
3. **状态驱动的按钮样式**：使用 `cn()` 和条件类名动态切换 OK 按钮样式
4. **容错处理**：未选择任何选项时点击 OK 显示 toast 提示
5. **统一的确认流程**：访谈问题的单选题和多选题都需要用户点击 OK 按钮确认

#### 注意事项

1. **单选/多选判断**：访谈问题中的 choice 字段通过 `multipleChoice` 字段判断
   - `multipleChoice: true` - 多选题，允许选择多个选项
   - `multipleChoice: false` 或未设置 - 单选题（默认），只能选择一个选项

2. **基本信息表单识别**：通过 `name` 和 `gender` 字段判断
   - 如果未来基本信息表单结构改变，需要更新判断逻辑

3. **OK 按钮颜色**：使用绿色（`bg-green-600`）而非主题色
   - 这是有意设计，用于强调提交动作

4. **多选择题处理**（2024-01-XX 新增）：
   - **Prompt 约束**：要求 AI 一次只展示一个选择题，避免在一个表单中组合多个选择题
   - **组件兜底**：如果 AI 违反规则展示了多个选择题，组件会自动调整：
     - 移除每个题目的独立 OK 按钮
     - 在所有题目下方显示统一的 OK 按钮
     - 验证所有选择题都已回答后才允许提交

---

## 技术规范

### 代码规范
- 遵循 CLAUDE.md 中的所有规范
- 使用 TypeScript 严格类型
- 使用 `cn()` 组合样式
- 组件使用 React Hooks（`useState`, `useMemo`, `useCallback`）

### 样式规范
- 使用 Tailwind CSS v4
- 响应式设计：使用 `grid-cols-2` 或 `grid-cols-1` 根据屏幕大小
- 主题适配：支持 dark mode
- 间距一致：使用 `space-y-*`, `gap-*` 等

### 测试要点
- 单选题：点击后立即提交，无需 OK 按钮
- 多选题：可选择多个，必须点击 OK 提交
- OK 按钮：0 选中时禁用，≥1 选中时启用
- 响应式：在不同屏幕尺寸下布局正常

---

## 未来优化方向

1. **题目类型识别优化**：
   - 扩展 `requestInteractionFormInputSchema` 增加 `multipleChoice` 字段
   - 修改 prompt 指导 AI 明确标识单选/多选

2. **动画效果**：
   - 选项选中/取消的过渡动画
   - OK 按钮状态切换的颜色过渡

3. **无障碍支持**：
   - 添加 ARIA 标签
   - 键盘导航支持

4. **题目进度提示**（与进度条需求关联）：
   - 显示 "Question X of Y"
   - 进度条集成
