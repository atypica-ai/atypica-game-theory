// @ts-nocheck

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

  const batchSize = 100;
  let batchNumber = 0;
  let totalProcessed = 0;
  let successCount = 0;
  let errorCount = 0;

  while (true) {
    batchNumber++;
    console.log(`\nProcessing batch ${batchNumber}...`);

    // Fetch current batch of personas without tokens
    const personas = await prisma.persona.findMany({
      /**
       * 现在数据库已经 migrate 到 persona token 为 not null，这个脚本已经不能用了
       */
      where: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token: null as any,
      },
      select: {
        id: true,
      },
      orderBy: { id: "asc" },
      take: batchSize,
    });

    // No more personas without tokens, we're done
    if (personas.length === 0) {
      console.log("No more personas without tokens. All done!");
      break;
    }

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
          console.error(
            `✗ Failed to generate unique token for persona ${persona.id} after 100 attempts`,
          );
          errorCount++;
          break;
        }
      } while (tokens.has(token));

      if (attempts <= 100) {
        tokens.add(token);
        updates.push({ id: persona.id, token });
      }
    }

    // Batch update
    try {
      await Promise.all(
        updates.map((update) =>
          prisma.persona.update({
            where: { id: update.id },
            data: { token: update.token },
          }),
        ),
      );

      successCount += updates.length;
      totalProcessed += personas.length;

      for (const update of updates) {
        console.log(`✓ Persona ${update.id} assigned token: ${update.token}`);
      }

      console.log(`Batch ${batchNumber} completed. Total processed: ${totalProcessed}`);
    } catch (error) {
      console.error(`✗ Error in batch ${batchNumber}: ${(error as Error).message}`);
      errorCount += updates.length;
      throw error;
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Total processed: ${totalProcessed}`);
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
