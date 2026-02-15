-- Migrate briefUserChatId to briefUserChatToken in UserChat.context
-- This script converts numeric IDs to string tokens by joining the UserChat table

-- Step 1: Preview affected records (查看影响范围)
SELECT
  u1.id,
  u1.token as user_chat_token,
  u1.context->>'briefUserChatId' as old_brief_id,
  u2.token as new_brief_token,
  u1.context
FROM "UserChat" u1
JOIN "UserChat" u2 ON (u1.context->>'briefUserChatId')::int = u2.id
WHERE u1.context ? 'briefUserChatId';

-- Step 2: Execute migration (执行迁移)
UPDATE "UserChat" u1
SET
  context = (
    -- Remove briefUserChatId and add briefUserChatToken
    u1.context
    - 'briefUserChatId'
    || jsonb_build_object('briefUserChatToken', u2.token)
  ),
  "updatedAt" = NOW()
FROM "UserChat" u2
WHERE (u1.context->>'briefUserChatId')::int = u2.id
  AND u1.context ? 'briefUserChatId';

-- Step 3: Verify migration (验证结果)
-- Should return 0 rows if migration is complete
SELECT
  id,
  token,
  context
FROM "UserChat"
WHERE context ? 'briefUserChatId';

-- Step 4: Check new briefUserChatToken records (检查新字段)
SELECT
  id,
  token,
  context->>'briefUserChatToken' as brief_token,
  context
FROM "UserChat"
WHERE context ? 'briefUserChatToken'
LIMIT 10;
