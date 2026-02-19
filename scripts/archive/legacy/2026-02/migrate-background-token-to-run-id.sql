-- Migrate backgroundToken to extra.runId
-- For rows that have a non-null backgroundToken but no extra.runId,
-- copy the value into extra.runId then clear backgroundToken.

UPDATE "UserChat"
SET
  "extra" = jsonb_set(
    COALESCE("extra", '{}'::jsonb),
    '{runId}',
    to_jsonb("backgroundToken"::text),
    true
  ),
  "backgroundToken" = NULL,
  "updatedAt" = NOW()
WHERE "backgroundToken" IS NOT NULL
  AND COALESCE("extra"->>'runId', '') = '';
