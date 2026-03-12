-- Migrate persona ownership: backfill userId from PersonaImport
-- Persona now has its own userId field, no longer needs to go through PersonaImport.
-- Run on production BEFORE deploying the code change.

UPDATE "Persona" p
SET "userId" = pi."userId"
FROM "PersonaImport" pi
WHERE p."personaImportId" = pi.id
  AND p."userId" IS NULL;
