-- ============================================================================
-- Context 驱动架构迁移
-- ============================================================================
-- 日期: 2026-01-26
-- 目的: 将 Report/Podcast 迁移到 context 驱动架构
-- 相关 PR: #278
--
-- 本迁移支持从 Analyst 中心化架构过渡到 UserChat.context 驱动架构。
-- Reports 和 Podcasts 将通过 context.reportTokens 和 context.podcastTokens 索引。
--
-- 重要提示: 按顺序执行这些迁移。部分迁移是两阶段的，需要在两阶段之间发布代码。
-- ============================================================================

-- ============================================================================
-- 1. 🚨 关键: 迁移 analystKind 到 Report.extra
-- ============================================================================
-- 问题: 如果没有 analyst 关联，analystKind 信息（决定报告系统提示词）将丢失
-- 影响: 特别影响 productRnD 类型的报告
-- 优先级: 必须在任何 analyst 断开连接之前首先运行
-- ============================================================================

-- 为所有还没有 analystKind 的报告添加
UPDATE "AnalystReport"
SET "extra" = COALESCE("extra", '{}'::jsonb) ||
  jsonb_build_object('analystKind', a.kind)
FROM "Analyst" a
WHERE "AnalystReport"."analystId" = a.id
  AND a.kind IS NOT NULL
  AND ("AnalystReport"."extra"->>'analystKind') IS NULL;

-- 验证查询（应该返回 0）
-- SELECT COUNT(*) FROM "AnalystReport" ar
-- JOIN "Analyst" a ON ar."analystId" = a.id
-- WHERE a.kind IS NOT NULL
--   AND (ar."extra"->>'analystKind') IS NULL;


-- ============================================================================
-- 2. 迁移 userId 到 Reports 和 Podcasts
-- ============================================================================
-- 目的: 添加直接用户关联，绕过 Analyst 依赖
-- 安全性: userId 可空，不会破坏现有查询
-- ============================================================================

-- 从 Analyst 复制 userId 到 Reports
UPDATE "AnalystReport"
SET "userId" = a."userId"
FROM "Analyst" a
WHERE "AnalystReport"."analystId" = a.id
  AND "AnalystReport"."userId" IS NULL
  AND a."userId" IS NOT NULL;

-- 从 Analyst 复制 userId 到 Podcasts
UPDATE "AnalystPodcast"
SET "userId" = a."userId"
FROM "Analyst" a
WHERE "AnalystPodcast"."analystId" = a.id
  AND "AnalystPodcast"."userId" IS NULL
  AND a."userId" IS NOT NULL;

-- 验证查询（应该显示更新的记录数）
-- SELECT COUNT(*) FROM "AnalystReport" WHERE "userId" IS NOT NULL;
-- SELECT COUNT(*) FROM "AnalystPodcast" WHERE "userId" IS NOT NULL;


-- ============================================================================
-- 3. 迁移 Report tokens 到 UserChat.context
-- ============================================================================
-- 目的: 通过 context.reportTokens 索引报告，而不是 analystId
-- 性能: 大数据集可能需要时间
-- 安全性: 只更新 UserChat.context，不破坏现有查询
-- ============================================================================

UPDATE "UserChat"
SET "context" = COALESCE("context", '{}'::jsonb) ||
  jsonb_build_object(
    'reportTokens',
    COALESCE(
      ("context"->>'reportTokens')::jsonb,
      '[]'::jsonb
    ) ||
    COALESCE(
      (
        SELECT jsonb_agg(DISTINCT token)
        FROM "AnalystReport"
        WHERE "AnalystReport"."analystId" IN (
          SELECT id FROM "Analyst" WHERE "Analyst"."studyUserChatId" = "UserChat".id
        )
      ),
      '[]'::jsonb
    )
  )
WHERE "UserChat".kind = 'study'
  AND ("context"->>'reportTokens') IS NULL  -- 幂等性：只在首次运行时执行
  AND EXISTS (
    SELECT 1 FROM "Analyst" a
    JOIN "AnalystReport" ar ON ar."analystId" = a.id
    WHERE a."studyUserChatId" = "UserChat".id
  );

-- 验证查询（应该显示带有 reportTokens 的 UserChats）
-- SELECT
--   id,
--   token,
--   "context"->>'reportTokens' as report_tokens
-- FROM "UserChat"
-- WHERE kind = 'study'
--   AND "context"->>'reportTokens' IS NOT NULL
-- LIMIT 10;


-- ============================================================================
-- 4. 迁移 Podcast tokens 到 UserChat.context
-- ============================================================================
-- 目的: 通过 context.podcastTokens 索引播客，而不是 analystId
-- 性能: 大数据集可能需要时间
-- 安全性: 只更新 UserChat.context，不破坏现有查询
-- ============================================================================

UPDATE "UserChat"
SET "context" = COALESCE("context", '{}'::jsonb) ||
  jsonb_build_object(
    'podcastTokens',
    COALESCE(
      ("context"->>'podcastTokens')::jsonb,
      '[]'::jsonb
    ) ||
    COALESCE(
      (
        SELECT jsonb_agg(DISTINCT token)
        FROM "AnalystPodcast"
        WHERE "AnalystPodcast"."analystId" IN (
          SELECT id FROM "Analyst" WHERE "Analyst"."studyUserChatId" = "UserChat".id
        )
      ),
      '[]'::jsonb
    )
  )
WHERE "UserChat".kind = 'study'
  AND ("context"->>'podcastTokens') IS NULL  -- 幂等性：只在首次运行时执行
  AND EXISTS (
    SELECT 1 FROM "Analyst" a
    JOIN "AnalystPodcast" ap ON ap."analystId" = a.id
    WHERE a."studyUserChatId" = "UserChat".id
  );

-- 验证查询（应该显示带有 podcastTokens 的 UserChats）
-- SELECT
--   id,
--   token,
--   "context"->>'podcastTokens' as podcast_tokens
-- FROM "UserChat"
-- WHERE kind = 'study'
--   AND "context"->>'podcastTokens' IS NOT NULL
-- LIMIT 10;


-- ============================================================================
-- 5. 为 Reports 添加元数据快照
-- ============================================================================
-- 目的: 让报告自包含 title, description, userChatToken
-- 安全性: 只更新 Report.extra，不破坏现有查询
-- 幂等性: 可以安全地多次运行（检查 userChatToken 是否存在）
-- ============================================================================

UPDATE "AnalystReport"
SET "extra" = COALESCE("extra", '{}'::jsonb) ||
  jsonb_build_object(
    'title', uc.title,
    'description', COALESCE(a.topic, ''),
    'userChatToken', uc.token
  )
FROM "Analyst" a
JOIN "UserChat" uc ON uc.id = a."studyUserChatId"
WHERE "AnalystReport"."analystId" = a.id
  AND ("AnalystReport"."extra"->>'userChatToken') IS NULL;

-- 验证查询（应该显示带有元数据的报告）
-- SELECT
--   id,
--   token,
--   "extra"->>'title' as title,
--   "extra"->>'description' as description,
--   "extra"->>'userChatToken' as user_chat_token
-- FROM "AnalystReport"
-- WHERE "extra"->>'userChatToken' IS NOT NULL
-- LIMIT 10;


-- ============================================================================
-- 6. 为 Podcasts 添加元数据快照
-- ============================================================================
-- 目的: 让播客自包含 userChatToken
-- 安全性: 只更新 Podcast.extra，不破坏现有查询
-- 幂等性: 可以安全地多次运行（检查 userChatToken 是否存在）
-- ============================================================================

UPDATE "AnalystPodcast"
SET "extra" = COALESCE("extra", '{}'::jsonb) ||
  jsonb_build_object('userChatToken', uc.token)
FROM "Analyst" a
JOIN "UserChat" uc ON uc.id = a."studyUserChatId"
WHERE "AnalystPodcast"."analystId" = a.id
  AND ("AnalystPodcast"."extra"->>'userChatToken') IS NULL;

-- 验证查询（应该显示带有 userChatToken 的播客）
-- SELECT
--   id,
--   token,
--   "extra"->>'userChatToken' as user_chat_token
-- FROM "AnalystPodcast"
-- WHERE "extra"->>'userChatToken' IS NOT NULL
-- LIMIT 10;


-- ============================================================================
-- 7. 两阶段迁移: recommendedQuestions（第一阶段）
-- ============================================================================
-- 目的: 将 recommendedStudies 从 Analyst.extra 移到 UserChat.extra
-- 第一阶段: 复制数据（发布能从两个位置读取的代码）
-- 第二阶段: 删除旧数据（在第一阶段部署并验证后）
-- ⚠️ 在第一阶段部署并验证之前，不要运行第二阶段！
-- ============================================================================

-- 第一阶段: 复制 recommendedStudies 到 UserChat.extra
UPDATE "UserChat"
SET "extra" = COALESCE("extra", '{}'::jsonb) ||
  jsonb_build_object(
    'recommendedStudies',
    a."extra"->'recommendedStudies'
  )
FROM "Analyst" a
WHERE "UserChat".id = a."studyUserChatId"
  AND "UserChat".kind = 'study'
  AND a."extra"->>'recommendedStudies' IS NOT NULL
  AND ("UserChat"."extra"->>'recommendedStudies') IS NULL;

-- 验证查询（在进入第二阶段前比较计数）
-- SELECT
--   'Analyst.extra' as source,
--   COUNT(*) as count
-- FROM "Analyst"
-- WHERE "extra"->>'recommendedStudies' IS NOT NULL
-- UNION ALL
-- SELECT
--   'UserChat.extra' as source,
--   COUNT(*) as count
-- FROM "UserChat"
-- WHERE "extra"->>'recommendedStudies' IS NOT NULL;

-- ⚠️⚠️⚠️ 在此停止！⚠️⚠️⚠️
-- 部署代码更改并验证新代码从 UserChat.extra 读取
-- 只有在成功部署和验证后才继续第二阶段


-- ============================================================================
-- 8. 两阶段迁移: 其他 extra 字段到 context（第一阶段）
-- ============================================================================
-- 目的: 将业务逻辑字段从 extra 迁移到 context
-- 迁移字段:
--   - referenceUserChats: 参考研究列表
--   - researchTemplateId: 研究模板 ID
--   - newStudyUserChatToken: Scout 生成的研究 token
--   - briefUserChatId: Brief chat ID
--   - deepResearchExpert: 深度研究专家选择
-- 第一阶段: 复制数据（发布能从两个位置读取的代码）
-- 第二阶段: 删除旧数据（在第一阶段部署并验证后）
-- ⚠️ 在第一阶段部署并验证之前，不要运行第二阶段！
-- ============================================================================

-- 第一阶段: 复制字段到 context（只处理有值的字段）
UPDATE "UserChat"
SET "context" = COALESCE("context", '{}'::jsonb) ||
  jsonb_strip_nulls(
    jsonb_build_object(
      'referenceUserChats', "extra"->'referenceUserChats',
      'researchTemplateId', "extra"->'researchTemplateId',
      'newStudyUserChatToken', "extra"->'newStudyUserChatToken',
      'briefUserChatId', "extra"->'briefUserChatId',
      'deepResearchExpert', "extra"->'deepResearchExpert'
    )
  )
WHERE (
  "extra"->>'referenceUserChats' IS NOT NULL OR
  "extra"->>'researchTemplateId' IS NOT NULL OR
  "extra"->>'newStudyUserChatToken' IS NOT NULL OR
  "extra"->>'briefUserChatId' IS NOT NULL OR
  "extra"->>'deepResearchExpert' IS NOT NULL
)
-- 避免重复迁移
AND (
  ("extra"->>'referenceUserChats' IS NOT NULL AND "context"->>'referenceUserChats' IS NULL) OR
  ("extra"->>'researchTemplateId' IS NOT NULL AND "context"->>'researchTemplateId' IS NULL) OR
  ("extra"->>'newStudyUserChatToken' IS NOT NULL AND "context"->>'newStudyUserChatToken' IS NULL) OR
  ("extra"->>'briefUserChatId' IS NOT NULL AND "context"->>'briefUserChatId' IS NULL) OR
  ("extra"->>'deepResearchExpert' IS NOT NULL AND "context"->>'deepResearchExpert' IS NULL)
);

-- 验证查询（在进入第二阶段前比较计数）
-- SELECT
--   'extra fields' as source,
--   COUNT(DISTINCT id) as count
-- FROM "UserChat"
-- WHERE "extra"->>'referenceUserChats' IS NOT NULL
--    OR "extra"->>'researchTemplateId' IS NOT NULL
--    OR "extra"->>'newStudyUserChatToken' IS NOT NULL
--    OR "extra"->>'briefUserChatId' IS NOT NULL
--    OR "extra"->>'deepResearchExpert' IS NOT NULL
-- UNION ALL
-- SELECT
--   'context fields' as source,
--   COUNT(DISTINCT id) as count
-- FROM "UserChat"
-- WHERE "context"->>'referenceUserChats' IS NOT NULL
--    OR "context"->>'researchTemplateId' IS NOT NULL
--    OR "context"->>'newStudyUserChatToken' IS NOT NULL
--    OR "context"->>'briefUserChatId' IS NOT NULL
--    OR "context"->>'deepResearchExpert' IS NOT NULL;

-- ⚠️⚠️⚠️ 在此停止！⚠️⚠️⚠️
-- 部署代码更改并验证新代码从 UserChat.context 读取这些字段
-- 只有在成功部署和验证后才继续第二阶段


-- ============================================================================
-- 9. 两阶段迁移: 其他 extra 字段到 context（第二阶段）
-- ============================================================================
-- ⚠️ 警告: 只在第一阶段部署并验证后运行！
-- 目的: 从 extra 清理已迁移的字段
-- 破坏性: 从 extra 删除数据（但应该已经在 context 中了）
-- ============================================================================

-- 第二阶段: 从 extra 删除已迁移的字段（在部署后运行）
-- UPDATE "UserChat"
-- SET "extra" = "extra" - 'referenceUserChats' - 'researchTemplateId' - 'newStudyUserChatToken' - 'briefUserChatId' - 'deepResearchExpert'
-- WHERE "extra"->>'referenceUserChats' IS NOT NULL
--    OR "extra"->>'researchTemplateId' IS NOT NULL
--    OR "extra"->>'newStudyUserChatToken' IS NOT NULL
--    OR "extra"->>'briefUserChatId' IS NOT NULL
--    OR "extra"->>'deepResearchExpert' IS NOT NULL;

-- 最终验证（应该返回 0）
-- SELECT COUNT(*) FROM "UserChat"
-- WHERE "extra"->>'referenceUserChats' IS NOT NULL
--    OR "extra"->>'researchTemplateId' IS NOT NULL
--    OR "extra"->>'newStudyUserChatToken' IS NOT NULL
--    OR "extra"->>'briefUserChatId' IS NOT NULL
--    OR "extra"->>'deepResearchExpert' IS NOT NULL;


-- ============================================================================
-- 10. 两阶段迁移: recommendedStudies（第二阶段）
-- ============================================================================
-- ⚠️ 警告: 只在第一阶段部署并验证后运行！
-- 目的: 从 Analyst.extra 清理旧的 recommendedStudies 数据
-- 破坏性: 从 Analyst.extra 删除数据（但应该已经在 UserChat 中了）
-- ============================================================================

-- 第二阶段: 从 Analyst.extra 删除 recommendedStudies（在部署后运行）
-- UPDATE "Analyst"
-- SET "extra" = "extra" - 'recommendedStudies'
-- WHERE "extra"->>'recommendedStudies' IS NOT NULL;

-- 最终验证（应该返回 0）
-- SELECT COUNT(*) FROM "Analyst"
-- WHERE "extra"->>'recommendedStudies' IS NOT NULL;


-- ============================================================================
-- 迁移总结
-- ============================================================================
-- 运行所有迁移后:
-- ✅ Reports 的 extra 中有 analystKind 用于系统提示词选择
-- ✅ Reports 和 Podcasts 有直接的 userId 关联
-- ✅ UserChat.context 索引所有 reportTokens 和 podcastTokens（包括未完成的）
-- ✅ Reports 有元数据快照（title, description, userChatToken, analystKind）
-- ✅ Podcasts 有元数据快照（userChatToken）
-- ✅ RecommendedStudies 从 Analyst.extra 移到 UserChat.extra
-- ✅ 业务逻辑字段从 UserChat.extra 移到 UserChat.context:
--    - referenceUserChats
--    - researchTemplateId
--    - newStudyUserChatToken
--    - briefUserChatId
--    - deepResearchExpert
--
-- 需要的代码更改:
-- ✅ 从 report.extra 读取 analystKind，而不是 analyst.kind
-- ✅ 使用 context tokens 查询 reports/podcasts，而不是 analystId
-- ✅ 从 userChat.extra 读取 recommendedStudies，而不是 analyst.extra
-- ✅ 从 userChat.context 读取业务逻辑字段，而不是 extra
--
-- UserChat.extra 保留字段（会话元数据，不迁移）:
-- - clientIp, userAgent, locale, geo
-- - feedback
-- - error
-- ============================================================================
