# Batch Podcast Generation

批量为多个分析师生成播客内容的功能。

## 功能说明

系统支持智能批量生成播客内容：

- 从最近更新的分析师中获取候选池
- 使用LLM智能选择最有趣的分析师
- 自动生成播客脚本和音频文件
- 支持并发控制和错误处理
- 提供详细的执行结果统计

## 实现方式

### 内部API

- 路径：`POST /api/internal/batch-generate-podcasts`
- 认证：`x-internal-secret` header
- 只允许集群内部访问

### 参数配置

- `batchSize`: 每批处理的分析师数量（默认10）
- `targetCount`: 目标生成播客数量（默认10）
- `poolLimit`: 候选分析师池大小（默认10）

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
    "batchSize": 5,
    "targetCount": 5,
    "poolLimit": 20
  }' \
  http://localhost:3000/api/internal/batch-generate-podcasts
```

### 响应示例

```json
{
  "success": true,
  "message": "Batch podcast generation started successfully",
  "params": {
    "batchSize": 10,
    "targetCount": 10,
    "poolLimit": 10
  },
  "startedAt": "2024-01-01T00:00:00.000Z"
}
```

## 监控

```bash
# 查看CronJob状态（如果配置了定时任务）
kubectl get cronjobs atypica-batch-podcast-generation

# 查看执行日志
kubectl logs job/atypica-batch-podcast-generation-<timestamp>
```

## 使用场景

- **定时任务**: 批量为多个分析师生成播客，智能选择最有价值的内容
- **内部集成**: 系统内部服务调用，支持自动化播客生成流程

## 注意事项

- 播客生成包含脚本生成和音频合成两个步骤
- 音频生成可能需要2-5分钟时间
- 建议在低峰期执行避免影响用户体验
- 系统会自动跳过已有播客的分析师
- API 需要内部认证，确保安全访问
- 生成的播客音频存储在S3，访问时需要签名

就这样。
