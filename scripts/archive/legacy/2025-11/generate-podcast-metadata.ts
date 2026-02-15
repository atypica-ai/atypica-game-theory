import "../../../mock-server-only";

import { rootLogger } from "@/lib/logging";
import { AnalystPodcastExtra } from "@/prisma/client";
import { loadEnvConfig } from "@next/env";
import { Locale } from "next-intl";

const logger = rootLogger.child({ script: "generate-podcast-metadata" });

async function generateMetadataForPodcast(podcastId: number) {
  // import after env is loaded，因为上面 import 是没顺序的，只能在函数里 import
  const { generatePodcastMetadata } = await import("@/app/(podcast)/lib/generation");
  const { detectInputLanguage } = await import("@/lib/textUtils");
  const { prisma } = await import("@/prisma/prisma");
  const { mergeExtra } = await import("@/prisma/utils");
  const podcast = await prisma.analystPodcast.findUnique({
    where: { id: podcastId },
  });

  if (!podcast?.script) return { success: false, podcastId };

  const locale = (await detectInputLanguage({ text: podcast.script })) as Locale;
  const { title, showNotes } = await generatePodcastMetadata({
    script: podcast.script,
    locale,
    abortSignal: new AbortController().signal,
    statReport: async () => {},
    logger: logger.child({ podcastId }),
  });

  await mergeExtra({
    tableName: "AnalystPodcast",
    id: podcastId,
    extra: {
      metadata: {
        ...(podcast.extra?.metadata || {}),
        title,
        showNotes,
      },
    } satisfies Partial<AnalystPodcastExtra>,
  });

  logger.info({ msg: "Generated", podcastId, title, showNotesLength: showNotes.length });
  return { success: true, podcastId, title, showNotes };
}

async function main() {
  loadEnvConfig(process.cwd());
  // import after env is loaded
  const { prisma } = await import("@/prisma/prisma");

  // Find podcasts with scripts (regenerate all metadata)
  const podcasts = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id
    FROM "AnalystPodcast"
    WHERE "generatedAt" IS NOT NULL
      AND "script" IS NOT NULL
    ORDER BY "createdAt" DESC
  `;

  logger.info({ msg: "Found podcasts to regenerate metadata", count: podcasts.length });

  if (podcasts.length === 0) return;

  // Process in batches of 5 (reduced from 10 since we're now making larger requests)
  const results = [];
  for (let i = 0; i < podcasts.length; i += 5) {
    const batch = podcasts.slice(i, i + 5);
    logger.info({
      msg: "Processing batch",
      batchStart: i + 1,
      batchEnd: Math.min(i + 5, podcasts.length),
      total: podcasts.length,
    });
    const batchResults = await Promise.all(batch.map((p) => generateMetadataForPodcast(p.id)));
    results.push(...batchResults);
  }

  const successful = results.filter((r) => r.success).length;
  logger.info({ msg: "Done", total: results.length, successful });
}

main()
  .catch((error) => {
    logger.error({ msg: "Failed", error: error.message });
    process.exit(1);
  })
  .finally(process.exit);
