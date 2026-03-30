/**
 * Batch game session runner.
 *
 * Usage:
 *   pnpm tsx scripts/run-games.ts \
 *     --gameType stag-hunt \
 *     --personaIds 1,2,3 \
 *     --count 5 \
 *     [--parallel 2] \
 *     [--cleanup-stale]
 *
 * Runs <count> game sessions using the given game type and persona IDs.
 * Sessions run in batches of <parallel> (default 1 = sequential).
 * Prints a summary of completed vs failed tokens when done.
 */

import { prisma } from "@/prisma/prisma";
import { cleanupStaleSessions, launchGameSession } from "@/app/(game-theory)/lib";

// ── Arg parsing ───────────────────────────────────────────────────────────────

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

const gameType = getArg("--gameType");
const personaIdsRaw = getArg("--personaIds");
const countRaw = getArg("--count") ?? "1";
const parallelRaw = getArg("--parallel") ?? "1";
const doCleanup = hasFlag("--cleanup-stale");

if (!gameType || !personaIdsRaw) {
  console.error("Usage: run-games.ts --gameType <name> --personaIds <id1,id2,...> [--count N] [--parallel N] [--cleanup-stale]");
  process.exit(1);
}

const personaIds = personaIdsRaw.split(",").map((s) => parseInt(s.trim(), 10));
const count = parseInt(countRaw, 10);
const parallel = parseInt(parallelRaw, 10);

if (personaIds.some(isNaN) || isNaN(count) || count < 1 || isNaN(parallel) || parallel < 1) {
  console.error("Invalid arguments: personaIds must be comma-separated integers, count and parallel must be positive integers");
  process.exit(1);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function runOne(): Promise<{ token: string; success: boolean; error?: string }> {
  let token = "?";
  let run: Promise<void>;

  try {
    ({ token, run } = await launchGameSession(gameType!, personaIds, { useAfter: false }));
    console.log(`  → started ${token}`);
  } catch (err) {
    const message = (err as Error).message;
    console.error(`  ✗ launch failed: ${message}`);
    return { token, success: false, error: message };
  }

  // Wait for the run to settle. The outer .catch() in launchGameSession swallows
  // errors to avoid unhandled rejections, so we check DB status afterwards.
  await run;

  const session = await prisma.gameSession.findUnique({
    where: { token },
    select: { status: true, extra: true },
  });
  const status = session?.status ?? "unknown";
  const extra = (session?.extra ?? {}) as { error?: string };

  if (status === "completed") {
    console.log(`  ✓ completed ${token}`);
    return { token, success: true };
  } else {
    const errMsg = extra.error ?? `ended with status: ${status}`;
    console.error(`  ✗ ${token}: ${errMsg}`);
    return { token, success: false, error: errMsg };
  }
}

async function main() {
  console.log(`\nGame batch runner`);
  console.log(`  gameType:  ${gameType}`);
  console.log(`  personaIds: [${personaIds.join(", ")}]`);
  console.log(`  count:     ${count}`);
  console.log(`  parallel:  ${parallel}`);

  if (doCleanup) {
    console.log("\nCleaning up stale sessions...");
    const { cleaned, tokens } = await cleanupStaleSessions();
    if (cleaned > 0) {
      console.log(`  Marked ${cleaned} stale session(s) as failed: ${tokens.join(", ")}`);
    } else {
      console.log("  No stale sessions found.");
    }
  }

  const results: { token: string; success: boolean; error?: string }[] = [];

  // Run in batches of <parallel>
  for (let i = 0; i < count; i += parallel) {
    const batchSize = Math.min(parallel, count - i);
    console.log(`\nBatch ${Math.floor(i / parallel) + 1}: launching ${batchSize} session(s)...`);
    const batch = Array.from({ length: batchSize }, () => runOne());
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
  }

  const completed = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`\n── Summary ──────────────────────────────`);
  console.log(`  Total:     ${results.length}`);
  console.log(`  Completed: ${completed.length}`);
  console.log(`  Failed:    ${failed.length}`);
  if (completed.length > 0) {
    console.log(`  Completed tokens: ${completed.map((r) => r.token).join(", ")}`);
  }
  if (failed.length > 0) {
    console.log(`  Failures:`);
    failed.forEach((r) => console.log(`    ${r.token}: ${r.error}`));
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
