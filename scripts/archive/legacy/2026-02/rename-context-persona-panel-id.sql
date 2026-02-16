-- Rename interviewPersonaPanelId to personaPanelId in UserChat.context
-- This is a simple JSON key rename, no value transformation needed

-- Step 1: Preview affected records (查看影响范围)
SELECT
  id,
  token,
  context->>'interviewPersonaPanelId' as persona_panel_id,
  kind
FROM "UserChat"
WHERE context ? 'interviewPersonaPanelId';

-- Step 2: Execute migration (执行迁移)
UPDATE "UserChat"
SET
  context = (context - 'interviewPersonaPanelId')
    || jsonb_build_object('personaPanelId', context->'interviewPersonaPanelId'),
  "updatedAt" = NOW()
WHERE context ? 'interviewPersonaPanelId';

-- Step 3: Verify migration (验证迁移结果)
-- Should return 0 rows (no old key remaining)
SELECT id, token FROM "UserChat" WHERE context ? 'interviewPersonaPanelId';

-- Should return all migrated rows (new key present)
SELECT id, token, context->>'personaPanelId' as persona_panel_id
FROM "UserChat"
WHERE context ? 'personaPanelId';
