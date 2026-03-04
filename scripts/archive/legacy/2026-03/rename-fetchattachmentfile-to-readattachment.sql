-- Rename fetchAttachmentFile → readAttachment in ChatMessage parts.
-- Replaces both toolName and type (e.g. "tool-fetchAttachmentFile" → "tool-readAttachment") in one pass.

UPDATE "ChatMessage"
SET parts = REPLACE(parts::text, 'fetchAttachmentFile', 'readAttachment')::jsonb
WHERE "createdAt" >= NOW() - INTERVAL '2 days'
  AND parts::text LIKE '%fetchAttachmentFile%';
