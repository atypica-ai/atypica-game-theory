// pnpm tsx scripts/utils/extract-persona-attributes.ts

import { loadEnvConfig } from "@next/env";
import "../mock-server-only";

async function main() {
  // load env config from .env file
  loadEnvConfig(process.cwd());

  // 确保 .env 加载了以后再 import，这样 provider.ts 里的 process.env 会有值
  const { extractPersonaAttributes } = await import("@/app/(persona)/lib");
  const { prisma } = await import("@/prisma/prisma");
  const { Prisma } = await import("@/prisma/client");

  console.log("Starting persona attribute extraction...");

  // 只处理 tier > 0 且 extra 为空或没有 role 字段的 personas
  const totalCount = await prisma.persona.count({
    where: {
      tier: { gt: 0 },
      locale: { not: null },
      OR: [{ extra: { equals: {} } }, { extra: { path: ["role"], equals: Prisma.JsonNull } }],
    },
  });

  console.log(`Total personas to process: ${totalCount}`);

  const batchSize = 30;
  const totalBatches = Math.ceil(totalCount / batchSize);

  for (let i = 0; i < totalBatches; i++) {
    const skip = i * batchSize;
    console.log(`Processing batch ${i + 1}/${totalBatches} (skip: ${skip})`);

    // 获取当前批次的 personas
    const personas = await prisma.persona.findMany({
      where: {
        tier: { gt: 0 },
        locale: { not: null },
        OR: [{ extra: { equals: {} } }, { extra: { path: ["role"], equals: Prisma.JsonNull } }],
      },
      orderBy: { id: "asc" },
      skip,
      take: batchSize,
    });

    // 并行处理当前批次
    const promises = personas.map(async (persona) => {
      await extractPersonaAttributes(persona);
      console.log(`Persona ${persona.id} processed`);
    });

    await Promise.all(promises);
    console.log(`Batch ${i + 1} completed`);
  }

  console.log("All personas processed!");
}

if (require.main === module) {
  main();
}
