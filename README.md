# atypica.AI

商业研究本质上是关于理解和影响人类决策过程的学问。消费者并不只是根据纯粹的数据和统计概率做决策，而是受到叙事、情感和认知偏见的强烈影响。这也是为什么品牌故事、营销叙事和企业文化等「内容」在商业中如此重要——它们都在塑造人们理解和互动的「故事」，从而影响决策过程。所以，理解影响决策的机制是商业研究的核心；这也是行为经济学、消费者心理学和组织行为学等领域与商业研究紧密相连的原因。

我们做了一个商业问题研究的智能体框架「atypica.AI」。将「语言模型」应用于理解商业领域中那些难以量化的主观因素——消费者情绪、市场认知和决策偏好；通过「智能体」来「塑造」消费者的个性和认知；通过与智能体的「互动」来获得消费者的行为和决策。

如果，「物理」为「客观世界」建模；那么，「语言模型」则为「主观世界」建模。

## 技术实现

### 架构

- **前端**：Next.js 15.5 (App Router) + React 19
- **数据库**：Prisma + PostgreSQL 15 (包含 pgvector 扩展)
- **AI模型**：支持多提供商（Claude、GPT、Gemini、Bedrock、DeepSeek 等）
- **AI框架**：Vercel AI SDK v5
- **国际化**：next-intl
- **认证**：NextAuth.js

### 核心模块

#### 1. 多Agent协作系统

研究流程由多个专业化Agent协作完成：

- **Study Agent**：全流程协调者，引导用户明确研究需求
- **Scout Agent**：负责发现和分类目标用户群体
- **Interviewer Agent**：执行专业访谈，提取关键信息
- **Persona Agent**：模拟用户回答，提供真实反馈

#### 2. 工具集成

提供丰富的专业工具，增强AI能力：

- **reasoningThinking**：深度思考分析工具
- **interview**：自动化访谈管理
- **scoutTaskChat**：用户发现与画像构建
- **generateReport**：报告生成与渲染

#### 3. 实时协作界面

- 分屏设计：左侧对话，右侧工具控制台
- 实时状态反馈和进度指示
- 支持研究过程回放和共享

## 项目结构

```
src/
  ├── app/                      # Next.js 15 App Router
  │   ├── (study)/              # 研究助手核心功能
  │   ├── (newStudy)/           # 开始新研究流程
  │   ├── (sage)/               # Sage 专家智能体
  │   ├── (agents)/             # 其他杂项 Agent
  │   ├── (persona)/            # AI 人设库和对话
  │   ├── (interviewProject)/   # 访谈项目模拟
  │   ├── (podcast)/            # 播客内容生成
  │   ├── (deepResearch)/       # 深度研究（MCP）
  │   ├── (auth)/               # 用户认证
  │   ├── (public)/             # 公开营销页面
  │   ├── account/              # 账户管理
  │   ├── admin/                # 管理后台
  │   └── api/                  # 系统和通用 API
  ├── ai/                       # AI 服务层
  │   ├── prompt/               # 研究相关的 AI Prompt 模板
  │   ├── tools/                # 研究相关的 AI 工具定义
  │   │   ├── experts/          # 专家工具
  │   │   ├── social/           # 社交媒体工具
  │   │   ├── mcp/              # MCP 工具
  │   │   └── system/           # 系统工具
  │   └── provider.ts           # 多 AI 提供商配置
  ├── components/               # UI 组件库（Radix UI）
  ├── hooks/                    # React Hooks
  ├── i18n/                     # 国际化配置（next-intl）
  ├── lib/                      # 工具函数和通用配置
  ├── prisma/                   # Prisma ORM 客户端
  └── types/                    # TypeScript 类型定义
```

## 本地开发

### 前置要求

- Node.js 22 (使用 Alpine 镜像)
- PostgreSQL 15 with pgvector extension
- pnpm 10+

### 快速开始

1. **安装依赖**

```bash
pnpm install
```

2. **配置环境变量**

```bash
cp .env.example .env
```

设置 `AUTH_SECRET`：

```bash
npx auth secret
```

3. **初始化数据库**

创建本地数据库：

```bash
psql -d postgres
CREATE USER atypica WITH LOGIN PASSWORD 'atypica' SUPERUSER;
CREATE DATABASE atypica_dev OWNER atypica;
CREATE DATABASE atypica_dev_shadow OWNER atypica;
\q
```

在 `.env` 文件中配置数据库连接：

```env
DATABASE_URL=postgresql://atypica:atypica@localhost:5432/atypica_dev
SHADOW_DATABASE_URL=postgresql://atypica:atypica@localhost:5432/atypica_dev_shadow
```

执行数据库迁移：

```bash
npx prisma generate
npx prisma migrate dev
```

> **详细说明**：PostgreSQL 和 pgvector 安装指南请参考 [docs/howto/setup-postgresql.md](docs/howto/setup-postgresql.md)

4. **启动开发服务器**

```bash
pnpm dev
```

访问 http://localhost:3000

5. **生产模式运行**

```bash
docker buildx build --platform linux/amd64 . -t atypica-llm-app -f Dockerfile
docker run -p 3000:3000 --env-file ./.env.docker atypica-llm-app
```

## 📚 文档

### 开发文档
- [开发指南](docs/development/) - AI SDK、播客、报告等开发文档
- [数据库维护](docs/howto/how-to-squash-migrations.md) - Prisma 迁移管理

### 操作手册
- [PostgreSQL 安装](docs/howto/setup-postgresql.md) - 数据库和 pgvector 安装指南
- [API 健康检查](docs/howto/api-health-check.md) - 系统监控和 Uptime Kuma 集成
- [月度 Token 重置](docs/howto/monthly-tokens-reset.md) - 自动化 Token 管理
- [批量播客生成](docs/howto/batch-podcast-generation.md) - 批量内容生成
- [Google Analytics](docs/howto/google-analytics-api.md) - 数据分析配置
- [iframe 集成](docs/howto/iframe-embed-integration.md) - 嵌入式集成指南

### 产品文档
- [产品概览](docs/product/sage-overview.md) - Sage 功能详解
- [术语表](docs/product/glossary.md) - 核心概念定义
- [更新日志](docs/product/changelog-zh.md) - 版本更新记录

### MCP 集成
- [MCP 文档](docs/mcp/) - Model Context Protocol 集成

## 🛠️ 脚本工具

详细说明：[scripts/README.md](scripts/README.md)

### 常用命令

```bash
# 用户和订阅管理
pnpm admintool create-user email@example.com password123
pnpm admintool make-admin email@example.com
pnpm admintool create-team owner@example.com "Team Name"

# 数据分析
pnpm analytics                    # Google Analytics 报表
pnpm analytics --days 7 -n 50    # 最近7天，前50条

# API 健康检查
npx tsx scripts/admin/check-status.ts --site https://atypica.ai
```

### 脚本分类

- **admin/** - 运维管理工具（admintool, check-status, analytics-report）
- **utils/** - 实用工具（payment-stats, public-assets, rescore-personas, utility-sqls）
- **archive/** - 历史归档（legacy scripts, stripe migration）

## 贡献指南

欢迎提交Issue和PR，一起改进atypica.AI！

### 开发规范

项目使用严格的代码质量标准：

```bash
# 代码检查（零警告容忍）
pnpm lint

# 自动修复
pnpm lint:fix

# 代码格式化
pnpm format

# 运行测试
pnpm test
```

详细的开发规范和最佳实践请参考 [CLAUDE.md](CLAUDE.md)
