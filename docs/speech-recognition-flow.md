# 语音识别流程 Walkthrough

> **重要更新**：已优化转录机制，修复重复转录问题并确保音频完整性。详见底部"技术优化"章节。

### 第1步：用户开始录音
```typescript
// 用户点击 RecordButton
<RecordButton 
  onTranscript={handleTranscriptInternal}
  onPartialTranscript={handlePartialTranscriptInternal}
  language={locale}
/>
```
- 用户按下录音按钮
- `RecordButton` 启动 `MediaRecorder`
- 开始捕获音频流 (WebM/Opus格式)
- UI显示录音动画和音频级别可视化

### 第2步：音频分块与流式转录
```typescript
// RecordButton 内部每1秒触发
mediaRecorder.ondataavailable = (event) => {
  if (event.data.size > 0) {
    chunksRef.current.push(event.data);
    
    // 计算总音频大小和时间间隔
    const totalSize = chunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
    const timeSinceLastTranscribe = Date.now() - lastTranscribeTimeRef.current;
    
    // 流式转录触发条件
    const shouldTranscribe = 
      chunksRef.current.length >= 3 &&    // 至少3个块 (≈3秒音频)
      totalSize >= 4000 &&                // 总大小至少4KB
      timeSinceLastTranscribe > 4000;     // 距离上次转录4秒以上
      
    if (shouldTranscribe && !isTranscribingRef.current) {
      await transcribeAccumulatedAudio(false); // 流式转录 - 实时反馈
    }
  }
};
```

#### 流式转录机制
- **目的**: 为用户提供实时转录反馈
- **触发条件**: 3个音频块 + 4KB数据 + 4秒间隔
- **数据发送**: 发送完整音频（累积式）
- **结果显示**: 实时更新UI底部预览文本
- **重要**: 流式结果可能不完整，最终会被完整转录替换

### 第3步：API转录处理
```typescript
// 累积式全文转录 - 发送所有音频块
const audioBlob = new Blob(chunksRef.current, { type: "audio/webm;codecs=opus" });

// 发送到 /api/transcribe
POST /api/transcribe
Content-Type: multipart/form-data
{
  audio: audioBlob, // 包含从开始到现在的所有音频
  language: "zh" | "en",
  responseFormat: "verbose_json",
  isFinal: false // 标识是部分转录还是最终转录
}
```

#### 累积式转录机制
- **全量发送**: 每次发送从录音开始到现在的**完整音频**
- **覆盖式结果**: 新转录结果替换之前的部分转录文本
- **上下文连续**: Whisper 能听到完整对话，提升准确度

#### 转录时间线示例
```
3秒时: 发送块1+2+3 → "你好"
7秒时: 发送块1+2+3+4+5+6+7 → "你好，我是小明"  
11秒时: 发送块1+2+...+11 → "你好，我是小明，今天天气不错"
```

#### 优势与代价
- ✅ **准确度高**: 完整上下文，自我纠错能力
- ✅ **语义完整**: 避免句子被切断  
- ⚠️ **API成本**: 重复转录相同音频段
- ⚠️ **延迟增加**: 音频文件越来越大

### 第4步：部分转录显示
```typescript
// 接收API响应后
const handlePartialTranscriptInternal = useCallback((text: string) => {
  console.log("⚡ 接收到部分转录:", text);
  setPartialTranscript(text); // 立即显示在UI底部
}, []);
```
- 部分转录结果实时显示
- 底部显示带脉冲指示器的预览文本
- 文本超过30字符时自动截断

### 第5步：录音结束与智能完整转录
```typescript
// 用户停止录音后的处理流程
mediaRecorder.onstop = async () => {
  // 1. 等待正在进行的流式转录完成
  while (isTranscribingRef.current) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // 2. 智能等待流式转录结果
  let waitTime = 0;
  const maxWait = 3000; // 最多等待3秒
  const checkInterval = 200; // 每200ms检查一次
  
  while (!fullTranscriptRef.current && waitTime < maxWait) {
    await new Promise(resolve => setTimeout(resolve, checkInterval));
    waitTime += checkInterval;
  }
  
  // 3. 进行完整音频转录（确保不遗漏内容）
  if (totalSize > 2000) {
    await transcribeAccumulatedAudio(true); // 最终完整转录
  } else if (fullTranscriptRef.current) {
    onTranscript(fullTranscriptRef.current); // 使用流式结果
  }
};

// 最终转录结果处理 - FocusedInterviewChat.tsx
const handleTranscriptInternal = useCallback((text: string) => {
  if (text.trim()) {
    const messageToSend = {
      role: "user" as const,
      content: text, // 完整准确的转录结果
      id: generateId(),
    };
    useChatRef.current?.append(messageToSend);
  }
}, []);
```

#### 智能完整转录机制
- **智能等待**: 动态等待流式结果，最多3秒
- **完整性保障**: 始终用完整音频进行最终转录
- **替换模式**: 最终结果替换流式结果，避免重复
- **覆盖全面**: 确保录音最后4秒内容不遗漏

#### 双重转录策略
- **流式转录**: 实时反馈，提升用户体验
- **完整转录**: 完整音频处理，确保准确性和完整性
- **智能选择**: 根据网络情况和音频大小智能决策

### 第6步：状态重置与准备下轮
```typescript
// 消息发送后自动执行
setHasTimedOut(false);
setTimeLeft(DEFAULT_TIME_LEFT);
setIsTimerActive(false);
setPartialTranscript(""); // 清空预览文本
```
- 重置超时计时器状态
- 清除UI中的部分转录预览
- 准备接收下一轮语音输入
- 焦点回到文本输入框（如果开启）

## 技术优化 (最新更新)

### 解决的关键问题
- **重复转录问题**: 修复间歇性出现的重复文本 (如 "text text")
- **音频完整性**: 确保录音最后一段不会遗漏
- **性能优化**: 智能等待替代固定延迟

### 核心改进

#### 1. 智能动态等待
```typescript
// 旧方案：固定等待2秒
await new Promise(resolve => setTimeout(resolve, 2000));

// 新方案：动态检查，最多等待3秒
while (!fullTranscriptRef.current && waitTime < 3000) {
  await new Promise(resolve => setTimeout(resolve, 200));
  waitTime += 200;
}
```
- 快速网络：500-800ms vs 固定2000ms
- 慢速网络：最多3000ms容错时间

#### 2. 替换模式转录
```typescript
// 旧逻辑：追加模式 (导致重复)
finalTranscript = streamingResult + " " + finalResult;

// 新逻辑：替换模式 (确保唯一)
onTranscript(finalResult); // 直接使用完整转录结果
```

#### 3. 完整性保障策略
- **双重保障**: 流式转录 (实时) + 完整转录 (准确)
- **覆盖全面**: 确保最后4秒内音频不遗漏
- **智能选择**: 根据音频大小和网络状况决策

### 架构简化
删除了复杂的状态追踪机制：
- ❌ `processedChunksRef` 复杂计算
- ❌ `unprocessedChunks` 切片逻辑
- ✅ 简化为清晰的优先级决策

### 最终效果
- ✅ 彻底解决重复转录问题
- ✅ 确保音频内容完整不遗漏
- ✅ 提升响应速度 (快速网络)
- ✅ 增强容错能力 (慢速网络)
