# Monthly Tokens Reset

自动重置用户月度tokens的功能。

## 功能说明

系统会每分钟检查一次，自动重置过期用户的monthly tokens：

- 查找 `monthlyResetAt` 为空或已过期的用户
- 只处理有subscription记录的用户（减少处理量）
- 调用 `resetMonthlyTokens()` 函数重置tokens
- 记录处理结果和错误

## 实现方式

### 内部API

- 路径：`POST /api/internal/reset-monthly-tokens`
- 认证：`x-internal-secret` header
- 只允许集群内部访问

### 定时任务

- 每分钟运行一次
- 只在global集群执行（mainland集群创建但挂起）
- 使用curl调用内部API

## 测试

```bash
curl -X POST \
  -H "x-internal-secret: abcdefg" \
  http://localhost:3000/api/internal/reset-monthly-tokens
```

## 监控

```bash
# 查看CronJob状态
kubectl get cronjobs atypica-monthly-tokens-reset

# 查看执行日志
kubectl logs job/atypica-monthly-tokens-reset-<timestamp>
```

就这样。
