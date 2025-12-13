import "../../../mock-server-only";

import type { Analyst, AnalystReport, AnalystReportExtra } from "@/prisma/client";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function regenerateFeaturedCovers() {
  loadEnvConfig(process.cwd());
  // ensure env vars are loaded
  const { rootLogger } = await import("@/lib/logging");
  const { generateReportCoverImage } = await import("@/ai/tools/experts/generateReport/coverImage");
  const { prisma } = await import("@/prisma/prisma");

  console.log("Starting regeneration of cover images for featured studies...\n");

  // Fetch all featured studies with their reports
  // @eslint-disable-next-line @typescript-eslint/no-explicit-any
  const featuredStudies = await (prisma as any).featuredStudy.findMany({
    include: {
      analyst: {
        include: {
          reports: {
            orderBy: { createdAt: "desc" },
            take: 1, // Get the latest report
          },
        },
      },
    },
    // orderBy: { displayOrder: "asc" },
    orderBy: {
      analyst: {
        id: "desc",
      },
    },
  });

  console.log(`Found ${featuredStudies.length} featured studies\n`);

  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ analystId: number; error: string }>,
  };

  for (const featured of featuredStudies) {
    const analyst = featured.analyst as Pick<
      Analyst,
      "id" | "locale" | "topic" | "studySummary" | "studyLog" | "brief"
    > & {
      reports: (Pick<AnalystReport, "id" | "token"> & { extra: AnalystReportExtra })[];
    };
    if (analyst.reports.length === 0) {
      console.log(`⚠️  Analyst ${analyst.id} has no reports, skipping...`);
      continue;
    }

    const report = analyst.reports[0];
    if (report.extra.coverObjectUrl && report.extra.coverObjectUrl.includes("imagegen/")) {
      // 旧的 coverObjectUrl 是 screenshot/，新的是 imagegen/
      console.log(`⚠️  Report ${report.id} has a new coverObjectUrl, skipping...`);
      continue;
    }

    console.log(`Processing analyst ${analyst.id} (Report: ${report.token})...`);

    try {
      // Determine locale
      const locale =
        analyst.locale === "zh-CN" ? "zh-CN" : analyst.locale === "en-US" ? "en-US" : "en-US";

      // Empty stat reporter for script (free generation)
      const statReport = async () => {};
      const abortSignal = AbortSignal.timeout(300_000); // 5 minutes timeout

      const logger = rootLogger.child({
        analystId: analyst.id,
        reportId: report.id,
        reportToken: report.token,
      });

      await generateReportCoverImage({
        ratio: "landscape",
        analyst,
        report,
        locale,
        abortSignal,
        statReport,
        logger,
      });

      console.log(`✅ Successfully generated cover for analyst ${analyst.id}\n`);
      results.success++;
    } catch (error) {
      const errorMsg = (error as Error).message;
      console.error(`❌ Failed to generate cover for analyst ${analyst.id}: ${errorMsg}\n`);
      results.failed++;
      results.errors.push({ analystId: analyst.id, error: errorMsg });
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Summary:");
  console.log(`  Total: ${featuredStudies.length}`);
  console.log(`  Success: ${results.success}`);
  console.log(`  Failed: ${results.failed}`);

  if (results.errors.length > 0) {
    console.log("\nErrors:");
    for (const { analystId, error } of results.errors) {
      console.log(`  Analyst ${analystId}: ${error}`);
    }
  }

  console.log("=".repeat(60));
}

regenerateFeaturedCovers()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nFatal error:", error);
    process.exit(1);
  });
