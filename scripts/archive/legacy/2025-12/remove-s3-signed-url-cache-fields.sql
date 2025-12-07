-- Remove s3SignedUrl cache fields from extra JSONB columns
-- These fields were used for caching S3 signed URLs but are now deprecated
-- Run this SQL to clean up the database

-- IMPORTANT: Backup your database before running these UPDATE statements!

BEGIN;

-- Remove from ImageGeneration table (s3SignedUrl, s3SignedUrlExpiresAt)
UPDATE "ImageGeneration"
SET extra = extra - 's3SignedUrl' - 's3SignedUrlExpiresAt'
WHERE extra ? 's3SignedUrl' OR extra ? 's3SignedUrlExpiresAt';

-- Remove from AttachmentFile table (s3SignedUrl, s3SignedUrlExpiresAt)
UPDATE "AttachmentFile"
SET extra = extra - 's3SignedUrl' - 's3SignedUrlExpiresAt'
WHERE extra ? 's3SignedUrl' OR extra ? 's3SignedUrlExpiresAt';

-- Remove from AnalystPodcast table (s3SignedUrl, s3SignedUrlExpiresAt)
UPDATE "AnalystPodcast"
SET extra = extra - 's3SignedUrl' - 's3SignedUrlExpiresAt'
WHERE extra ? 's3SignedUrl' OR extra ? 's3SignedUrlExpiresAt';

-- Remove from AnalystReport table (s3SignedCoverObjectUrl, s3SignedCoverObjectUrlExpiresAt, s3SignedPdfObjectUrl, s3SignedPdfObjectUrlExpiresAt)
UPDATE "AnalystReport"
SET extra = extra - 's3SignedCoverObjectUrl' - 's3SignedCoverObjectUrlExpiresAt' - 's3SignedPdfObjectUrl' - 's3SignedPdfObjectUrlExpiresAt'
WHERE extra ? 's3SignedCoverObjectUrl'
   OR extra ? 's3SignedCoverObjectUrlExpiresAt'
   OR extra ? 's3SignedPdfObjectUrl'
   OR extra ? 's3SignedPdfObjectUrlExpiresAt';

COMMIT;

-- Verify the cleanup
SELECT 'ImageGeneration' as table_name, COUNT(*) as remaining_count
FROM "ImageGeneration"
WHERE extra ? 's3SignedUrl' OR extra ? 's3SignedUrlExpiresAt'
UNION ALL
SELECT 'AttachmentFile', COUNT(*)
FROM "AttachmentFile"
WHERE extra ? 's3SignedUrl' OR extra ? 's3SignedUrlExpiresAt'
UNION ALL
SELECT 'AnalystPodcast', COUNT(*)
FROM "AnalystPodcast"
WHERE extra ? 's3SignedUrl' OR extra ? 's3SignedUrlExpiresAt'
UNION ALL
SELECT 'AnalystReport', COUNT(*)
FROM "AnalystReport"
WHERE extra ? 's3SignedCoverObjectUrl'
   OR extra ? 's3SignedCoverObjectUrlExpiresAt'
   OR extra ? 's3SignedPdfObjectUrl'
   OR extra ? 's3SignedPdfObjectUrlExpiresAt';
