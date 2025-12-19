# AWS Marketplace SaaS Contract 集成方案

## 概述

本文档说明如何将 atypica.AI 对接到 AWS Marketplace，使用 SaaS Contract 计费模式。

### 集成信息

- **类型**: SaaS Contract
- **计费模式**: AWS Contract with Free Trial
- **计划**: Team Plan (允许 3 个用户)
- **订阅渠道**: AWS Marketplace 作为独立订阅渠道，与现有 Stripe/Ping++ 共存
- **用户流程**: 用户在 AWS Marketplace 订阅后自动跳转到 atypica.AI

---

## Product Code 获取

**Product Code** 在 AWS Marketplace Management Portal 中查找：

1. 登录 [AWS Marketplace Management Portal](https://aws.amazon.com/marketplace/management)
2. 进入你的产品页面
3. 在 "Product details" 或 "Technical information" 中查看 Product Code
4. 格式类似：`abc123xyz456`

---

## 用户订阅流程

```
用户在 AWS Marketplace 点击订阅
    ↓
AWS 引导用户完成订阅（可能需要配置 contract 参数）
    ↓
AWS 重定向到你的 Registration URL：
https://atypica.ai/api/aws-marketplace/register?x-amzn-marketplace-token=TOKEN
    ↓
你的系统调用 AWS ResolveCustomer API 验证 token
    ↓
获取 customerIdentifier 和 productCode
    ↓
创建/登录用户，激活订阅
    ↓
重定向到应用首页
```

---

## 必需的 AWS 服务

### 1. AWS Marketplace Entitlement Service

- SaaS Contract 使用 **Entitlement Service** 查询客户订阅的计划
- 不需要实时 metering（那是 SaaS Subscriptions 模式）

### 2. SNS (Simple Notification Service)

- 接收订阅状态变更通知
- 需要配置 SNS Topic ARN（AWS 会提供）

---

## 实施步骤

### 1. 数据库 Schema 扩展

在 `prisma/schema.prisma` 中添加以下模型：

```prisma
// AWS Marketplace 客户信息
model AWSMarketplaceCustomer {
  id                String   @id @default(cuid())
  userId            String   @unique
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // AWS 客户标识
  customerIdentifier String  @unique  // AWS customer ID
  productCode        String            // AWS product code

  // 订阅状态
  status            String   @default("pending") // pending, active, cancelled, expired

  // 订阅详情
  dimension         String?  // 订阅的维度/计划（如 "team_plan"）
  quantity          Int      @default(3)        // 允许用户数（如 3）

  // 时间信息
  subscribedAt      DateTime?
  expiresAt         DateTime?
  cancelledAt       DateTime?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([customerIdentifier])
  @@index([userId])
}

// 订阅事件日志（可选）
model AWSMarketplaceEvent {
  id               String   @id @default(cuid())
  customerId       String
  customer         AWSMarketplaceCustomer @relation(fields: [customerId], references: [id])

  eventType        String   // subscribe-success, unsubscribe-success, etc.
  eventData        Json     // 完整的 SNS 消息

  createdAt        DateTime @default(now())

  @@index([customerId])
  @@index([eventType])
}
```

**运行 migration**:

```bash
npx prisma migrate dev --name add_aws_marketplace_models
npx prisma generate
```

---

### 2. 安装 AWS SDK 依赖

```bash
pnpm add @aws-sdk/client-marketplace-metering @aws-sdk/client-marketplace-entitlement-service
```

---

### 3. 环境变量配置

在 `.env.local` 中添加：

```env
# AWS Marketplace 配置
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_MARKETPLACE_PRODUCT_CODE=your_product_code
AWS_MARKETPLACE_SNS_TOPIC_ARN=arn:aws:sns:us-east-1:...
```

**注意**: AWS Marketplace 固定使用 `us-east-1` region。

---

### 4. Registration URL Endpoint

创建 `src/app/api/aws-marketplace/register/route.ts`:

```typescript
"use server";

import { NextRequest, NextResponse } from "next/server";
import { MarketplaceMetering } from "@aws-sdk/client-marketplace-metering";
import { prisma } from "@/prisma/prisma";
import { signIn } from "@/auth";

const marketplaceClient = new MarketplaceMetering({
  region: "us-east-1", // AWS Marketplace 固定使用 us-east-1
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const token = searchParams.get("x-amzn-marketplace-token");

  if (!token) {
    return NextResponse.json(
      { error: "Missing marketplace token" },
      { status: 400 }
    );
  }

  try {
    // 1. 调用 AWS ResolveCustomer API 验证 token
    const response = await marketplaceClient.resolveCustomer({
      RegistrationToken: token,
    });

    const { CustomerIdentifier, ProductCode } = response;

    if (!CustomerIdentifier || !ProductCode) {
      throw new Error("Invalid AWS response");
    }

    // 2. 检查是否已存在该客户
    let awsCustomer = await prisma.aWSMarketplaceCustomer.findUnique({
      where: { customerIdentifier: CustomerIdentifier },
      include: { user: true },
    });

    if (awsCustomer) {
      // 已有客户，直接登录
      await signIn("credentials", {
        email: awsCustomer.user.email,
        redirect: false,
      });

      return NextResponse.redirect(new URL("/", req.url));
    }

    // 3. 新客户，需要完成注册流程
    // 重定向到注册页面，带上 AWS 客户信息
    const signupUrl = new URL("/auth/aws-marketplace-signup", req.url);
    signupUrl.searchParams.set("customerIdentifier", CustomerIdentifier);
    signupUrl.searchParams.set("productCode", ProductCode);

    return NextResponse.redirect(signupUrl);
  } catch (error) {
    console.error("AWS Marketplace registration error:", error);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
```

---

### 5. Entitlement Service 集成

创建 `src/lib/aws-marketplace/entitlement.ts`:

```typescript
import { MarketplaceEntitlementService } from "@aws-sdk/client-marketplace-entitlement-service";

const entitlementClient = new MarketplaceEntitlementService({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * 获取客户的所有权益
 */
export async function getCustomerEntitlements(customerIdentifier: string) {
  const response = await entitlementClient.getEntitlements({
    ProductCode: process.env.AWS_MARKETPLACE_PRODUCT_CODE!,
    Filter: {
      CUSTOMER_IDENTIFIER: [customerIdentifier],
    },
  });

  return response.Entitlements || [];
}

/**
 * 检查客户的订阅状态和权益
 */
export async function checkCustomerSubscription(customerIdentifier: string) {
  const entitlements = await getCustomerEntitlements(customerIdentifier);

  if (entitlements.length === 0) {
    return { active: false, plan: null, quantity: 0 };
  }

  // 假设 dimension 是 "team_plan"
  const teamPlan = entitlements.find(
    (e) => e.Dimension === "team_plan"
  );

  return {
    active: true,
    plan: teamPlan?.Dimension || null,
    quantity: teamPlan?.Value?.IntegerValue || 3,
    expiresAt: teamPlan?.ExpirationDate,
  };
}

/**
 * 同步客户订阅状态到数据库
 */
export async function syncCustomerSubscription(customerIdentifier: string) {
  const subscription = await checkCustomerSubscription(customerIdentifier);

  const awsCustomer = await prisma.aWSMarketplaceCustomer.findUnique({
    where: { customerIdentifier },
  });

  if (!awsCustomer) {
    throw new Error("Customer not found");
  }

  await prisma.aWSMarketplaceCustomer.update({
    where: { id: awsCustomer.id },
    data: {
      status: subscription.active ? "active" : "expired",
      dimension: subscription.plan,
      quantity: subscription.quantity,
      expiresAt: subscription.expiresAt,
    },
  });

  return subscription;
}
```

---

### 6. SNS Webhook Endpoint

创建 `src/app/api/aws-marketplace/webhook/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prisma";
import { checkCustomerSubscription } from "@/lib/aws-marketplace/entitlement";

export async function POST(req: NextRequest) {
  const body = await req.json();

  // 1. 验证 SNS 消息签名（重要！生产环境必须验证）
  // TODO: 使用 @aws-sdk/sns-validator 或类似库验证签名

  // 2. 处理 SNS 订阅确认
  if (body.Type === "SubscriptionConfirmation") {
    // 需要访问 SubscribeURL 来确认订阅
    await fetch(body.SubscribeURL);
    return NextResponse.json({ status: "confirmed" });
  }

  // 3. 处理订阅事件通知
  if (body.Type === "Notification") {
    const message = JSON.parse(body.Message);
    const customerIdentifier = message["customer-identifier"];
    const productCode = message["product-code"];
    const action = message.action;

    // 查找客户
    const awsCustomer = await prisma.aWSMarketplaceCustomer.findUnique({
      where: { customerIdentifier },
    });

    if (!awsCustomer) {
      console.error("Customer not found:", customerIdentifier);
      return NextResponse.json({ status: "error" }, { status: 404 });
    }

    // 根据事件类型处理
    switch (action) {
      case "subscribe-success":
        // 订阅成功，获取权益信息
        const subscription = await checkCustomerSubscription(customerIdentifier);

        await prisma.aWSMarketplaceCustomer.update({
          where: { id: awsCustomer.id },
          data: {
            status: "active",
            subscribedAt: new Date(),
            dimension: subscription.plan,
            quantity: subscription.quantity,
            expiresAt: subscription.expiresAt,
          },
        });
        break;

      case "unsubscribe-pending":
        // 取消订阅待处理
        await prisma.aWSMarketplaceCustomer.update({
          where: { id: awsCustomer.id },
          data: {
            status: "cancelling",
          },
        });
        break;

      case "unsubscribe-success":
        // 取消订阅成功
        await prisma.aWSMarketplaceCustomer.update({
          where: { id: awsCustomer.id },
          data: {
            status: "cancelled",
            cancelledAt: new Date(),
          },
        });
        break;

      case "entitlement-updated":
        // 权益更新（续费、升级等）
        const updatedSubscription = await checkCustomerSubscription(customerIdentifier);

        await prisma.aWSMarketplaceCustomer.update({
          where: { id: awsCustomer.id },
          data: {
            dimension: updatedSubscription.plan,
            quantity: updatedSubscription.quantity,
            expiresAt: updatedSubscription.expiresAt,
          },
        });
        break;
    }

    // 记录事件日志
    await prisma.aWSMarketplaceEvent.create({
      data: {
        customerId: awsCustomer.id,
        eventType: action,
        eventData: message,
      },
    });

    return NextResponse.json({ status: "processed" });
  }

  return NextResponse.json({ status: "ignored" });
}
```

---

### 7. 用户注册页面

创建 `src/app/(auth)/aws-marketplace-signup/page.tsx`:

```typescript
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AWSMarketplaceSignupForm } from "./signup-form";

export default async function AWSMarketplaceSignupPage({
  searchParams,
}: {
  searchParams: { customerIdentifier?: string; productCode?: string };
}) {
  const t = await getTranslations("auth");

  if (!searchParams.customerIdentifier || !searchParams.productCode) {
    return <div>Invalid AWS Marketplace registration</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">{t("aws_marketplace_signup")}</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <AWSMarketplaceSignupForm
          customerIdentifier={searchParams.customerIdentifier}
          productCode={searchParams.productCode}
        />
      </Suspense>
    </div>
  );
}
```

创建 `src/app/(auth)/aws-marketplace-signup/signup-form.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AWSMarketplaceSignupForm({
  customerIdentifier,
  productCode,
}: {
  customerIdentifier: string;
  productCode: string;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. 创建用户账户
      const result = await signUp({
        email: formData.email,
        password: formData.password,
        name: formData.name,
      });

      if (!result.success) {
        alert(result.message);
        return;
      }

      // 2. 关联 AWS Marketplace 客户信息
      const response = await fetch("/api/aws-marketplace/link-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: result.data.userId,
          customerIdentifier,
          productCode,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to link AWS customer");
      }

      // 3. 重定向到首页
      router.push("/");
    } catch (error) {
      console.error("Signup error:", error);
      alert("Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <Input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
      />
      <Input
        type="password"
        placeholder="Password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        required
      />
      <Input
        type="text"
        placeholder="Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Creating account..." : "Complete Registration"}
      </Button>
    </form>
  );
}
```

---

### 8. 关联客户 API

创建 `src/app/api/aws-marketplace/link-customer/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prisma";
import { checkCustomerSubscription } from "@/lib/aws-marketplace/entitlement";

export async function POST(req: NextRequest) {
  const { userId, customerIdentifier, productCode } = await req.json();

  try {
    // 获取订阅信息
    const subscription = await checkCustomerSubscription(customerIdentifier);

    // 创建 AWS Marketplace 客户记录
    await prisma.aWSMarketplaceCustomer.create({
      data: {
        userId,
        customerIdentifier,
        productCode,
        status: subscription.active ? "active" : "pending",
        dimension: subscription.plan,
        quantity: subscription.quantity,
        subscribedAt: subscription.active ? new Date() : null,
        expiresAt: subscription.expiresAt,
      },
    });

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("Link customer error:", error);
    return NextResponse.json(
      { error: "Failed to link customer" },
      { status: 500 }
    );
  }
}
```

---

## AWS Marketplace Portal 配置

在 [AWS Marketplace Management Portal](https://aws.amazon.com/marketplace/management) 中配置：

### 1. SaaS Registration URL

设置为：
```
https://atypica.ai/api/aws-marketplace/register
```

### 2. SNS Topic Configuration

1. 在 AWS SNS 控制台（us-east-1 region）创建一个 Topic
2. 订阅你的 webhook endpoint：
   ```
   Protocol: HTTPS
   Endpoint: https://atypica.ai/api/aws-marketplace/webhook
   ```
3. 确认订阅（系统会自动处理 SubscriptionConfirmation）
4. 将 Topic ARN 填入 AWS Marketplace 产品配置

### 3. 定价配置

- **Free Trial**: 设置试用期限（如 14 天）
- **Team Plan**:
  - Dimension: `team_plan`
  - Description: Team Plan with 3 users
  - Price: 根据你的定价策略
  - Contract Length: Monthly/Yearly

---

## 权限检查中间件

创建 `src/lib/aws-marketplace/middleware.ts` 用于检查用户是否有有效的 AWS Marketplace 订阅：

```typescript
import { prisma } from "@/prisma/prisma";
import { auth } from "@/auth";

export async function checkAWSMarketplaceSubscription() {
  const session = await auth();

  if (!session?.user?.id) {
    return { hasAccess: false, reason: "not_authenticated" };
  }

  // 检查是否是 AWS Marketplace 用户
  const awsCustomer = await prisma.aWSMarketplaceCustomer.findUnique({
    where: { userId: session.user.id },
  });

  if (!awsCustomer) {
    // 不是 AWS Marketplace 用户，可能是其他渠道订阅
    return { hasAccess: true, reason: "not_aws_customer" };
  }

  // 检查订阅状态
  if (awsCustomer.status !== "active") {
    return { hasAccess: false, reason: "subscription_inactive" };
  }

  // 检查是否过期
  if (awsCustomer.expiresAt && awsCustomer.expiresAt < new Date()) {
    return { hasAccess: false, reason: "subscription_expired" };
  }

  return {
    hasAccess: true,
    subscription: {
      plan: awsCustomer.dimension,
      quantity: awsCustomer.quantity,
      expiresAt: awsCustomer.expiresAt,
    },
  };
}
```

---

## 测试清单

### 本地测试

1. **环境变量**: 确保所有 AWS 凭证已配置
2. **数据库**: 运行 migration 并验证表创建成功
3. **注册流程**: 使用 AWS 提供的测试 token 测试注册流程
4. **权益查询**: 测试 Entitlement Service API 调用

### AWS Marketplace 测试

1. **Limited 状态测试**: 在 Limited 状态下可以进行测试订阅
2. **Registration URL**: 验证重定向流程正常
3. **SNS Webhook**: 验证事件接收和处理
4. **订阅状态同步**: 验证订阅/取消订阅事件正确更新数据库

### 生产发布前

1. **SNS 签名验证**: 实现 SNS 消息签名验证（安全要求）
2. **错误处理**: 完善所有 API 的错误处理和日志记录
3. **监控**: 设置 AWS CloudWatch 监控和告警
4. **文档**: 准备用户文档说明如何通过 AWS Marketplace 订阅

---

## 常见问题

### Q1: 用户如何取消订阅？

A: 用户需要在 AWS Marketplace 控制台中取消订阅，系统会通过 SNS 接收 `unsubscribe-success` 事件并更新状态。

### Q2: Free Trial 如何实现？

A: AWS Marketplace 原生支持 Free Trial，在产品配置中设置即可。试用期结束后自动转为付费订阅。

### Q3: 如何处理团队成员限制（3人）？

A: 在应用层实现：
- 检查团队成员数量
- 如果是 AWS Marketplace Team Plan 用户，限制最多 3 人
- 在添加成员时验证 `awsCustomer.quantity`

### Q4: Contract 续约如何处理？

A: AWS 会自动处理续约，系统会收到 `entitlement-updated` 事件，更新 `expiresAt` 时间。

---

## 参考资料

- [AWS Marketplace SaaS Integration Guide](https://docs.aws.amazon.com/marketplace/latest/userguide/saas-integrate-saas.html)
- [AWS Marketplace Entitlement Service API](https://docs.aws.amazon.com/marketplaceentitlement/latest/APIReference/Welcome.html)
- [AWS Marketplace Metering Service API](https://docs.aws.amazon.com/marketplacemetering/latest/APIReference/Welcome.html)
- [SNS Message Signature Verification](https://docs.aws.amazon.com/sns/latest/dg/sns-verify-signature-of-message.html)

---

## 下一步行动

1. ✅ 创建数据库 Schema
2. ✅ 实现 Registration URL endpoint
3. ✅ 实现 Entitlement Service 集成
4. ✅ 实现 SNS Webhook endpoint
5. ⏳ 配置 AWS Marketplace 产品设置
6. ⏳ 测试完整订阅流程
7. ⏳ 实现 SNS 消息签名验证
8. ⏳ 添加监控和日志
9. ⏳ 准备发布到 Public 状态
