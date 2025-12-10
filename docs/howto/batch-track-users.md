# Batch Track Users to Analytics

批量追踪用户数据到 Segment Analytics 的功能。

## 功能说明

系统会根据指定的天数范围，遍历注册用户并追踪到 Segment：

- 通过参数 `days` 指定过去 N 天内注册的用户
- 逐个调用 `trackUserServerSide()` 追踪用户数据
- 每次调用间隔 300ms，避免过快请求
- 记录处理结果和错误

## 实现方式

### 内部API

- 路径：`POST /api/internal/batch-track-users`
- 认证：`x-internal-secret` header
- 只允许集群内部访问

### 参数

- `days` (可选): 过去 N 天内注册的用户，默认为 1 天
- `traitTypes` (可选): 要追踪的数据类型数组，默认为 `["profile", "stats", "revenue"]`
  - `profile`: 用户基本信息
  - `stats`: 用量统计
  - `revenue`: 收入统计
  - ⚠️ **不支持** `clientInfo` 和 `all`，因为这是服务端批量任务

## 测试

```bash
# 追踪过去 1 天注册的用户（默认）
curl -X POST \
  -H "x-internal-secret: your-secret" \
  -H "Content-Type: application/json" \
  http://localhost:3000/api/internal/batch-track-users

# 追踪过去 30 天注册的用户
curl -X POST \
  -H "x-internal-secret: your-secret" \
  -H "Content-Type: application/json" \
  -d '{"days": 30}' \
  http://localhost:3000/api/internal/batch-track-users

# 只追踪用户基本信息和收入统计
curl -X POST \
  -H "x-internal-secret: your-secret" \
  -H "Content-Type: application/json" \
  -d '{"days": 1, "traitTypes": ["profile", "revenue"]}' \
  http://localhost:3000/api/internal/batch-track-users
```

## 监控

如果需要定期执行，可以创建 Kubernetes CronJob：

```bash
# 查看CronJob状态
kubectl get cronjobs atypica-batch-track-users

# 查看执行日志
kubectl logs job/atypica-batch-track-users-<timestamp>
```

## 使用场景

- 初次接入 Segment Analytics 时批量追踪历史用户
- 定期更新用户画像数据
- Analytics 数据异常时重新追踪
- 新增 trait 字段后批量更新

就这样。
