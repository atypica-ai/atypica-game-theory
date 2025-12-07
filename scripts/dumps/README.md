# 数据导入导出工具

用于导出和导入数据的 JSON 格式备份工具。

## InterviewProject 导出导入

### 导出

```bash
pnpm tsx scripts/dumps/export-interview-project.ts <project-token>
```

导出内容：

- InterviewProject 项目信息
- InterviewSession 所有会话（userId/personaId 用 `[PLACEHOLDER]` 标记原始类型）
- UserChat 对话记录
- ChatMessage 所有消息

不导出：

- InterviewReport（可重新生成）
- ChatStatistics、TokensLog
- 附件文件本身（只导出引用）
- 实际的 userId/personaId 值（用占位符标记）

输出文件：`scripts/dumps/exports/interview-project-{token}-{timestamp}.json`

### 导入

```bash
pnpm tsx scripts/dumps/import-interview-project.ts <user-id> <json-file-path>
```

导入行为：

- 生成新的 project token、userChat token、messageId（避免冲突）
- 原始 token 保存到 `extra.originalToken`
- project brief 加上 `[IMPORTED]` 前缀方便识别
- InterviewProject 使用当前时间戳，其他保留原始时间戳
- 所有数据归属于指定用户
- **根据 `[PLACEHOLDER]` 标记还原字段类型**：
  - 原来有 userId → 设为当前导入用户
  - 原来有 personaId → 设为占位角色（id=1）
  - 都没有 → 都设为 null
- 自动创建占位角色（persona id=1）如不存在
- 使用事务，失败会完全回滚

### 注意事项

1. **占位角色**：会自动检查并创建 persona id=1 作为占位角色
2. **字段映射**：根据导出时的 `[PLACEHOLDER]` 标记保持原始字段类型
3. **附件文件**：只导入引用信息，需确保 S3 文件可访问
4. **敏感数据**：导出的 JSON 可能包含敏感信息，注意保管
