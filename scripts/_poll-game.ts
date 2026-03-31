import "./mock-server-only";
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

const TOKEN = process.argv[2] ?? "4vqH3MsYhgjL9q6t";

async function main() {
  const { prisma } = await import("@/prisma/prisma");

  for (let i = 0; i < 60; i++) {
    const session = await prisma.gameSession.findUnique({
      where: { token: TOKEN },
      select: { status: true, timeline: true, extra: true, updatedAt: true },
    });

    const events = Array.isArray(session?.timeline) ? (session!.timeline as Record<string, unknown>[]) : [];
    const extra = (session?.extra ?? {}) as { error?: string };
    console.log(
      `[${new Date().toISOString()}] status=${session?.status} events=${events.length}`,
    );
    if (extra.error) console.log(`  error: ${extra.error}`);

    if (session?.status === "completed") {
      console.log("\n✓ Game completed!");
      const results = events.filter((e) => e.type === "round-result");
      results.forEach((r) => console.log(`  Round ${r.round}: ${JSON.stringify(r.payoffs)}`));
      break;
    }
    if (session?.status === "failed") {
      console.log("\n✗ Game failed:", extra.error);
      break;
    }

    await new Promise((r) => setTimeout(r, 10_000));
  }

  await prisma.$disconnect();
}

main().catch(console.error);
