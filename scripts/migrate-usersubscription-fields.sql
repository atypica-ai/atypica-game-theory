-- ======================================================================
-- 迁移 UserSubscription 数据：将 extra 字段中的数据迁移到直接字段
-- extra.paymentRecordId -> paymentRecordId
-- extra.invoice.parent.subscription_details.subscription -> stripeSubscriptionId
-- ======================================================================

-- 第一步：迁移 paymentRecordId
UPDATE "UserSubscription"
SET "paymentRecordId" = (extra->>'paymentRecordId')::int
WHERE extra->>'paymentRecordId' IS NOT NULL
  AND "paymentRecordId" IS NULL;

-- 第二步：迁移 stripeSubscriptionId
-- 处理 subscription_details.subscription 为字符串的情况
UPDATE "UserSubscription"
SET "stripeSubscriptionId" = extra->'invoice'->'parent'->'subscription_details'->>'subscription'
WHERE extra->'invoice'->'parent'->'subscription_details'->>'subscription' IS NOT NULL
  AND jsonb_typeof(extra->'invoice'->'parent'->'subscription_details'->'subscription') = 'string'
  AND "stripeSubscriptionId" IS NULL;

-- 处理 subscription_details.subscription 为对象的情况
UPDATE "UserSubscription"
SET "stripeSubscriptionId" = extra->'invoice'->'parent'->'subscription_details'->'subscription'->>'id'
WHERE extra->'invoice'->'parent'->'subscription_details'->'subscription'->>'id' IS NOT NULL
  AND jsonb_typeof(extra->'invoice'->'parent'->'subscription_details'->'subscription') = 'object'
  AND "stripeSubscriptionId" IS NULL;

-- 验证迁移结果
SELECT
    id,
    "paymentRecordId",
    "stripeSubscriptionId",
    CASE
        WHEN extra->>'paymentRecordId' IS NOT NULL THEN 'has paymentRecordId in extra'
        ELSE 'no paymentRecordId in extra'
    END as extra_payment_status,
    CASE
        WHEN extra->'invoice'->'parent'->'subscription_details'->'subscription' IS NOT NULL THEN 'has subscription in extra'
        ELSE 'no subscription in extra'
    END as extra_subscription_status
FROM "UserSubscription"
ORDER BY id;

-- 可选：清理已迁移的数据（在验证无误后执行）
-- UPDATE "UserSubscription"
-- SET extra = extra - 'paymentRecordId'
-- WHERE extra ? 'paymentRecordId';
