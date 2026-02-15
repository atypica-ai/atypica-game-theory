// @ts-nocheck

// Migrate FeaturedStudy to FeaturedItem
// For each FeaturedStudy, feature the last generated report and podcast
// Usage:
//   pnpm tsx scripts/archive/legacy/2025-12/migrate-featured-study-to-item.ts --dry-run   (preview)
//   pnpm tsx scripts/archive/legacy/2025-12/migrate-featured-study-to-item.ts             (execute)

import { truncateForTitle } from "@/lib/textUtils";
import { FeaturedItemExtra, FeaturedItemResourceType } from "@/prisma/client";
import { loadEnvConfig } from "@next/env";
import "../../../mock-server-only";

async function main() {
  console.log("🚀 Starting FeaturedStudy to FeaturedItem migration\n");

  // Check for dry-run flag
  const isDryRun = process.argv.includes("--dry-run");
  if (isDryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made\n");
  }

  // Load env config from .env file
  loadEnvConfig(process.cwd());

  // Import after env is loaded
  const { prisma } = await import("@/prisma/prisma");

  // Get all FeaturedStudy records
  // @eslint-disable-next-line @typescript-eslint/no-explicit-any
  const featuredStudies = await (prisma as any).featuredStudy.findMany({
    include: {
      analyst: {
        select: {
          id: true,
          locale: true,
          role: true,
          topic: true,
          studySummary: true,
          kind: true,
          studyUserChat: {
            select: {
              title: true,
            },
          },
        },
      },
    },
    orderBy: {
      displayOrder: "asc",
    },
  });

  console.log(`📊 Found ${featuredStudies.length} featured studies\n`);

  if (featuredStudies.length === 0) {
    console.log("✅ No featured studies to migrate");
    return;
  }

  let reportsMigrated = 0;
  let podcastsMigrated = 0;
  let skippedReports = 0;
  let skippedPodcasts = 0;
  let errorCount = 0;

  for (const featuredStudy of featuredStudies) {
    const analystId = featuredStudy.analystId;
    const analyst = featuredStudy.analyst;

    console.log(
      `\n📝 Processing featured study #${featuredStudy.displayOrder}: ${analyst.studyUserChat?.title || "Untitled"} (Analyst ID: ${analystId})`,
    );

    // 1. Find the last generated report
    try {
      const lastReport = await prisma.analystReport.findFirst({
        where: {
          analystId,
          generatedAt: {
            not: null,
          },
        },
        orderBy: {
          generatedAt: "desc",
        },
      });

      if (lastReport) {
        // Check if already featured
        const existingFeaturedReport = await prisma.featuredItem.findFirst({
          where: {
            resourceType: FeaturedItemResourceType.AnalystReport,
            resourceId: lastReport.id,
          },
        });

        if (existingFeaturedReport) {
          console.log(`   ⏭️  Report ${lastReport.id} already featured, skipping`);
          skippedReports++;
        } else {
          const extra = lastReport.extra;
          const title = analyst.studyUserChat?.title || "";
          const description = truncateForTitle(analyst.topic, {
            maxDisplayWidth: 200,
            suffix: "...",
          });

          const featuredItemData = {
            resourceType: FeaturedItemResourceType.AnalystReport,
            resourceId: lastReport.id,
            locale: analyst.locale || "en-US",
            extra: {
              title,
              description,
              coverObjectUrl: extra?.coverObjectUrl || "",
              url: `/artifacts/report/${lastReport.token}/share`,
              category: analyst.kind || undefined,
            } satisfies FeaturedItemExtra,
            createdAt: lastReport.generatedAt!, // where 已经确保 not null 了
          };

          if (!isDryRun) {
            await prisma.featuredItem.create({
              data: featuredItemData,
            });
          }

          console.log(`   ✅ Featured report ${lastReport.id} (${lastReport.token})`);
          console.log(`      Title: ${title}`);
          console.log(`      URL: ${featuredItemData.extra.url}`);
          reportsMigrated++;
        }
      } else {
        console.log(`   ⚠️  No generated reports found for analyst ${analystId}`);
        skippedReports++;
      }
    } catch (error) {
      console.error(`   ❌ Error processing reports for analyst ${analystId}:`, error);
      errorCount++;
    }

    // 2. Find the last generated podcast
    try {
      const lastPodcast = await prisma.analystPodcast.findFirst({
        where: {
          analystId,
          generatedAt: {
            not: null,
          },
        },
        orderBy: {
          generatedAt: "desc",
        },
      });

      if (lastPodcast) {
        // Check if already featured
        const existingFeaturedPodcast = await prisma.featuredItem.findFirst({
          where: {
            resourceType: FeaturedItemResourceType.AnalystPodcast,
            resourceId: lastPodcast.id,
          },
        });

        if (existingFeaturedPodcast) {
          console.log(`   ⏭️  Podcast ${lastPodcast.id} already featured, skipping`);
          skippedPodcasts++;
        } else {
          const extra = lastPodcast.extra;
          const metadata = extra?.metadata;

          const featuredItemData = {
            resourceType: FeaturedItemResourceType.AnalystPodcast,
            resourceId: lastPodcast.id,
            locale: analyst.locale || "en-US",
            extra: {
              title: metadata?.title || "",
              description: metadata?.showNotes || "",
              coverObjectUrl: metadata?.coverObjectUrl || "",
              url: `/artifacts/podcast/${lastPodcast.token}/share`,
              category: analyst.kind || undefined,
            } satisfies FeaturedItemExtra,
            createdAt: lastPodcast.generatedAt!, // where 已经确保 not null 了
          };

          if (!isDryRun) {
            await prisma.featuredItem.create({
              data: featuredItemData,
            });
          }

          console.log(`   ✅ Featured podcast ${lastPodcast.id} (${lastPodcast.token})`);
          console.log(`      Title: ${metadata?.title || "Untitled"}`);
          console.log(`      URL: ${featuredItemData.extra.url}`);
          podcastsMigrated++;
        }
      } else {
        console.log(`   ⚠️  No generated podcasts found for analyst ${analystId}`);
        skippedPodcasts++;
      }
    } catch (error) {
      console.error(`   ❌ Error processing podcasts for analyst ${analystId}:`, error);
      errorCount++;
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 Migration Summary:");
  console.log("=".repeat(60));
  console.log(`Total featured studies processed: ${featuredStudies.length}`);
  console.log(`\n📄 Reports:`);
  console.log(`   ✅ Migrated: ${reportsMigrated}`);
  console.log(
    `   ⏭️  Skipped (already featured): ${skippedReports - (featuredStudies.length - reportsMigrated - skippedReports)}`,
  );
  console.log(
    `   ⚠️  Skipped (no data): ${featuredStudies.length - reportsMigrated - skippedReports}`,
  );
  console.log(`\n🎙️  Podcasts:`);
  console.log(`   ✅ Migrated: ${podcastsMigrated}`);
  console.log(
    `   ⏭️  Skipped (already featured): ${skippedPodcasts - (featuredStudies.length - podcastsMigrated - skippedPodcasts)}`,
  );
  console.log(
    `   ⚠️  Skipped (no data): ${featuredStudies.length - podcastsMigrated - skippedPodcasts}`,
  );
  console.log(`\n❌ Errors: ${errorCount}`);
  console.log("=".repeat(60));

  if (isDryRun) {
    console.log("\n💡 This was a dry run. Run without --dry-run to apply changes.");
  } else {
    console.log("\n✅ Migration completed!");
  }
}

main()
  .catch((error) => {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("@/prisma/prisma");
    await prisma.$disconnect();
  });
