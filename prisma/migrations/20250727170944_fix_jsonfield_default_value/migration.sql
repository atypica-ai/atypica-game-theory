-- AlterTable
ALTER TABLE "AdminUser" ALTER COLUMN "permissions" SET DEFAULT '[]';

-- AlterTable
ALTER TABLE "Analyst" ALTER COLUMN "attachments" SET DEFAULT '[]';

-- AlterTable
ALTER TABLE "ChatMessage" ALTER COLUMN "parts" SET DEFAULT '[]',
ALTER COLUMN "attachments" SET DEFAULT '[]';

-- AlterTable
ALTER TABLE "Persona" ALTER COLUMN "tags" SET DEFAULT '[]',
ALTER COLUMN "samples" SET DEFAULT '[]';

-- AlterTable
ALTER TABLE "PersonaImport" ALTER COLUMN "attachments" SET DEFAULT '[]';

-- AlterTable
ALTER TABLE "SystemConfig" ALTER COLUMN "value" SET DEFAULT '{}';
