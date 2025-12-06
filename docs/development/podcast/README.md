# Podcast 功能开发文档

本目录包含播客生成功能的相关文档，包括 TTS API 文档、Prompt 版本历史和脚本示例。

## 目录结构

```
podcast/
├── README.md                           # 本文档
├── volcano-tts-podcast-api-doc.md     # 火山引擎 TTS 播客 API 文档
├── volcano-tts-monologue-api-doc.md   # 火山引擎 TTS 独白 API 文档
├── examples/                           # 脚本示例
│   ├── script_v0.md                   # 早期版本示例
│   ├── script_v1.md
│   ├── script_v4.md                   # 当前参考版本
│   ├── oo_script_v0.md                # Opinion-Oriented 版本
│   ├── notebooklm_example_script.md   # NotebookLM 风格参考
│   └── debate/                        # 辩论类脚本
│       └── script v0.md
└── prompt-backup/                      # Prompt 版本历史
    ├── podcast_prompt_v1.md           # v1 - 初始版本
    ├── podcast_prompt_v2.md           # v2
    ├── podcast_prompt_v3.md           # v3
    ├── podcast_prompt_v4.md           # v4
    ├── podcast_prompt_v5.md           # v5
    ├── podcast_prompt_v6.md           # v6
    ├── podcast_prompt_v7.md           # v7 - 当前版本
    └── opinionOriented/               # Opinion-Oriented 分支
        ├── v0.md
        └── v1.md
```

## TTS API 文档

### Volcano TTS Podcast API

完整的播客对话生成 API，支持多角色对话和情感控制。

**文档**: [volcano-tts-podcast-api-doc.md](./volcano-tts-podcast-api-doc.md)

**主要功能**:
- 多角色对话生成
- 情感和语气控制
- 音频拼接和合成
- 支持中英文混合

### Volcano TTS Monologue API

单人独白生成 API，适用于单一主讲人场景。

**文档**: [volcano-tts-monologue-api-doc.md](./volcano-tts-monologue-api-doc.md)

**主要功能**:
- 单人语音合成
- 情感表达控制
- 停顿和节奏调整

## Prompt 版本演进

### 当前版本：v7

**位置**: [prompt-backup/podcast_prompt_v7.md](./prompt-backup/podcast_prompt_v7.md)

**特点**:
- 优化的对话流程
- 更自然的情感表达
- 改进的内容结构
- 增强的 NotebookLM 风格对话

### 版本历史

| 版本 | 主要改进 | 文件 |
|------|----------|------|
| v1 | 初始版本，基础对话生成 | [podcast_prompt_v1.md](./prompt-backup/podcast_prompt_v1.md) |
| v2 | 增加情感控制 | [podcast_prompt_v2.md](./prompt-backup/podcast_prompt_v2.md) |
| v3 | 优化对话节奏 | [podcast_prompt_v3.md](./prompt-backup/podcast_prompt_v3.md) |
| v4 | 引入 NotebookLM 风格 | [podcast_prompt_v4.md](./prompt-backup/podcast_prompt_v4.md) |
| v5 | 改进开场和结尾 | [podcast_prompt_v5.md](./prompt-backup/podcast_prompt_v5.md) |
| v6 | 增强互动性 | [podcast_prompt_v6.md](./prompt-backup/podcast_prompt_v6.md) |
| v7 | 综合优化 ✨ **当前** | [podcast_prompt_v7.md](./prompt-backup/podcast_prompt_v7.md) |

### Opinion-Oriented 分支

专门针对观点导向型内容的 prompt 变体。

**版本**:
- [opinionOriented/v0.md](./prompt-backup/opinionOriented/v0.md) - 初始版本
- [opinionOriented/v1.md](./prompt-backup/opinionOriented/v1.md) - 优化版本

**特点**:
- 强调观点表达
- 辩论式对话
- 多角度分析

## 脚本示例

### 推荐参考版本

#### script_v4.md ⭐

**位置**: [examples/script_v4.md](./examples/script_v4.md)

这是当前推荐的脚本格式参考，包含：
- 完整的对话结构
- 合适的节奏和停顿
- 情感标记示例
- 开场和结尾模板

#### NotebookLM 风格参考

**位置**: [examples/notebooklm_example_script.md](./examples/notebooklm_example_script.md)

Google NotebookLM 风格的播客对话示例，特点：
- 轻松友好的语气
- 探索性对话
- 自然的话题过渡

### 其他示例

- **script_v0.md** - 早期版本，了解演进历史
- **script_v1.md** - 中期版本
- **oo_script_v0.md** - Opinion-Oriented 风格示例
- **debate/script v0.md** - 辩论类脚本示例

## 使用指南

### 生成播客脚本

1. 使用当前 v7 prompt 生成脚本
2. 参考 script_v4 示例调整格式
3. 确保包含情感标记和停顿

### 调用 TTS API

1. 准备好格式化的脚本
2. 根据 TTS API 文档构造请求
3. 处理返回的音频数据

### 批量生成

详见项目根目录文档：[docs/howto/batch-podcast-generation.md](../../howto/batch-podcast-generation.md)

## 开发注意事项

### Prompt 更新流程

1. 在 `prompt-backup/` 创建新版本文件
2. 更新本 README 的版本表格
3. 在代码中更新 prompt 引用
4. 测试生成效果
5. 记录版本变更原因

### 版本命名规范

- **主版本**: `podcast_prompt_vX.md` (X = 1, 2, 3...)
- **分支版本**: `category/vX.md` (如 opinionOriented/v0.md)
- **脚本示例**: `script_vX.md` 或 `descriptive_name_vX.md`

### 测试建议

1. **小样本测试**: 先用 1-2 个分析师测试新 prompt
2. **A/B 测试**: 对比新旧版本效果
3. **用户反馈**: 收集听众反馈
4. **质量评估**: 检查对话自然度、信息密度、情感表达

## 相关代码

播客生成相关代码位置：

```
src/
├── app/
│   └── api/
│       └── podcast/          # 播客生成 API
├── ai/
│   ├── prompt/
│   │   └── podcast.ts       # Podcast prompt 定义
│   └── tools/
│       └── podcast.ts       # Podcast 工具实现
└── lib/
    └── tts/                 # TTS 服务集成
        └── volcano.ts       # 火山引擎 TTS
```

## 性能优化

### 生成速度

- 使用流式生成提升用户体验
- 并行处理多个音频片段
- 缓存常用的语音样本

### 质量优化

- 调整 TTS 参数（语速、音调）
- 优化情感标记的使用
- 平滑音频片段之间的过渡

### 成本控制

- 控制脚本长度
- 复用音频片段
- 批量处理降低单次成本

## 故障排查

### 常见问题

**问题 1**: 生成的对话不自然

**解决方案**:
- 检查 prompt 版本是否为最新
- 调整情感标记
- 参考 NotebookLM 示例优化对话流

**问题 2**: TTS 音频质量问题

**解决方案**:
- 检查 API 参数配置
- 调整语速和音调
- 确认使用正确的音色 ID

**问题 3**: 批量生成失败

**解决方案**:
- 检查 API 配额
- 添加重试机制
- 分批处理减小单次负载

## 未来计划

- [ ] 支持更多 TTS 提供商
- [ ] 增加多语言支持
- [ ] 优化情感表达的细粒度控制
- [ ] 实现实时流式生成
- [ ] 添加背景音乐和音效

## 参考资源

- [火山引擎 TTS 官方文档](https://www.volcengine.com/docs/6561/79820)
- [NotebookLM 播客风格指南](https://support.google.com/notebooklm/)
- [播客制作最佳实践](https://podcasters.spotify.com/resources/learn/create)

## 贡献

如果你有新的 prompt 优化或示例脚本，欢迎贡献：

1. 创建新版本文件
2. 更新本 README
3. 提供测试结果和对比
4. 提交 Pull Request

---

最后更新：2025-12
