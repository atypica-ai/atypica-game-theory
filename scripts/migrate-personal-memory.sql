-- Migrate personal memory: move core text → working string array, clear core
-- Only affects userId rows (personal). teamId rows are untouched.
-- Run on production BEFORE deploying the code change.
--
-- Each non-empty line in core becomes an element in the working JSON array.
-- Empty lines and whitespace-only lines are filtered out.

UPDATE "Memory"
SET
  working = (
    SELECT COALESCE(json_agg(line ORDER BY ordinality), '[]'::json)
    FROM unnest(string_to_array(core, E'\n')) WITH ORDINALITY AS t(line, ordinality)
    WHERE trim(line) != ''
  ),
  core = ''
WHERE
  "userId" IS NOT NULL
  AND "teamId" IS NULL
  AND core != '';
