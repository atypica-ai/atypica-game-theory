# Batch Podcast Generation

批量为多个分析师生成播客内容的功能。

## 功能说明

系统支持智能批量生成播客内容：

- 从最近更新的分析师中获取候选池
- 使用LLM智能选择最有趣的分析师
- 自动生成播客脚本和音频文件
- 支持并发控制和错误处理
- 提供详细的执行结果统计

## 相关内部API

### 1. 批量播客生成 (新)

- 路径：`POST /api/internal/batch-generate-podcasts`
- 认证：`x-internal-secret` header
- 只允许集群内部访问
- 用途：智能批量生成多个播客

### 2. 单个播客生成 (已有)

- 路径：`POST /api/podcast/generate`
- 认证：`x-internal-secret` header
- 用途：为指定分析师生成完整播客（脚本+音频）

### 3. 播客信息查询 (已有)

- 路径：`GET /api/podcast/retrieve`
- 认证：`x-internal-secret` header
- 用途：获取播客详细信息和状态

### 参数配置

- `batchSize`: 每批处理的分析师数量（默认10）
- `targetCount`: 目标生成播客数量（默认10）
- `poolLimit`: 候选分析师池大小（默认10）

## 测试

### 批量播客生成

#### 基础调用

```bash
curl -X POST \
  -H "x-internal-secret: abcdefg" \
  http://localhost:3000/api/internal/batch-generate-podcasts
```

#### 自定义参数

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

#### 响应示例

```json
{
  "success": true,
  "message": "Batch podcast generation started successfully"
}
```

### 单个播客生成

```bash
curl -X POST \
  -H "x-internal-secret: abcdefg" \
  -H "Content-Type: application/json" \
  -d '{
    "analystId": 123,
    "instruction": "可选的生成指令"
  }' \
  http://localhost:3000/api/podcast/generate
```

#### 响应示例

```json
{
  "success": true,
  "message": "Podcast generation pipeline started",
  "analystId": 123,
  "podcastId": 456,
  "podcastToken": "abc123def"
}
```

### 播客信息查询

#### 查询特定播客

```bash
curl -H "x-internal-secret: abcdefg" \
  "http://localhost:3000/api/podcast/retrieve?podcastId=456"
```

#### 查询分析师的所有播客

```bash
curl -H "x-internal-secret: abcdefg" \
  "http://localhost:3000/api/podcast/retrieve?analystId=123"
```

#### 响应示例

```json
{
  "success": true,
  "mode": "single",
  "podcastId": 456,
  "podcast": {
    "id": 456,
    "token": "abc123def",
    "analystId": 123,
    "instruction": "...",
    "script": "播客脚本内容...",
    "objectUrl": "https://s3.amazonaws.com/bucket/podcast.mp3",
    "generatedAt": "2024-01-01T00:00:00Z",
    "analyst": {
      "id": 123,
      "brief": "分析师简介",
      "topic": "研究主题"
    }
  }
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

- **批量播客生成**: 定时任务批量为多个分析师生成播客，智能选择最有价值的内容
- **单个播客生成**: 为特定分析师立即生成播客，适合实时需求
- **播客信息查询**: 检查播客生成状态，获取已生成的播客内容

## 注意事项

- 播客生成包含脚本生成和音频合成两个步骤
- 音频生成可能需要2-5分钟时间
- 建议在低峰期执行避免影响用户体验
- 系统会自动跳过已有播客的分析师
- 所有API都需要内部认证，确保安全访问
- `objectUrl` 字段存储的是S3对象URL，访问时需要签名

就这样。