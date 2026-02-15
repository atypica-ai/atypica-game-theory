// @ts-nocheck

// Migrate API keys from TeamConfig to ApiKey table
// Usage:
//   pnpm tsx scripts/migrate-apikey-to-table.ts --dry-run   (preview)
//   pnpm tsx scripts/migrate-apikey-to-table.ts             (execute)

import { ApiKeyExtra } from "@/prisma/client";
import { loadEnvConfig } from "@next/env";
import "./mock-server-only";

type TeamConfigApiKey = {
  key: string;
  createdAt: string;
  createdBy: number;
};

async function main() {
  console.log("🚀 Starting API Key migration from TeamConfig to ApiKey table\n");

  // Check for dry-run flag
  const isDryRun = process.argv.includes("--dry-run");
  if (isDryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made\n");
  }

  // Load env config from .env file
  loadEnvConfig(process.cwd());

  // Import after env is loaded
  const { prisma } = await import("@/prisma/prisma");

  // Find all TeamConfig records with key='apiKey'
  const teamConfigs = await prisma.teamConfig.findMany({
    where: {
      key: "apiKey",
    },
    include: {
      team: true,
    },
  });

  console.log(`📊 Found ${teamConfigs.length} teams with API keys\n`);

  if (teamConfigs.length === 0) {
    console.log("✅ No API keys to migrate");
    return;
  }

  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const config of teamConfigs) {
    try {
      const apiKeyData = config.value as TeamConfigApiKey;

      if (!apiKeyData.key || !apiKeyData.key.startsWith("atypica_")) {
        console.log(`⚠️  Team ${config.teamId}: Invalid API key format, skipping`);
        skippedCount++;
        continue;
      }

      // Get creator user email
      const creatorTeamMember = await prisma.user.findUnique({
        where: { id: apiKeyData.createdBy },
        select: { personalUser: true },
      });

      if (!creatorTeamMember?.personalUser) {
        console.log(
          `⚠️  Team ${config.teamId}: Creator user ${apiKeyData.createdBy} not found or does not have a personal user`,
        );
        skippedCount++;
        continue;
      }

      const email = creatorTeamMember.personalUser.email;

      if (!email) {
        console.log(
          `⚠️  Team ${config.teamId}: Creator user ${apiKeyData.createdBy} does not have an email`,
        );
        skippedCount++;
        continue;
      }

      if (isDryRun) {
        console.log(`[DRY RUN] Team ${config.teamId} (${config.team.name}): Would migrate API key`);
        console.log(`  Key: ${apiKeyData.key.substring(0, 20)}...`);
        console.log(`  Created: ${apiKeyData.createdAt}`);
        console.log(`  Created by: ${email}`);
        migratedCount++;
        continue;
      }

      // Use transaction to ensure atomicity
      await prisma.$transaction(async (tx) => {
        // Check if API key already exists (using findFirst since teamId is not unique)
        const existingApiKey = await tx.apiKey.findFirst({
          where: {
            key: apiKeyData.key,
            teamId: config.teamId,
          },
        });

        if (existingApiKey) {
          console.log(`⏭️  Team ${config.teamId}: API key already exists in new table, skipping`);
          return;
        }

        // Create API key record
        const extra: ApiKeyExtra = {
          createdByEmail: email,
        };

        await tx.apiKey.create({
          data: {
            key: apiKeyData.key,
            teamId: config.teamId,
            extra,
            createdAt: new Date(apiKeyData.createdAt),
          },
        });

        // Delete TeamConfig record
        await tx.teamConfig.delete({
          where: { id: config.id },
        });

        console.log(
          `✅ Team ${config.teamId} (${config.team.name}): Migrated API key (created by ${email})`,
        );
      });

      migratedCount++;
    } catch (error) {
      console.error(`❌ Team ${config.teamId}: Migration failed - ${(error as Error).message}`);
      errorCount++;
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📈 Migration Summary:");
  console.log("=".repeat(60));
  console.log(`Total teams: ${teamConfigs.length}`);
  console.log(`✅ Migrated: ${migratedCount}`);
  console.log(`⏭️  Skipped: ${skippedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log("=".repeat(60));

  if (isDryRun) {
    console.log("\n💡 This was a dry run. Run without --dry-run to execute the migration.");
  } else if (errorCount > 0) {
    console.log("\n⚠️  Some migrations failed. Please check the errors above.");
    process.exit(1);
  } else {
    console.log("\n✅ Migration completed successfully!");
  }
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error("❌ Fatal error:", error);
      process.exit(1);
    })
    .finally(() => {
      process.exit(0);
    });
}
