# PostgreSQL 15 和 pgvector 安装指南

本文档介绍如何在 macOS 上安装 PostgreSQL 15 和 pgvector 扩展。

## macOS 安装教程

### 1. 安装 PostgreSQL 15

使用 Homebrew 安装 PostgreSQL 15：

```bash
brew install postgresql@15
brew services start postgresql@15
```

### 2. 安装编译依赖

由于 pgvector 扩展对 PostgreSQL 15 的兼容性问题，无法直接通过 Homebrew 安装，需要手动编译安装。

首先安装必要的编译工具：

```bash
brew install git make gcc
```

### 3. 编译安装 pgvector

克隆 pgvector 仓库并编译安装：

```bash
git clone --branch v0.8.1 https://github.com/pgvector/pgvector.git
cd pgvector
```

设置 PostgreSQL 配置路径（根据你的 Mac 架构选择）：

```bash
# Apple Silicon (M1/M2/M3)
export PG_CONFIG=/opt/homebrew/bin/pg_config

# Intel Mac
# export PG_CONFIG=/usr/local/bin/pg_config
```

> **注意：** 如果编译过程中遇到问题，可以尝试不设置 `PG_CONFIG` 环境变量，或者反之。根据实际情况调整。

编译并安装：

```bash
make
make install
```

### 4. 验证安装

连接到 PostgreSQL 并验证 pgvector 扩展是否安装成功：

```bash
psql -d postgres -c "CREATE EXTENSION vector;"
psql -d postgres -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

如果看到 vector 扩展的信息，说明安装成功。

## 创建开发数据库

### 1. 创建用户和数据库

```bash
psql -d postgres
```

在 psql 中执行：

```sql
-- 创建用户（需要 SUPERUSER 权限以创建 vector extension）
CREATE USER atypica WITH LOGIN PASSWORD 'atypica' SUPERUSER;

-- 创建开发数据库
CREATE DATABASE atypica_dev OWNER atypica;

-- 创建 shadow 数据库（用于 Prisma migrate）
CREATE DATABASE atypica_dev_shadow OWNER atypica;

-- 退出 psql
\q
```

### 2. 配置环境变量

在项目根目录的 `.env` 文件中添加数据库连接配置：

```env
DATABASE_URL=postgresql://atypica:atypica@localhost:5432/atypica_dev
SHADOW_DATABASE_URL=postgresql://atypica:atypica@localhost:5432/atypica_dev_shadow
```

### 3. 执行数据库迁移

```bash
# 生成 Prisma 客户端和类型定义
npx prisma generate

# 执行数据库迁移
npx prisma migrate dev
```

## 常见问题

### Q: 为什么需要 SUPERUSER 权限？

A: 在 migration 执行时需要创建 vector extension，这个操作需要 SUPERUSER 权限。如果你的生产环境不允许应用使用 SUPERUSER，可以：

1. 手动在数据库中创建 vector extension
2. 然后移除用户的 SUPERUSER 权限

### Q: 编译 pgvector 时出错怎么办？

A: 常见问题和解决方案：

1. **找不到 pg_config**：确保 PostgreSQL 已正确安装，并检查 `PG_CONFIG` 路径
2. **权限问题**：使用 `sudo make install` 安装
3. **编译错误**：确保安装了所有编译依赖（git、make、gcc）

### Q: 如何卸载 pgvector？

A: 进入 pgvector 目录执行：

```bash
make uninstall
```

## 其他平台安装

### Linux (Ubuntu/Debian)

```bash
# 安装 PostgreSQL 15
sudo apt-get update
sudo apt-get install postgresql-15 postgresql-server-dev-15

# 安装 pgvector
git clone --branch v0.8.1 https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

### Docker

如果你使用 Docker，可以直接使用包含 pgvector 的镜像：

```bash
docker run -d \
  --name atypica-postgres \
  -e POSTGRES_USER=atypica \
  -e POSTGRES_PASSWORD=atypica \
  -e POSTGRES_DB=atypica_dev \
  -p 5432:5432 \
  pgvector/pgvector:pg15
```

## 相关文档

- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [PostgreSQL 官方文档](https://www.postgresql.org/docs/15/)
- [Prisma 数据库迁移](./how-to-squash-migrations.md)
- [项目快速开始](../../README.md#本地开发)
