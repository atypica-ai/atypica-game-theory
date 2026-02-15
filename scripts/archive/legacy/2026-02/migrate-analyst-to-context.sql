-- ============================================================================
-- Analyst 字段迁移到 UserChat.context
-- ============================================================================
-- 日期: 2026-02-15
-- 目的: 将 LegacyAnalyst 模型的历史数据迁移到 UserChat.context
-- 相关提交: 640865fe
--
-- ⚠️ 重要: 此脚本应在 Prisma migration 之后运行
-- 执行顺序:
--   1. npx prisma migrate dev --name deprecate_analyst_model
--   2. 部署新代码
--   3. 运行本脚本迁移历史数据
--
-- 本迁移完成从 Analyst 中心化到 UserChat.context 驱动的最后一步。
--
-- 迁移字段:
--   - Analyst.kind -> UserChat.context.analystKind
--   - Analyst.topic -> UserChat.context.studyTopic
--   - Analyst.studyLog -> UserChat.context.studyLog
--   - Analyst.attachments -> UserChat.context.attachments
--   - Analyst.locale -> UserChat.context.defaultLocale
--
-- 重要提示: 这些迁移是幂等的，可以安全地多次运行。
-- ============================================================================


-- ============================================================================
-- 1. 迁移 analystKind
-- ============================================================================
-- 目的: 将研究类型从 Analyst.kind 迁移到 UserChat.context.analystKind
-- 值域: testing, insights, creation, planning, productRnD, fastInsight, misc
-- 幂等性: 只更新 context 中没有 analystKind 的记录
-- ============================================================================

UPDATE "UserChat"
SET "context" = COALESCE("context", '{}'::jsonb) ||
  jsonb_build_object('analystKind', a.kind)
FROM "LegacyAnalyst" a
WHERE "UserChat".id = a."studyUserChatId"
  AND "UserChat".kind = 'study'
  AND a.kind IS NOT NULL
  AND ("UserChat"."context"->>'analystKind') IS NULL;

-- 验证查询（应该显示迁移的记录数）
-- SELECT COUNT(*) FROM "UserChat"
-- WHERE kind = 'study'
--   AND "context"->>'analystKind' IS NOT NULL;


-- ============================================================================
-- 2. 迁移 studyTopic
-- ============================================================================
-- 目的: 将研究主题从 Analyst.topic 迁移到 UserChat.context.studyTopic
-- 注意: topic 字段可能包含多行文本（包括研究计划）
-- 幂等性: 只更新 context 中没有 studyTopic 的记录
-- ============================================================================

UPDATE "UserChat"
SET "context" = COALESCE("context", '{}'::jsonb) ||
  jsonb_build_object('studyTopic', a.topic)
FROM "LegacyAnalyst" a
WHERE "UserChat".id = a."studyUserChatId"
  AND "UserChat".kind = 'study'
  AND a.topic IS NOT NULL
  AND a.topic != ''
  AND ("UserChat"."context"->>'studyTopic') IS NULL;

-- 验证查询（应该显示带有 studyTopic 的记录）
-- SELECT
--   id,
--   token,
--   LEFT("context"->>'studyTopic', 100) as study_topic_preview
-- FROM "UserChat"
-- WHERE kind = 'study'
--   AND "context"->>'studyTopic' IS NOT NULL
-- LIMIT 10;


-- ============================================================================
-- 3. 迁移 studyLog
-- ============================================================================
-- 目的: 将研究日志从 Analyst.studyLog 迁移到 UserChat.context.studyLog
-- 注意: studyLog 是从消息自动生成的研究日志，可能很长
-- 幂等性: 只更新 context 中没有 studyLog 的记录
-- ============================================================================

UPDATE "UserChat"
SET "context" = COALESCE("context", '{}'::jsonb) ||
  jsonb_build_object('studyLog', a."studyLog")
FROM "LegacyAnalyst" a
WHERE "UserChat".id = a."studyUserChatId"
  AND "UserChat".kind = 'study'
  AND a."studyLog" IS NOT NULL
  AND a."studyLog" != ''
  AND ("UserChat"."context"->>'studyLog') IS NULL;

-- 验证查询（应该显示带有 studyLog 的记录）
-- SELECT
--   id,
--   token,
--   LENGTH("context"->>'studyLog') as study_log_length
-- FROM "UserChat"
-- WHERE kind = 'study'
--   AND "context"->>'studyLog' IS NOT NULL
-- ORDER BY study_log_length DESC
-- LIMIT 10;


-- ============================================================================
-- 4. 迁移 attachments
-- ============================================================================
-- 目的: 将附件从 Analyst.attachments 迁移到 UserChat.context.attachments
-- 格式: JSON 数组 [{ "type": "...", "url": "...", ... }]
-- 幂等性: 只更新 context 中没有 attachments 的记录
-- ============================================================================

UPDATE "UserChat"
SET "context" = COALESCE("context", '{}'::jsonb) ||
  jsonb_build_object('attachments', a.attachments)
FROM "LegacyAnalyst" a
WHERE "UserChat".id = a."studyUserChatId"
  AND "UserChat".kind = 'study'
  AND a.attachments IS NOT NULL
  AND jsonb_array_length(a.attachments::jsonb) > 0
  AND ("UserChat"."context"->'attachments') IS NULL;

-- 验证查询（应该显示带有 attachments 的记录）
-- SELECT
--   id,
--   token,
--   jsonb_array_length("context"->'attachments') as attachment_count
-- FROM "UserChat"
-- WHERE kind = 'study'
--   AND "context"->'attachments' IS NOT NULL
--   AND jsonb_array_length("context"->'attachments') > 0;


-- ============================================================================
-- 5. 迁移 defaultLocale
-- ============================================================================
-- 目的: 将语言设置从 Analyst.locale 迁移到 UserChat.context.defaultLocale
-- 值域: zh-CN, en-US, ja-JP 等
-- 幂等性: 只更新 context 中没有 defaultLocale 的记录
-- ============================================================================

UPDATE "UserChat"
SET "context" = COALESCE("context", '{}'::jsonb) ||
  jsonb_build_object('defaultLocale', a.locale)
FROM "LegacyAnalyst" a
WHERE "UserChat".id = a."studyUserChatId"
  AND "UserChat".kind = 'study'
  AND a.locale IS NOT NULL
  AND ("UserChat"."context"->>'defaultLocale') IS NULL;

-- 验证查询（应该显示 locale 分布）
-- SELECT
--   "context"->>'defaultLocale' as locale,
--   COUNT(*) as count
-- FROM "UserChat"
-- WHERE kind = 'study'
--   AND "context"->>'defaultLocale' IS NOT NULL
-- GROUP BY "context"->>'defaultLocale'
-- ORDER BY count DESC;


-- ============================================================================
-- 迁移总结
-- ============================================================================
-- 运行所有迁移后的验证查询:
--
-- 1. 检查迁移覆盖率（应该接近 100%）
-- SELECT
--   COUNT(*) as total_analysts,
--   COUNT(CASE WHEN uc."context"->>'analystKind' IS NOT NULL THEN 1 END) as migrated_kind,
--   COUNT(CASE WHEN uc."context"->>'studyTopic' IS NOT NULL THEN 1 END) as migrated_topic,
--   COUNT(CASE WHEN uc."context"->>'studyLog' IS NOT NULL THEN 1 END) as migrated_log,
--   COUNT(CASE WHEN uc."context"->'attachments' IS NOT NULL THEN 1 END) as migrated_attachments,
--   COUNT(CASE WHEN uc."context"->>'defaultLocale' IS NOT NULL THEN 1 END) as migrated_locale
-- FROM "LegacyAnalyst" a
-- JOIN "UserChat" uc ON uc.id = a."studyUserChatId";
--
-- 2. 检查数据完整性（应该返回 0）
-- SELECT COUNT(*) FROM "LegacyAnalyst" a
-- JOIN "UserChat" uc ON uc.id = a."studyUserChatId"
-- WHERE a.kind IS NOT NULL
--   AND (uc."context"->>'analystKind') IS NULL;
--
-- 3. 采样检查数据正确性
-- SELECT
--   a.id as analyst_id,
--   a.kind as old_kind,
--   uc."context"->>'analystKind' as new_kind,
--   LEFT(a.topic, 50) as old_topic,
--   LEFT(uc."context"->>'studyTopic', 50) as new_topic
-- FROM "LegacyAnalyst" a
-- JOIN "UserChat" uc ON uc.id = a."studyUserChatId"
-- WHERE a.kind IS NOT NULL
-- LIMIT 10;
-- ============================================================================

-- ============================================================================
-- 后续步骤
-- ============================================================================
-- 执行顺序（已更新为安全的上线流程）:
-- 1. ✅ 先运行 Prisma migration（npx prisma migrate dev --name deprecate_analyst_model）
-- 2. ✅ 部署新代码（已经全部从 UserChat.context 读取）
-- 3. ✅ 运行本脚本迁移历史数据
-- 4. ✅ 验证历史数据迁移成功
-- 5. ⏳ 观察一段时间后，可以考虑删除 LegacyAnalyst 表
-- ============================================================================
