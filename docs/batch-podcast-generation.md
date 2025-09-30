# Batch Podcast Generation

批量为多个分析师执行播客评估，并在符合阈值时生成播客内容的内部流程。

## 功能说明

系统会定期扫描最近更新的分析师：

- 仅处理已有研究报告的分析师
- 若 `Analyst.extra.podcastEvaluation` 不存在，则调用 LLM 根据 8 项 rubric 打分
- 仅在数据库中记录评分（`scores`），避免重复评估
- 当总分超过阈值时，后台触发播客脚本与音频生成
- API 会立即返回排队结果，具体生成进度通过日志观察

## 实现方式

### 内部 API

- 路径：`POST /api/internal/batch-generate-podcasts`
- 认证：`x-internal-secret` header
- 仅供集群内部访问

### 参数配置

- `limit`: 扫描的分析师数量上限，默认 20（范围 1-100）
- `scoreThreshold`: 播客触发阈值比例，默认 0.625（范围 0-1）
- `dryRun`: 仅执行评分不写入数据库、也不生成播客（默认 false）

## 测试

### 基础调用

```bash
curl -X POST \
  -H "x-internal-secret: abcdefg" \
  http://localhost:3000/api/internal/batch-generate-podcasts
```

### 自定义参数

```bash
curl -X POST \
  -H "x-internal-secret: abcdefg" \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 30,
    "scoreThreshold": 0.7,
    "dryRun": true
  }' \
  http://localhost:3000/api/internal/batch-generate-podcasts
```

### 响应示例

```json
{
  "success": true,
  "message": "Found 20 analysts with reports. evaluateAndGenerate podcasting...",
  "scheduled": 8,
  "params": {
    "limit": 20,
    "scoreThreshold": 0.625,
    "dryRun": false
  },
  "completedAt": "2024-01-01T00:00:00.000Z"
}
```

## 监控

```bash
# 查看 CronJob 状态（如果配置了定时任务）
kubectl get cronjobs atypica-batch-podcast-generation

# 查看执行日志
kubectl logs job/atypica-batch-podcast-generation-<timestamp>
```

## 使用场景

- **定时任务**：定期评估新的研究内容，自动触发播客生成
- **内部集成**：支持其他内部服务触发播客评估与生成

## 注意事项

- 系统会自动跳过已评估过的分析师
- 播客生成仍包含脚本生成与音频合成两个阶段，可能花费 2-5 分钟
- 建议在低峰期执行，避免影响用户体验
- API 需要内部认证，确保存取安全
- 生成的播客音频存储在 S3，访问需签名

就这样。
