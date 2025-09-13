-- ======================================================================
-- 迁移 TeamTokens 数据到 TokensAccount
-- 将原来分离的 UserTokens 和 TeamTokens 合并到统一的 TokensAccount 表中
-- ======================================================================

-- 第一步：将 TeamTokens 数据迁移到 TokensAccount 表
-- 注意：UserTokens 已经在 migration 中重命名为 TokensAccount
INSERT INTO "TokensAccount" (
    "teamId",
    "permanentBalance",
    "monthlyBalance",
    "monthlyResetAt",
    "extra",
    "createdAt",
    "updatedAt"
)
SELECT
    "teamId",
    "permanentBalance",
    "monthlyBalance",
    "monthlyResetAt",
    "extra",
    "createdAt",
    "updatedAt"
FROM "TeamTokens";

-- 验证迁移结果
SELECT
    id,
    CASE
        WHEN "userId" IS NOT NULL THEN 'User Account'
        WHEN "teamId" IS NOT NULL THEN 'Team Account'
        ELSE 'Invalid Account'
    END as account_type,
    COALESCE("userId", "teamId") as account_id,
    "permanentBalance",
    "monthlyBalance",
    "createdAt"
FROM "TokensAccount"
ORDER BY account_type, account_id;

-- 统计信息
SELECT
    'Original UserTokens (now TokensAccount with userId)' as source,
    COUNT(*) as count
FROM "TokensAccount"
WHERE "userId" IS NOT NULL

UNION ALL

SELECT
    'Migrated TeamTokens (now TokensAccount with teamId)' as source,
    COUNT(*) as count
FROM "TokensAccount"
WHERE "teamId" IS NOT NULL

UNION ALL

SELECT
    'Original TeamTokens (legacy table)' as source,
    COUNT(*) as count
FROM "TeamTokens";

-- ======================================================================
-- 第二步：清理原始 TeamTokens 表（可选，建议先验证数据迁移正确）
-- 注意：此步骤应在验证上述迁移无误后再执行
-- ======================================================================

-- 验证数据一致性
-- SELECT
--     tt."teamId",
--     tt."permanentBalance" as team_tokens_balance,
--     ta."permanentBalance" as tokens_account_balance,
--     tt."monthlyBalance" as team_tokens_monthly,
--     ta."monthlyBalance" as tokens_account_monthly,
--     CASE
--         WHEN tt."permanentBalance" = ta."permanentBalance" AND tt."monthlyBalance" = ta."monthlyBalance" THEN 'Match'
--         ELSE 'Mismatch'
--     END as data_consistency
-- FROM "TeamTokens" tt
-- JOIN "TokensAccount" ta ON tt."teamId" = ta."teamId"
-- ORDER BY tt."teamId";

-- 清理 TeamTokens 表（取消注释以执行）
-- DROP TABLE "TeamTokens";
