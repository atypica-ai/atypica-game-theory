// pnpm tsx scripts/utils/extract-persona-attributes.ts [--userId 123]

import { loadEnvConfig } from "@next/env";
import "../mock-server-only";

async function main() {
  // load env config from .env file
  loadEnvConfig(process.cwd());

  // 确保 .env 加载了以后再 import，这样 provider.ts 里的 process.env 会有值
  const { extractPersonaAttributes } = await import("@/app/(persona)/lib");
  const { prisma } = await import("@/prisma/prisma");
  const { Prisma } = await import("@/prisma/client");

  // Parse arguments
  const args = process.argv.slice(2);
  const userIdIndex = args.indexOf("--userId");
  const userId =
    userIdIndex >= 0 && args[userIdIndex + 1] ? parseInt(args[userIdIndex + 1], 10) : undefined;

  console.log("Starting persona attribute extraction...");
  if (userId) {
    console.log(`Filtering by userId: ${userId}`);
  }

  // Build where clause
  let personaIds: number[] | undefined;
  if (userId) {
    // Get all panels for this user
    const panels = await prisma.personaPanel.findMany({
      where: { userId },
      select: { personaIds: true },
    });
    const allIds = panels.flatMap((p) => p.personaIds);
    personaIds = [...new Set(allIds)];
    console.log(`Found ${personaIds.length} personas from user's panels`);
  }

  // 只处理 tier > 0 且缺少 role 或 quote 字段的 personas
  const totalCount = await prisma.persona.count({
    where: {
      ...(personaIds ? { id: { in: personaIds } } : {}),
      tier: { gt: 0 },
      locale: { not: null },
      OR: [
        { extra: { equals: {} } },
        { extra: { path: ["role"], equals: Prisma.AnyNull } },
        { extra: { path: ["quote"], equals: Prisma.AnyNull } },
      ],
    },
  });

  console.log(`Total personas to process: ${totalCount}`);

  const batchSize = 50;
  const totalBatches = Math.ceil(totalCount / batchSize);

  for (let i = 0; i < totalBatches; i++) {
    const skip = i * batchSize;
    console.log(`Processing batch ${i + 1}/${totalBatches} (skip: ${skip})`);

    // 获取当前批次的 personas
    const personas = await prisma.persona.findMany({
      where: {
        ...(personaIds ? { id: { in: personaIds } } : {}),
        tier: { gt: 0 },
        locale: { not: null },
        OR: [
          { extra: { equals: {} } },
          { extra: { path: ["role"], equals: Prisma.AnyNull } },
          { extra: { path: ["quote"], equals: Prisma.AnyNull } },
        ],
      },
      orderBy: { id: "asc" },
      // skip, 每次都是过滤 extra 为空的，所以，其实就不用 skip 了，对吧?
      take: batchSize,
    });

    // 并行处理当前批次
    const promises = personas.map(async (persona) => {
      const extra = persona.extra;
      await extractPersonaAttributes(persona);
      console.log(`Persona ${persona.id} processed`);
    });

    await Promise.race([
      new Promise((resolve) => setTimeout(resolve, 10000)),
      Promise.allSettled(promises),
    ]);
    console.log(`Batch ${i + 1} completed`);
  }

  console.log("All personas processed!");
}

if (require.main === module) {
  main();
}
