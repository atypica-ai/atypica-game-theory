# Stripe Customer ID 按币种持久化方案

## 背景

当前 Stripe 支付流程在创建 Checkout Session 时主要使用 `customer_email`，没有稳定复用固定 `customer`。
这会导致同一用户在不同支付行为中出现多个 Stripe Customer，进而影响：

- Billing Portal 定位一致性
- 后续订阅管理和审计追踪
- 货币维度（USD/CNY）下 customer 归属一致性

本方案目标是为用户建立「按币种隔离、不可切换」的 Stripe Customer ID 持久化机制。

## 需求约束（硬约束）

1. Stripe Customer ID 必须按币种分离：
- `USD` 一套 customerId
- `CNY` 一套 customerId

2. 同一币种下 customerId 一旦绑定后不可切换：
- 已有就复用
- 不允许自动覆盖成其他 customerId

3. 需要补一个一次性迁移脚本：
- 从历史支付记录提取 customerId
- 回填到用户侧持久化字段

## 目录与命名约定

### 代码位置

- Stripe 工具方法放在：`src/app/payment/(stripe)/utils.ts`
  - 原因：现有 Stripe 域内通用方法集中在该文件（如 `requirePersonalUser`、`createPaymentRecord`）

### 迁移脚本位置

- 放在：`scripts/archive/stripe-migration/`
  - 原因：本次确认可直接沿用 `stripe-migration` 目录

- 建议文件名：
  - `scripts/archive/stripe-migration/migrate-stripe-customer-id-by-currency.ts`

## 数据结构设计

建议在“用户持久化 extra”中维护以下结构（逻辑结构）：

```ts
{
  stripeCustomerIds: {
    USD?: string;
    CNY?: string;
  };
}
```

说明：

- `USD` 与 `CNY` 完全独立。
- key 固定使用大写：`USD`、`CNY`。
- 写入策略为「只补空，不覆盖」。
- 落点使用 `UserProfile.extra`。

## Utility 方案

新增 Stripe customer 工具方法（放在 `src/app/payment/(stripe)/utils.ts`）：

- `getOrCreateStripeCustomerIdForUser({ userId, currency })`

行为：

1. 读取当前用户（或归一到 personal user）已存储的该币种 `customerId`。
2. 若存在，直接返回。
3. 若不存在，调用 `stripe.customers.create(...)` 创建并回写到用户持久化 extra 后返回。
4. 若检测到已有值但与外部候选值冲突，不覆盖，抛错并记录日志。

额外要求：

- 仅服务端调用（保持 `server-only` 语义）。
- 回写时必须 merge 既有 extra，不能覆盖其他业务字段。
- 对 team 购买场景统一归属到 personal user（避免 team user 与 personal user 产生分裂映射）。

## 支付流程接入点

在 `src/app/payment/(stripe)/create.ts` 三个入口统一接入：

1. `createSubscriptionStripeSession`
2. `createPaymentStripeSession`
3. `createTeamSubscriptionStripeSession`

接入方式：

- 调用 `getOrCreateStripeCustomerIdForUser`
- Checkout Session 创建时传 `customer: <resolvedCustomerId>`
- 不再依赖 `paymentRecord` 作为运行时兜底路径

## 迁移脚本方案

脚本：`scripts/archive/stripe-migration/migrate-stripe-customer-id-by-currency.ts`

### 数据来源

- `PaymentRecord`（优先 `status = "succeeded"`）
- 从 `stripeInvoice.customer` 提取 customerId
- 从 `PaymentRecord.currency` 区分 USD/CNY

### 回填策略

1. 按 `userId + currency` 聚合候选 customerId。
2. 只在目标币种为空时写入。
3. 目标币种已有值：
- 若相同：跳过
- 若不同：标记冲突，打印并计入统计，不覆盖

### 执行模式

- `--dry-run`：只统计与打印，不写库
- 默认执行：按上述策略回填

### 输出统计

- 扫描记录数
- 提取成功数
- 实际写入数
- 已存在跳过数
- 冲突数
- 错误数

## 一致性与风控

1. 不可切换保障：
- 运行时 utility 与迁移脚本都执行“只补空不覆盖”。

2. 冲突可见性：
- 冲突必须输出可检索日志（userId、currency、existing、candidate）。

3. 幂等性：
- 迁移脚本重复执行不应改变已绑定数据。

## 已确认项

1. 用户持久化 extra 落点：
- 使用 `UserProfile.extra`。

2. team 购买归属：
- 统一归属 personal user。

3. 运行时读取策略：
- 不需要兜底路径。
- 运行时只通过 utility 保证返回 customerId（无则创建并写入 `stripeCustomerIds`）。
- 历史数据通过一次性迁移脚本处理，后续业务代码不从 `paymentRecord` 读取 customerId。

## 实施顺序

1. 定稿 extra 字段落点与类型定义
2. 实现 `getOrCreateStripeCustomerIdForUser`
3. 接入 `create.ts` 三个 Stripe session 入口
4. 编写并先执行迁移脚本 `--dry-run`
5. 审核冲突后执行正式回填
6. 验证 Billing Portal、订阅购买、充值购买链路
