// pnpm tsx scripts/rescore-personas.ts

import { loadEnvConfig } from "@next/env";
import "./mock-server-only";

async function main() {
  // load env config from .env file
  loadEnvConfig(process.cwd());

  // 确保 .env 加载了以后再 import，这样 provider.ts 里的 process.env 会有值
  const { scorePersona } = await import("@/app/(persona)/lib");
  const { prisma } = await import("@/prisma/prisma");

  console.log("Starting persona rescoring...");

  const fromPersonaId = 106000;

  // 获取总数量
  const totalCount = await prisma.persona.count({
    where: {
      tier: 0,
      id: { gt: fromPersonaId },
      locale: { not: null },
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
        tier: 0,
        id: { gt: fromPersonaId },
        locale: { not: null },
      },
      orderBy: { id: "asc" },
      skip,
      take: batchSize,
    });

    // 并行处理当前批次
    const promises = personas.map(async (persona) => {
      await scorePersona(persona);
      console.log(`Persona ${persona.id} scored`);
    });

    await Promise.all(promises);
    console.log(`Batch ${i + 1} completed`);
  }

  console.log("All personas processed!");
}

if (require.main === module) {
  main();
}
