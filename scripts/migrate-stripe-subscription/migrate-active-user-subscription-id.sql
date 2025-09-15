-- ======================================================================
-- 迁移 activeUserSubscriptionId 字段
-- 将 activeUserSubscriptionId 从 extra JSON 字段移动到直接字段
-- ======================================================================

-- 第一步：迁移数据从 extra 字段到直接字段
UPDATE "TokensAccount"
SET "activeUserSubscriptionId" = CAST("extra" ->> 'activeUserSubscriptionId' AS INTEGER)
WHERE "extra" ->> 'activeUserSubscriptionId' IS NOT NULL
  AND "extra" ->> 'activeUserSubscriptionId' != 'null'
  AND "activeUserSubscriptionId" IS NULL;

-- 验证第一步迁移结果
SELECT
    id,
    "userId",
    "teamId",
    "activeUserSubscriptionId",
    "extra" ->> 'activeUserSubscriptionId' as extra_active_subscription_id,
    CASE
        WHEN "activeUserSubscriptionId" IS NOT NULL THEN 'direct field has data'
        WHEN "extra" ->> 'activeUserSubscriptionId' IS NOT NULL THEN 'only in extra field'
        ELSE 'no activeUserSubscriptionId'
    END as migration_status
FROM "TokensAccount"
WHERE "extra" ->> 'activeUserSubscriptionId' IS NOT NULL
   OR "activeUserSubscriptionId" IS NOT NULL
ORDER BY id;

-- ======================================================================
-- 第二步：清理 extra 字段中的 activeUserSubscriptionId
-- 注意：此步骤应在验证上述迁移无误后再执行
-- ======================================================================

-- 从 extra JSON 字段中移除 activeUserSubscriptionId
UPDATE "TokensAccount"
SET "extra" = "extra" - 'activeUserSubscriptionId'
WHERE "extra" ? 'activeUserSubscriptionId';

-- 验证最终清理结果
SELECT
    id,
    "userId",
    "teamId",
    "activeUserSubscriptionId",
    "extra" ->> 'activeUserSubscriptionId' as extra_active_subscription_id,
    CASE
        WHEN "activeUserSubscriptionId" IS NOT NULL AND ("extra" ->> 'activeUserSubscriptionId') IS NULL THEN 'migration completed'
        WHEN "activeUserSubscriptionId" IS NULL AND ("extra" ->> 'activeUserSubscriptionId') IS NULL THEN 'no activeUserSubscriptionId (normal)'
        ELSE 'migration incomplete'
    END as final_status
FROM "TokensAccount"
ORDER BY id;

-- 统计迁移结果
SELECT
    COUNT(*) as total_records,
    COUNT("activeUserSubscriptionId") as records_with_direct_field,
    COUNT(CASE WHEN "extra" ? 'activeUserSubscriptionId' THEN 1 END) as records_with_extra_field,
    COUNT(CASE WHEN "activeUserSubscriptionId" IS NOT NULL AND NOT ("extra" ? 'activeUserSubscriptionId') THEN 1 END) as successfully_migrated
FROM "TokensAccount";