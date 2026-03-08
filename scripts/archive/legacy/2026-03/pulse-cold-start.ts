// @ts-nocheck

// Pulse cold start script
// Initializes category config, runs full pipeline, and creates 5-day historical data
//
// Usage:
//   npx tsx scripts/pulse-cold-start.ts

import { loadEnvConfig } from "@next/env";
import "./mock-server-only";

const DEFAULT_CATEGORIES = [
  {
    name: "AI Tech",
    query: "AI agents OR LLM OR Claude OR GPT OR frontier models",
    locale: "en-US",
  },
  {
    name: "AI 科技",
    query: "AI智能体 OR 大模型 OR Claude OR GPT OR 前沿模型",
    locale: "zh-CN",
  },
  {
    name: "Consumer Trends",
    query: "consumer trends OR viral products OR DTC brands OR Gen Z spending",
    locale: "en-US",
  },
  {
    name: "消费趋势",
    query: "消费趋势 OR 爆款产品 OR 新消费品牌 OR Z世代消费",
    locale: "zh-CN",
  },
];

const HISTORY_DAYS = 4; // + today = 5 total
const HEAT_FLUCTUATION = 0.15; // ±15%

async function main() {
  loadEnvConfig(process.cwd());

  const { prisma } = await import("@/prisma/prisma");
  const { runDailyPulsePipeline } = await import("@/app/(pulse)/lib/runDailyPipeline");

  // ── Step 1: Initialize SystemConfig ──────────────────────────
  console.log("\n═══ Step 1: Initialize xTrend category config ═══\n");

  const existing = await prisma.systemConfig.findUnique({
    where: { key: "pulse:xTrend:categories" },
  });

  if (existing) {
    console.log("Category config already exists, skipping:");
    console.log(JSON.stringify(existing.value, null, 2));
  } else {
    await prisma.systemConfig.create({
      data: {
        key: "pulse:xTrend:categories",
        value: DEFAULT_CATEGORIES,
      },
    });
    console.log("Created category config:");
    console.log(JSON.stringify(DEFAULT_CATEGORIES, null, 2));
  }

  // ── Step 2: Run full pipeline ────────────────────────────────
  console.log("\n═══ Step 2: Run full pipeline (gather → HEAT → expiration) ═══\n");
  console.log("This may take a few minutes...\n");

  const result = await runDailyPulsePipeline();
  console.log("Pipeline result:", result);

  if (result.totalPulses === 0) {
    console.log("\nNo pulses gathered. Check your XAI_API_KEY and category config.");
    process.exit(1);
  }

  // ── Step 3: Create historical data ───────────────────────────
  console.log("\n═══ Step 3: Create historical data (5 days) ═══\n");

  const todayPulses = await prisma.pulse.findMany({
    where: {
      heatScore: { not: null },
      createdAt: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    },
  });

  console.log(`Found ${todayPulses.length} pulses with heat scores`);

  let created = 0;
  for (const pulse of todayPulses) {
    const baseHeat = pulse.heatScore!;

    for (let dayOffset = 1; dayOffset <= HISTORY_DAYS; dayOffset++) {
      const historicalDate = new Date(pulse.createdAt);
      historicalDate.setDate(historicalDate.getDate() - dayOffset);

      const historicalExpireAt = new Date(pulse.expireAt);
      historicalExpireAt.setDate(historicalExpireAt.getDate() - dayOffset);

      // Random fluctuation: baseHeat × (1 ± 0.15)
      const fluctuation = 1 + (Math.random() * 2 - 1) * HEAT_FLUCTUATION;
      const historicalHeat = Math.round(baseHeat * fluctuation);

      await prisma.pulse.create({
        data: {
          category: pulse.category,
          dataSource: pulse.dataSource,
          title: pulse.title,
          content: pulse.content,
          locale: pulse.locale,
          createdAt: historicalDate,
          expireAt: historicalExpireAt,
          heatScore: historicalHeat,
          heatDelta: null,
          expired: false,
          extra: {},
        },
      });
      created++;
    }
  }

  console.log(
    `Created ${created} historical rows (${todayPulses.length} pulses × ${HISTORY_DAYS} days)`,
  );
  console.log("\n═══ Cold start complete ═══\n");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Cold start failed:", err);
  process.exit(1);
});
