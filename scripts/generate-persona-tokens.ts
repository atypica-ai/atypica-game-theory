// Generate unique tokens for all personas without tokens
// Usage: pnpm tsx scripts/generate-persona-tokens.ts

import { loadEnvConfig } from "@next/env";
import "./mock-server-only";

async function main() {
  // Load env config from .env file
  loadEnvConfig(process.cwd());

  // Import after env is loaded
  const { prisma } = await import("@/prisma/prisma");
  const { generateToken } = await import("@/lib/utils");

  console.log("Starting persona token generation...");

  // Count personas without tokens
  const totalCount = await prisma.persona.count({
    where: {
      token: null,
    },
  });

  console.log(`Total personas without tokens: ${totalCount}`);

  if (totalCount === 0) {
    console.log("All personas already have tokens. Nothing to do.");
    return;
  }

  const batchSize = 100;
  const totalBatches = Math.ceil(totalCount / batchSize);
  let processedCount = 0;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < totalBatches; i++) {
    const skip = i * batchSize;
    console.log(`\nProcessing batch ${i + 1}/${totalBatches} (skip: ${skip})`);

    // Fetch current batch of personas without tokens
    const personas = await prisma.persona.findMany({
      where: {
        token: null,
      },
      select: {
        id: true,
      },
      orderBy: { id: "asc" },
      skip,
      take: batchSize,
    });

    console.log(`Found ${personas.length} personas in this batch`);

    // Generate unique tokens for all personas in this batch
    const tokens = new Set<string>();
    const updates: Array<{ id: number; token: string }> = [];

    for (const persona of personas) {
      let token: string;
      let attempts = 0;

      // Generate a unique token (unique within this batch)
      do {
        token = generateToken(16);
        attempts++;

        if (attempts > 100) {
          console.error(`✗ Failed to generate unique token for persona ${persona.id} after 100 attempts`);
          errorCount++;
          break;
        }
      } while (tokens.has(token));

      if (attempts <= 100) {
        tokens.add(token);
        updates.push({ id: persona.id, token });
      }
    }

    // Batch update using transaction
    try {
      await prisma.$transaction(
        updates.map((update) =>
          prisma.persona.update({
            where: { id: update.id },
            data: { token: update.token },
          }),
        ),
      );

      successCount += updates.length;
      processedCount += personas.length;

      for (const update of updates) {
        console.log(`✓ Persona ${update.id} assigned token: ${update.token}`);
      }

      console.log(`Batch ${i + 1} completed. Progress: ${processedCount}/${totalCount}`);
    } catch (error) {
      console.error(`✗ Error in batch ${i + 1}: ${(error as Error).message}`);
      console.error(`  Attempting individual updates for this batch...`);

      // Fallback: update one by one if batch fails
      for (const update of updates) {
        try {
          await prisma.persona.update({
            where: { id: update.id },
            data: { token: update.token },
          });
          successCount++;
          console.log(`✓ Persona ${update.id} assigned token: ${update.token}`);
        } catch (err) {
          console.error(`✗ Failed to update persona ${update.id}: ${(err as Error).message}`);
          errorCount++;
        }
        processedCount++;
      }
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Total processed: ${processedCount}`);
  console.log(`Successfully assigned tokens: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log("Done!");
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    })
    .finally(() => {
      process.exit(0);
    });
}
