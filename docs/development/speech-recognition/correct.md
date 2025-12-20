# 语音文本纠正流程

## 核心机制：零等待 + 异步纠正

**关键思想**：用户立即得到 AI 响应，文本纠正在后台异步完成，更新到数据库供后续使用。

## 流程

### 1. 客户端发送原始转录

```typescript
// FocusedInterviewChat.tsx:216-264
const handleTranscriptInternal = useCallback(async (text: string) => {
  if (text.trim()) {
    // 直接发送原始文本，不等待纠正
    useChatRef.current.sendMessage({
      text,  // 原始转录文本（可能有错误）
      metadata: {
        shouldCorrectUserMessage: true,  // 🎯 标记需要纠正
      },
    });
  }
}, [useChatRef]);
```

### 2. 服务端接收并异步纠正

```typescript
// route.ts:124-140
export async function POST(req: NextRequest) {
  const { message: newMessage, userChatToken } = await req.json();

  // 立即保存消息到数据库
  await persistentAIMessageToDB({ userChatId, message: newMessage });

  // 🎯 启动异步纠正（不阻塞响应）
  if (newMessage.metadata?.shouldCorrectUserMessage && newMessage.id) {
    after(
      correctUserInputMessage({
        userChatId,
        messageId: newMessage.id,
        contextMessages: coreMessages.slice(-3, -1), // 前2条消息作为上下文
        locale,
      }).catch(error => {
        chatLogger.error({ msg: "Voice correction failed", error: error.message });
      })
    );
  }

  // 立即开始 AI 响应流（不等待纠正完成）
  return streamText({
    model: llm(modelName),
    system: newStudySystem({ locale }) +
      // 🎯 AI 容错提示
      (locale === "zh-CN"
        ? "\n\n用户通过语音输入，可能存在语音识别错误，请理解其真实意图。"
        : "\n\nUser input is from voice recognition..."),
    messages: coreMessages,
    // ...
  }).toUIMessageStreamResponse();
}
```

### 3. 异步纠正实现

```typescript
// src/lib/userChat/lib.ts
export async function correctUserInputMessage({
  userChatId,
  messageId,
  contextMessages, // 对话上下文（前2条消息）
  locale,
}: CorrectUserInputMessageParams) {
  // 获取原始消息
  const message = await prisma.chatMessage.findUnique({
    where: { messageId, userChatId },
  });

  // 提取文本内容
  const originalText = message.parts
    .filter(part => part.type === "text")
    .map(part => part.text)
    .join("");

  // 调用 LLM 纠正
  const correctedText = await correctSpeechText(
    originalText,
    contextMessages, // 提供上下文增强准确度
    locale
  );

  // 更新数据库
  await prisma.chatMessage.update({
    where: { messageId },
    data: {
      parts: [{ type: "text", text: correctedText }],
    },
  });
}
```

## 双层容错机制

### 第一层：AI 实时容错

通过 system prompt 告知 AI 输入来自语音，可能有识别错误：

```typescript
system: "用户通过语音输入，可能存在语音识别错误，请理解其真实意图。"
```

- AI 会尝试理解意图，即使文本有误
- 用户立即得到响应（零等待）

### 第二层：后台异步纠正

使用 `after()` 异步执行纠正：

```typescript
after(correctUserInputMessage(...).catch(error => {
  // 纠正失败不影响用户体验
  logger.error("Voice correction failed", error);
}))
```

- 不阻塞 AI 响应
- 提取对话上下文增强准确度
- 纠正结果更新到数据库
- 用于后续分析和历史记录

## 为什么这样设计

### 问题：如果等待纠正再响应

```
用户说完话 → 转录(1s) → 纠正(2s) → AI响应(3s) = 总延迟 6s ❌
```

### 解决：立即响应 + 异步纠正

```
用户说完话 → 转录(1s) → AI响应(3s) = 总延迟 4s ✅
                      ↘ 纠正(2s) → 更新DB（后台）
```

- **用户体验**: 4秒 vs 6秒（节省 33%）
- **数据质量**: 纠正结果保存到 DB，用于后续分析
- **容错能力**: AI prompt 提供第一层容错

## 上下文增强

```typescript
// 提取前2条消息作为纠正上下文
contextMessages: coreMessages.slice(-3, -1)
```

**示例**：

```
对话历史:
AI: "你喜欢什么运动？"
User: "我喜欢打篮球" (语音识别: "我喜欢打蓝球")

纠正时提供上下文 → LLM 知道在谈论运动 → 纠正为 "篮球"
```

## 关键要点

1. **metadata 标记** - `shouldCorrectUserMessage: true` 触发纠正
2. **after() 异步** - 不阻塞用户响应，后台执行
3. **上下文感知** - 前2条消息增强纠正准确度
4. **双层容错** - AI prompt + 异步纠正
5. **容错处理** - 纠正失败不影响用户体验
6. **prompt cache** - 容错提示始终存在，最大化缓存利用

## 相关文件

- `src/components/chat/FocusedInterviewChat.tsx:216-264` - 发送标记
- `src/app/(newStudy)/api/chat/newstudy/route.ts:124-200` - 触发纠正和 AI 提示
- `src/lib/userChat/lib.ts` - 纠正实现
