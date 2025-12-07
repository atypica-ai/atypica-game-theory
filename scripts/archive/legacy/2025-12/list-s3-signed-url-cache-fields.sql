-- List all records that have s3SignedUrl cache fields in their extra JSONB column
-- These fields were used for caching S3 signed URLs but are now deprecated

-- ImageGeneration table (s3SignedUrl, s3SignedUrlExpiresAt)
SELECT 'ImageGeneration' as table_name, COUNT(*) as count
FROM "ImageGeneration"
WHERE extra ? 's3SignedUrl' OR extra ? 's3SignedUrlExpiresAt';

SELECT 'ImageGeneration' as table_name, id, extra->'s3SignedUrl' as s3_signed_url, extra->'s3SignedUrlExpiresAt' as expires_at
FROM "ImageGeneration"
WHERE extra ? 's3SignedUrl' OR extra ? 's3SignedUrlExpiresAt'
LIMIT 100;

-- AttachmentFile table (s3SignedUrl, s3SignedUrlExpiresAt)
SELECT 'AttachmentFile' as table_name, COUNT(*) as count
FROM "AttachmentFile"
WHERE extra ? 's3SignedUrl' OR extra ? 's3SignedUrlExpiresAt';

SELECT 'AttachmentFile' as table_name, id, extra->'s3SignedUrl' as s3_signed_url, extra->'s3SignedUrlExpiresAt' as expires_at
FROM "AttachmentFile"
WHERE extra ? 's3SignedUrl' OR extra ? 's3SignedUrlExpiresAt'
LIMIT 100;

-- AnalystPodcast table (s3SignedUrl, s3SignedUrlExpiresAt)
SELECT 'AnalystPodcast' as table_name, COUNT(*) as count
FROM "AnalystPodcast"
WHERE extra ? 's3SignedUrl' OR extra ? 's3SignedUrlExpiresAt';

SELECT 'AnalystPodcast' as table_name, id, extra->'s3SignedUrl' as s3_signed_url, extra->'s3SignedUrlExpiresAt' as expires_at
FROM "AnalystPodcast"
WHERE extra ? 's3SignedUrl' OR extra ? 's3SignedUrlExpiresAt'
LIMIT 100;

-- AnalystReport table (s3SignedCoverObjectUrl, s3SignedCoverObjectUrlExpiresAt, s3SignedPdfObjectUrl, s3SignedPdfObjectUrlExpiresAt)
SELECT 'AnalystReport' as table_name, COUNT(*) as count
FROM "AnalystReport"
WHERE extra ? 's3SignedCoverObjectUrl'
   OR extra ? 's3SignedCoverObjectUrlExpiresAt'
   OR extra ? 's3SignedPdfObjectUrl'
   OR extra ? 's3SignedPdfObjectUrlExpiresAt';

SELECT 'AnalystReport' as table_name,
       id,
       extra->'s3SignedCoverObjectUrl' as s3_signed_cover_url,
       extra->'s3SignedCoverObjectUrlExpiresAt' as cover_expires_at,
       extra->'s3SignedPdfObjectUrl' as s3_signed_pdf_url,
       extra->'s3SignedPdfObjectUrlExpiresAt' as pdf_expires_at
FROM "AnalystReport"
WHERE extra ? 's3SignedCoverObjectUrl'
   OR extra ? 's3SignedCoverObjectUrlExpiresAt'
   OR extra ? 's3SignedPdfObjectUrl'
   OR extra ? 's3SignedPdfObjectUrlExpiresAt'
LIMIT 100;
