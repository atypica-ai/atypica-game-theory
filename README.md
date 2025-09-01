# atypica.AI

商业研究本质上是关于理解和影响人类决策过程的学问。消费者并不只是根据纯粹的数据和统计概率做决策，而是受到叙事、情感和认知偏见的强烈影响。这也是为什么品牌故事、营销叙事和企业文化等「内容」在商业中如此重要——它们都在塑造人们理解和互动的「故事」，从而影响决策过程。所以，理解影响决策的机制是商业研究的核心；这也是行为经济学、消费者心理学和组织行为学等领域与商业研究紧密相连的原因。

我们做了一个商业问题研究的智能体框架「atypica.AI」。将「语言模型」应用于理解商业领域中那些难以量化的主观因素——消费者情绪、市场认知和决策偏好；通过「智能体」来「塑造」消费者的个性和认知；通过与智能体的「互动」来获得消费者的行为和决策。

如果，「物理」为「客观世界」建模；那么，「语言模型」则为「主观世界」建模。

## 技术实现

### 架构

- **前端**：Next.js 14 (App Router)
- **数据库**：Prisma + PostgreSQL 15 (包含 pgvector 扩展)
- **AI模型**：Claude 3 + GPT-4o
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
  ├── app/                   # Next.js 页面和API路由
  │   ├── (study)/           # 研究助手核心功能
  │   ├── (agents)/          # 多 agent answer
  │   ├── (persona)/         # 用户画像库
  │   ├── (interviewProject)/# 访谈模拟
  │   ├── (newStudy)/        # 用户发掘
  │   └── (auth)/            # 用户认证
  ├── ai/                    # ai service
  ├── components/            # UI组件
  ├── hooks/                 # custom hooks
  ├── i18n/                  # 国际化
  ├── lib/                   # 工具函数和配置
  └── prisma/                # prisma service
```

## 本地开发

1. 安装依赖

```bash
pnpm install
```

2. 配置环境变量

```bash
cp .env.example .env
```

设置 `AUTH_SECRET`, read more: https://cli.authjs.dev

```bash
npx auth secret
```

3. 初始化数据库

新建本地数据库

```bash
psql -d postgres
CREATE USER atypica WITH LOGIN PASSWORD 'atypica' SUPERUSER;  # migration 执行时包含创建 vector extension, 需要 superuser 权限
CREATE DATABASE atypica_dev OWNER atypica;
CREATE DATABASE atypica_dev_shadow OWNER atypica;
\q
```

向 .env 文件写入数据库配置：

```env
DATABASE_URL=postgresql://atypica:atypica@localhost:5432/atypica_dev
SHADOW_DATABASE_URL=postgresql://atypica:atypica@localhost:5432/atypica_dev_shadow
```

执行 migrations

```bash
npx prisma generate  # 生成必要的类型定义
npx prisma migrate dev  # 执行数据库迁移
```

4. 启动开发服务器

```bash
pnpm dev
```

5. 使用生产模式运行

```bash
docker buildx build --platform linux/amd64 . -t atypica-llm-app -f Dockerfile
docker run -p 3000:3000 --env-file ./.env.docker atypica-llm-app
```

## 安装 PostgreSQL 15 和 pgvector

### macOS 安装教程

1. 安装 PostgreSQL 15

```bash
brew install postgresql@15
brew services start postgresql@15
```

由于 pgvector 扩展对 PostgreSQL 15 的兼容性问题，无法直接通过 Homebrew 安装，需要手动编译安装。

2. 安装编译依赖

```bash
brew install git make gcc
```

3. 编译安装 pgvector

```bash
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
cd pgvector
export PG_CONFIG=/opt/homebrew/bin/pg_config  # Apple Silicon
# export PG_CONFIG=/usr/local/bin/pg_config   # Intel Mac
make
make install
```

4. 验证安装

```bash
psql -d postgres -c "CREATE EXTENSION vector;"
psql -d postgres -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

## 运维功能

### 月度Token重置

自动重置用户月度tokens，每分钟运行一次，只在global集群执行。

详细说明：[Monthly Tokens Reset](./docs/monthly-tokens-reset.md)

### 管理员工具

项目提供了管理员工具脚本用于用户管理：

```bash
# 创建新用户（自动验证邮箱）
pnpm admintool create-user email@example.com password123

# 将现有用户设为超级管理员
pnpm admintool make-admin email@example.com
```

脚本位置：`scripts/admintool.ts`

## 贡献指南

欢迎提交Issue和PR，一起改进atypica.AI！
