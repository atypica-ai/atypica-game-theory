-- ======================================================================
-- 第一步：迁移 Stripe 支付数据
-- 将原来混合存储的数据分离到对应的 Stripe 字段中
-- ======================================================================

-- 处理 status = 'pending' 的记录：charge 复制到 stripeSession
UPDATE "PaymentRecord" 
SET "stripeSession" = "pingxxCharge"
WHERE "paymentMethod" = 'stripe' 
  AND "status" = 'pending';

-- 处理 status = 'succeeded' 的记录：charge 复制到 stripeInvoice，chargeId 复制到 stripeInvoiceId  
UPDATE "PaymentRecord" 
SET "stripeInvoice" = "pingxxCharge",
    "stripeInvoiceId" = "pingxxChargeId"
WHERE "paymentMethod" = 'stripe' 
  AND "status" = 'succeeded';

-- 验证第一步迁移结果
SELECT 
    id,
    "paymentMethod",
    status,
    CASE 
        WHEN "stripeSession" != '{}' THEN 'stripeSession has data'
        WHEN "stripeInvoice" != '{}' THEN 'stripeInvoice has data'
        ELSE 'no stripe data'
    END as stripe_data_status
FROM "PaymentRecord" 
WHERE "paymentMethod" = 'stripe'
ORDER BY id;

-- ======================================================================
-- 第二步：清理 Stripe 支付记录中的 Pingxx 字段
-- 注意：此步骤应在验证上述迁移无误后再执行
-- ======================================================================

-- 清理 paymentMethod = 'stripe' 的记录中的 Pingxx 字段
UPDATE "PaymentRecord" 
SET "pingxxCharge" = '{}',
    "pingxxChargeId" = NULL,
    "pingxxCredential" = '{}'
WHERE "paymentMethod" = 'stripe';

-- 验证最终清理结果
SELECT 
    id,
    "paymentMethod",
    status,
    CASE 
        WHEN "pingxxCharge" = '{}' AND "pingxxChargeId" IS NULL AND "pingxxCredential" = '{}' THEN 'pingxx fields cleared'
        ELSE 'pingxx fields still have data'
    END as pingxx_cleanup_status,
    CASE 
        WHEN "stripeSession" != '{}' OR "stripeInvoice" != '{}' OR "stripeInvoiceId" IS NOT NULL THEN 'stripe fields have data'
        ELSE 'no stripe data'
    END as stripe_data_status
FROM "PaymentRecord" 
WHERE "paymentMethod" = 'stripe'
ORDER BY id;