// pnpm tsx scripts/generate-panel-titles.ts

import { loadEnvConfig } from "@next/env";
import "./mock-server-only";

async function main() {
  // load env config from .env file
  loadEnvConfig(process.cwd());

  // 确保 .env 加载了以后再 import，这样 provider.ts 里的 process.env 会有值
  const { generatePersonaPanelTitle } = await import("@/app/(panel)/lib/persistence");
  const { prisma } = await import("@/prisma/prisma");

  console.log("Starting PersonaPanel title generation...");

  // 只处理 title 为空的 panels
  const totalCount = await prisma.personaPanel.count({
    where: {
      title: "",
    },
  });

  console.log(`Total panels to process: ${totalCount}`);

  const batchSize = 50;
  const totalBatches = Math.ceil(totalCount / batchSize);

  for (let i = 0; i < totalBatches; i++) {
    const skip = i * batchSize;
    console.log(`Processing batch ${i + 1}/${totalBatches} (skip: ${skip})`);

    // 获取当前批次的 panels
    const panels = await prisma.personaPanel.findMany({
      where: {
        title: "",
      },
      orderBy: { id: "asc" },
      // skip, 每次都是过滤 title 为空的，所以，其实就不用 skip 了，对吧?
      take: batchSize,
    });

    // 并行处理当前批次
    const promises = panels.map(async (panel) => {
      try {
        await generatePersonaPanelTitle(panel.id);
        console.log(`Panel ${panel.id} title generated`);
      } catch (error) {
        console.error(
          `Failed to generate title for panel ${panel.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });

    await Promise.race([
      new Promise((resolve) => setTimeout(resolve, 30000)), // 30s timeout per batch
      Promise.allSettled(promises),
    ]);
    console.log(`Batch ${i + 1} completed`);
  }

  console.log("All panels processed!");
}

if (require.main === module) {
  main();
}
