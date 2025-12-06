# MCP (Model Context Protocol) 集成文档

本目录包含 atypica.AI 的 MCP 集成相关文档。

## 核心文档

### 开发指南

MCP 开发的核心文档已集成到源代码中，便于查阅和维护：

- **[如何搭建 MCP HTTP 服务器](../../src/app/(deepResearch)/mcp/README.md)** - 完整的 MCP 服务器搭建教程
  - 端点配置和认证方式
  - 快速起步（2个文件搞定）
  - 关键概念和最佳实践
  - 认证实现细节（内部认证 + API Key）

- **[MCP 工具库 API 参考](../../src/lib/mcp/README.md)** - MCP Toolkit 使用指南
  - HTTP 适配器（Next.js ↔ Node.js）
  - 上下文管理（AsyncLocalStorage）
  - 流式通知（AI SDK ↔ MCP Progress）
  - 类型定义和设计原则

### 功能实现

atypica.AI 当前实现的 MCP 功能：

#### 1. DeepResearch MCP Server

**路径**: `/mcp/deepResearch`

**功能**: 提供深度研究工具，集成了 Grok 模型的流式文本生成能力。

**认证方式**:
- API Key 认证（`Authorization: Bearer atypica_xxxxx`）
- 内部服务认证（`x-internal-secret` + `x-user-id`）

**工具**:
- `atypica_deep_research` - 执行深度研究任务
  - 支持流式输出（SSE）
  - 支持 JSON 响应（`?sse=0`）
  - 实时进度通知

#### 2. Team-Level MCP Configuration

**功能**: 团队级别的 MCP 服务器配置管理。

**位置**:
- 数据库模型：`prisma/schema.prisma` (`TeamConfig` 表)
- 配置类型：`src/app/team/teamConfig/types.ts`
- 管理界面：团队管理后台

**特性**:
- 每个团队可配置自己的 MCP 服务器
- 支持自定义系统提示词
- 配置存储在数据库中
- 前端可视化工具调用过程

## 研发文档

以下是研发阶段的文档和计划，保留作为历史参考：

- [plan.md](./plan.md) - MCP 功能开发计划
- [feat-aptar-mcp_README.md](./feat-aptar-mcp_README.md) - APTAR MCP 功能设计
- [feat-deepresearch-mcp/](./feat-deepresearch-mcp/) - DeepResearch 功能详细设计
  - [README.md](./feat-deepresearch-mcp/README.md) - 团队级别 MCP 配置详解
  - [request.md](./feat-deepresearch-mcp/request.md) - API 请求示例

## 快速开始

### 使用 DeepResearch MCP

1. **获取 API Key**

访问账户设置生成个人 API Key。

2. **调用 MCP 端点**

```bash
# SSE 流式请求
curl -X POST https://atypica.ai/mcp/deepResearch \
  -H "Authorization: Bearer atypica_xxxxx" \
  -H "Accept: text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "atypica_deep_research",
      "arguments": {
        "query": "分析人工智能在商业研究中的应用"
      }
    },
    "id": 1
  }'

# JSON 响应（禁用 SSE）
curl -X POST "https://atypica.ai/mcp/deepResearch?sse=0" \
  -H "Authorization: Bearer atypica_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "atypica_deep_research",
      "arguments": {
        "query": "分析人工智能在商业研究中的应用"
      }
    },
    "id": 1
  }'
```

### 配置团队 MCP

1. 进入团队管理后台
2. 在 MCP 配置页面添加服务器
3. 配置认证信息和工具权限
4. 在研究助手中使用 MCP 工具

## 开发新的 MCP 工具

参考 [搭建指南](../../src/app/(deepResearch)/mcp/README.md) 了解如何：

1. 定义 MCP Server (`mcpServer.ts`)
2. 创建 HTTP Route (`route.ts`)
3. 实现业务逻辑（支持流式回调）
4. 添加认证和错误处理

## 相关资源

- [MCP 官方规范](https://spec.modelcontextprotocol.io/)
- [MCP SDK 文档](https://github.com/modelcontextprotocol/typescript-sdk)
- [Vercel AI SDK](https://sdk.vercel.ai/)
- [项目 API 健康检查](../howto/api-health-check.md)

## 故障排查

### 常见问题

**Q: API Key 认证失败**

A: 确保：
- API Key 格式正确（`atypica_` 开头）
- 使用个人用户的 API Key（不支持团队 API Key）
- Header 格式：`Authorization: Bearer atypica_xxxxx`

**Q: 流式响应无输出**

A: 检查：
- `Accept` header 是否包含 `text/event-stream`
- 是否设置了 `?sse=0` 参数
- 客户端是否支持 SSE

**Q: 内部认证失败**

A: 验证：
- `x-internal-secret` 与环境变量 `INTERNAL_API_SECRET` 一致
- `x-user-id` 是有效的用户 ID（整数）
- 两个 header 必须同时提供

## 贡献

欢迎贡献新的 MCP 工具实现和文档改进！

---

最后更新：2025-12
