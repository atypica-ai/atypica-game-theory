-- ======================================================================
-- 迁移 TokensLog 和 Subscription 表的团队数据
-- 为团队用户设置 teamId，并调整 tokens 记录的归属逻辑
-- ======================================================================

-- 第一步：为 TokensLog 表中团队用户的记录设置 teamId
-- 将团队用户的 tokens 记录关联到对应的团队

UPDATE "TokensLog"
SET "teamId" = "User"."teamIdAsMember"
FROM "User"
WHERE "TokensLog"."userId" = "User"."id"
  AND "User"."teamIdAsMember" IS NOT NULL;

-- 验证第一步结果
SELECT
    COUNT(*) as total_tokens_logs,
    COUNT(CASE WHEN "teamId" IS NOT NULL THEN 1 END) as with_team_id,
    COUNT(CASE WHEN "teamId" IS NULL THEN 1 END) as without_team_id
FROM "TokensLog";

-- 第二步：为 Subscription 表中团队用户的记录设置 teamId
-- 将团队用户的订阅记录关联到对应的团队

UPDATE "Subscription"
SET "teamId" = "User"."teamIdAsMember"
FROM "User"
WHERE "Subscription"."userId" = "User"."id"
  AND "User"."teamIdAsMember" IS NOT NULL;

-- 验证第二步结果
SELECT
    COUNT(*) as total_subscriptions,
    COUNT(CASE WHEN "teamId" IS NOT NULL THEN 1 END) as with_team_id,
    COUNT(CASE WHEN "teamId" IS NULL THEN 1 END) as without_team_id
FROM "Subscription";

-- 第三步：更新 TokensLog 中的 resourceType 字段
-- 将 'UserSubscription' 更新为 'Subscription'

UPDATE "TokensLog"
SET "resourceType" = 'Subscription'
WHERE "resourceType" = 'UserSubscription';

-- 验证第三步结果
SELECT
    "resourceType",
    COUNT(*) as count
FROM "TokensLog"
WHERE "resourceType" IN ('Subscription', 'UserSubscription')
GROUP BY "resourceType"
ORDER BY "resourceType";

-- 第四步：对于团队相关的非消费记录，移除 userId（保留 teamId）
-- 购买、礼品等团队级别的 tokens 只保留 teamId，移除个人 userId
-- 但消费记录必须保留 userId 用于追踪具体消费者

UPDATE "TokensLog"
SET "userId" = NULL
WHERE "teamId" IS NOT NULL
  AND "verb" IN ('recharge', 'gift', 'subscription', 'subscriptionReset', 'signup')
  AND "userId" IS NOT NULL;

-- 验证最终结果
SELECT
    "verb",
    COUNT(*) as total_count,
    COUNT(CASE WHEN "teamId" IS NOT NULL AND "userId" IS NULL THEN 1 END) as team_only,
    COUNT(CASE WHEN "teamId" IS NOT NULL AND "userId" IS NOT NULL THEN 1 END) as team_and_user,
    COUNT(CASE WHEN "teamId" IS NULL AND "userId" IS NOT NULL THEN 1 END) as user_only
FROM "TokensLog"
GROUP BY "verb"
ORDER BY "verb";

-- ======================================================================
-- 验证和统计信息
-- ======================================================================

-- 统计团队相关的 tokens 记录分布
SELECT
    'TokensLog Team Distribution' as table_name,
    CASE
        WHEN "teamId" IS NOT NULL AND "userId" IS NULL THEN 'Team Only'
        WHEN "teamId" IS NOT NULL AND "userId" IS NOT NULL THEN 'Team + User'
        WHEN "teamId" IS NULL AND "userId" IS NOT NULL THEN 'User Only'
        ELSE 'Invalid'
    END as record_type,
    COUNT(*) as count
FROM "TokensLog"
GROUP BY
    CASE
        WHEN "teamId" IS NOT NULL AND "userId" IS NULL THEN 'Team Only'
        WHEN "teamId" IS NOT NULL AND "userId" IS NOT NULL THEN 'Team + User'
        WHEN "teamId" IS NULL AND "userId" IS NOT NULL THEN 'User Only'
        ELSE 'Invalid'
    END

UNION ALL

-- 统计团队相关的 subscription 记录分布
SELECT
    'Subscription Team Distribution' as table_name,
    CASE
        WHEN "teamId" IS NOT NULL AND "userId" IS NOT NULL THEN 'Team + User'
        WHEN "teamId" IS NULL AND "userId" IS NOT NULL THEN 'User Only'
        ELSE 'Invalid'
    END as record_type,
    COUNT(*) as count
FROM "Subscription"
GROUP BY
    CASE
        WHEN "teamId" IS NOT NULL AND "userId" IS NOT NULL THEN 'Team + User'
        WHEN "teamId" IS NULL AND "userId" IS NOT NULL THEN 'User Only'
        ELSE 'Invalid'
    END
ORDER BY table_name, record_type;

-- 检查是否有异常数据
SELECT
    'TokensLog Anomalies' as check_type,
    COUNT(*) as count
FROM "TokensLog"
WHERE "teamId" IS NULL AND "userId" IS NULL

UNION ALL

SELECT
    'Subscription Anomalies' as check_type,
    COUNT(*) as count
FROM "Subscription"
WHERE "teamId" IS NULL AND "userId" IS NULL

UNION ALL

SELECT
    'Old ResourceType Remaining' as check_type,
    COUNT(*) as count
FROM "TokensLog"
WHERE "resourceType" = 'UserSubscription';
