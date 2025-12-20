# 语音录音与转录流程

## 核心机制：增量式分段转录

**关键思想**：只转录新增的音频块，通过位置指针避免重复转录。

## 数据结构

```typescript
// RecordButton.tsx
chunksRef.current: Blob[]                    // 所有音频块
lastTranscribedChunkIndexRef.current: number // 已转录到哪个位置
transcriptSegmentsRef.current: string[]      // 转录结果片段
```

## 流程

### 1. 开始录音

```typescript
mediaRecorder.start(1000); // 每1秒产生一个音频块

// 初始化
transcriptSegmentsRef.current = [];
lastTranscribedChunkIndexRef.current = 0;
```

### 2. 触发增量转录

```typescript
mediaRecorder.ondataavailable = (event) => {
  chunksRef.current.push(event.data);

  const newChunksCount = chunksRef.current.length - lastTranscribedChunkIndexRef.current;

  // 触发条件：4个新块 + 6KB数据 + 4秒间隔
  if (newChunksCount >= 4 && totalSize >= 6000 && timeSinceLastTranscribe > 4000) {
    await transcribeSegment(false);
  }
};
```

### 3. 增量转录核心逻辑

```typescript
const transcribeSegment = async (isFinal: boolean) => {
  // 🎯 关键：只取新增的块
  const startIndex = lastTranscribedChunkIndexRef.current;
  const chunksToTranscribe = chunksRef.current.slice(startIndex);

  if (chunksToTranscribe.length === 0) {
    // 没有新音频，直接用已有片段
    if (isFinal) onTranscript(transcriptSegmentsRef.current.join("\n"));
    return;
  }

  // 只发送新增音频
  const audioBlob = new Blob(chunksToTranscribe, { type: "audio/webm;codecs=opus" });

  // 调用转录 API
  const result = await fetch("/api/transcribe", {
    body: formData // 包含 audioBlob
  });

  // 追加新片段
  transcriptSegmentsRef.current.push(result.text);

  // 🎯 更新位置指针
  lastTranscribedChunkIndexRef.current = chunksRef.current.length;

  // 显示预览
  if (!isFinal) {
    onPartialTranscript(transcriptSegmentsRef.current.join("\n"));
  }
};
```

### 4. 停止录音

```typescript
mediaRecorder.onstop = async () => {
  // 等待进行中的转录完成
  while (isTranscribingRef.current) {
    await sleep(100);
  }

  // 检查剩余未转录的块
  const remainingChunks = chunksRef.current.length - lastTranscribedChunkIndexRef.current;

  if (remainingChunks > 0) {
    // 转录最后一段
    await transcribeSegment(true);
  } else {
    // 直接用已有片段
    onTranscript(transcriptSegmentsRef.current.join("\n"));
  }
};
```

## 时间线示例

```
时间轴:  [1s] [2s] [3s] [4s] [5s] [6s] [7s] [8s] [停止]
音频块:   [0]  [1]  [2]  [3]  [4]  [5]  [6]  [7]  [8]
         └─────────┬─────────┘  └────┬─────┘  └──┬──┘
                   ↓                  ↓          ↓
转录 API:      块[0-3]           块[4-6]     块[7-8]
结果:         "你好我是"        "小明"      "今天"
指针:      0 → 4            4 → 7      7 → 9

最终拼接: "你好我是\n小明\n今天"
```

## 并发控制

```typescript
// 防止多个转录请求重叠
isTranscribingRef.current = true;
try {
  await transcribeSegment(false);
} finally {
  isTranscribingRef.current = false; // 必须在 finally 中释放
}
```

## 性能优化

| 维度 | 累积式 | 增量式 | 提升 |
|------|--------|--------|------|
| 数据传输 | 3+10+20+35 KB | 15+15+15 KB | **66% ↓** |
| 转录延迟 | 递增 | 恒定 | **稳定** |
| 重复转录 | 是 | 否 | **消除** |

## 关键要点

1. **位置指针是核心** - `lastTranscribedChunkIndexRef` 决定从哪里开始转录
2. **片段数组管理** - 每次追加新片段，最后拼接
3. **并发锁保护** - `isTranscribingRef` 防止竞态
4. **剩余块处理** - `onstop` 时必须检查并转录剩余块
5. **防抖定时器** - 避免频繁 API 调用

## 相关文件

- `src/components/chat/RecordButton.tsx:49-153` - 转录逻辑
- `src/app/api/transcribe/route.ts` - Whisper API
- `src/components/chat/FocusedInterviewChat.tsx:216-264` - 结果处理
