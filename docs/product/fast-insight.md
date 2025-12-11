# Fast Insight (快速洞察) 功能文档

## 概述

Fast Insight 是 atypica.AI 的快速研究和播客生成功能，专注于快速生成高质量、观点导向的播客内容。通过自动化的多步骤 AI 工作流程，该功能能够将用户的研究主题转化为结构化的播客音频和脚本。

## 功能定位

Fast Insight 是三种研究类型之一：
- **常规研究** (General Study): 全面的商业研究，关注主观因素和决策建模
- **产品研发** (Product R&D): 专注于产品创意探索和验证
- **快速洞察** (Fast Insight): 快速生成播客导向的深度研究内容

## 工作流程

Fast Insight 采用严格的五阶段自动化流程：

### 阶段 1：主题理解和明确
- **目标**: 深入理解用户的研究请求
- **工具**: webSearch（限用 1 次）
- **任务**:
  - 快速收集主题相关的背景信息
  - 了解最新动态和关键概念
  - 为后续规划准备充足的上下文信息

### 阶段 2：播客规划
- **目标**: 制定播客内容策略和搜索策略
- **工具**: planPodcast
- **任务**:
  - 基于阶段 1 收集的信息规划播客内容
  - 分析最能吸引听众的角度
  - 确定核心问题和研究方向
  - 自动保存分析师配置（类型固定为 `opinionOriented` - 观点导向）

### 阶段 3：深度研究
- **目标**: 执行深度研究获取全面洞察
- **工具**: deepResearch（MCP 工具）
- **任务**:
  - 使用先进 AI 模型结合网络搜索和 X（Twitter）搜索
  - 收集关键洞察、数据、趋势
  - 构建综合性研究结果
- **注意**: 此阶段可能需要几分钟时间

### 阶段 4：播客生成
- **目标**: 生成完整的播客脚本和音频
- **工具**: generatePodcast
- **任务**:
  - 自动从 `studySummary` 加载深度研究结果
  - 结合分析师主题生成播客内容
  - 返回 `podcastToken` 用于访问播客

### 阶段 5：研究结束
- 简洁告知研究完成
- 提供 `podcastToken` 引导用户访问播客
- 鼓励用户收听并提供反馈
- 避免提供详细的研究结论描述

## 技术特性

### 模型配置
- **主模型**: Claude 3.7 Sonnet (`claude-3-7-sonnet`)
- **规划模型**: Gemini 2.5 Pro (`gemini-2.5-pro`)
- **流式输出**: 支持平滑的中文字符流式输出（30ms 延迟）

### 工具链
| 工具 | 用途 | 阶段 |
|------|------|------|
| webSearch | 快速收集背景信息 | 阶段 1 |
| planPodcast | 规划播客内容和搜索策略 | 阶段 2 |
| deepResearch | 深度研究和信息收集 | 阶段 3 |
| generatePodcast | 生成播客脚本和音频 | 阶段 4 |

### 系统能力
- **自动化流程**: 五个阶段自动串联执行
- **中断恢复**: 支持对话中断后继续执行
- **Token 追踪**: 完整的使用量统计和报告
- **错误处理**: 完善的错误处理和用户通知机制
- **步数控制**: 默认最大 4 步（对应 4 个主要工具调用）

### 状态管理
- 播客生成后，系统限制可用工具，防止不必要的额外操作
- 支持重新生成播客
- 通过 `backgroundToken` 管理后台执行状态

## 用户体验

### 输入方式
- 文本描述研究主题或问题
- 支持上传参考资料（图片、文档）
- 支持引用其他研究会话

### 输出内容
- 完整的播客音频文件
- 结构化的播客脚本
- 研究过程的统计信息（token 使用、执行时间等）

### 交互特点
- 引导式的流程提示
- 实时显示当前执行阶段
- 支持用户中途停止研究
- 禁止跳过必需步骤，确保内容质量

## 数据模型

### Analyst 配置
```typescript
{
  kind: AnalystKind.fastInsight,
  locale: "zh-CN" | "en-US",
  brief: string,              // 用户的初始问题
  topic: string,              // 从 planPodcast 生成
  studySummary: string,       // 存储 deepResearch 结果
  studyLog: string,           // 执行日志
  attachments: FileAttachment[] // 用户上传的参考资料
}
```

### AnalystPodcast
```typescript
{
  token: string,              // 访问令牌
  analystId: number,
  script: string,             // 播客脚本
  extra: {
    audioObjectUrl?: string   // 音频文件 URL
  },
  generatedAt: Date,          // 生成时间
}
```

## 使用限制

### 硬性限制
- webSearch 在 planPodcast 之前**仅限使用 1 次**
- 不得跳过任何必需工具调用
- 不得在播客生成后继续研究

### 文件上传限制
- 最大图片数量：根据 `FILE_UPLOAD_LIMITS.MAX_IMAGES`
- 最大文档数量：根据 `FILE_UPLOAD_LIMITS.MAX_DOCUMENTS`
- 总文件大小：根据 `FILE_UPLOAD_LIMITS.MAX_TOTAL_SIZE`

## 实现细节

### 关键文件
- `src/ai/prompt/study/fastInsight.ts`: 系统提示词和工作流程定义
- `src/app/(study)/api/chat/study/fastInsightAgentRequest.ts`: 核心请求处理逻辑
- `src/app/(study)/study/actions.ts`: Server Actions（创建会话等）
- `src/ai/tools/experts/planPodcast/index.ts`: 播客规划工具实现
- `src/ai/tools/experts/generatePodcast/index.ts`: 播客生成工具实现

### 数据库表
- `UserChat`: 存储对话会话（kind = "study"）
- `ChatMessage`: 存储对话消息
- `Analyst`: 存储分析师配置和研究状态
- `AnalystPodcast`: 存储生成的播客
- `ChatStatistics`: 存储使用统计

## 典型使用场景

1. **时事分析播客**: 用户提出当前热点话题，系统快速生成观点播客
2. **商业洞察播客**: 分析市场趋势、公司动态等商业话题
3. **行业研究播客**: 深入某个行业或领域的最新发展

## 与其他研究类型的区别

| 特性 | Fast Insight | 常规研究 | 产品研发 |
|------|-------------|---------|---------|
| 目标输出 | 播客音频+脚本 | 研究报告 | 产品分析报告 |
| 分析师类型 | opinionOriented (固定) | 灵活选择 | productRnD (固定) |
| 研究深度 | 快速深度研究 | 全面深度研究 | 针对性研究 |
| 执行速度 | 快（4步） | 较慢（多步） | 中等 |
| 主要工具 | webSearch → planPodcast → deepResearch → generatePodcast | 多样化工具组合 | 产品导向工具 |

## 未来改进方向

- 支持自定义播客风格和语调
- 支持多语言播客生成
- 支持播客章节标记
- 增强播客音频质量和自然度
- 支持播客系列生成（多集播客）
