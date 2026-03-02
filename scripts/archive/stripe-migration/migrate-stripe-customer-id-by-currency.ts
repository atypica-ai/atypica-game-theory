import "../../mock-server-only";

import { loadEnvConfig } from "@next/env";

type CurrencyKey = "USD" | "CNY";

type UserProfileExtraLike = {
  stripeCustomerIds?: Partial<Record<CurrencyKey, string>>;
  [key: string]: unknown;
};

function extractStripeCustomerId(stripeInvoice: unknown): string | null {
  if (!stripeInvoice || typeof stripeInvoice !== "object") return null;
  const maybeCustomer = (stripeInvoice as { customer?: unknown }).customer;
  return typeof maybeCustomer === "string" && maybeCustomer.length > 0 ? maybeCustomer : null;
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  loadEnvConfig(process.cwd());
  const { prisma } = await import("@/prisma/prisma");

  console.log("Starting stripe customerId backfill by currency");
  if (isDryRun) console.log("DRY RUN mode enabled");

  // Step 1: Get the most recent customerId per user+currency
  const paymentRecords = await prisma.paymentRecord.findMany({
    where: { paymentMethod: "stripe", status: "succeeded" },
    select: { userId: true, currency: true, stripeInvoice: true },
    orderBy: { createdAt: "desc" },
  });

  const best = new Map<string, { userId: number; currency: CurrencyKey; customerId: string }>();
  for (const r of paymentRecords) {
    if (r.currency !== "USD" && r.currency !== "CNY") continue;
    const customerId = extractStripeCustomerId(r.stripeInvoice);
    if (!customerId) continue;
    const key = `${r.userId}:${r.currency}`;
    if (!best.has(key)) best.set(key, { userId: r.userId, currency: r.currency, customerId });
  }

  console.log(`Found ${best.size} user+currency pairs from ${paymentRecords.length} records`);

  // Step 2: Write each one, reading fresh profile every time
  let updated = 0;
  let skipped = 0;
  let missing = 0;

  for (const { userId, currency, customerId } of best.values()) {
    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) {
      missing++;
      console.log(`[MISSING] user=${userId} currency=${currency}`);
      continue;
    }

    const extra = (profile.extra ?? {}) as UserProfileExtraLike;
    if (extra.stripeCustomerIds?.[currency]) {
      skipped++;
      continue;
    }

    const nextExtra: UserProfileExtraLike = {
      ...extra,
      stripeCustomerIds: { ...(extra.stripeCustomerIds ?? {}), [currency]: customerId },
    };

    if (isDryRun) {
      console.log(`[DRY_RUN] user=${userId} currency=${currency} customerId=${customerId}`);
    } else {
      await prisma.userProfile.update({ where: { id: profile.id }, data: { extra: nextExtra } });
    }
    updated++;
  }

  console.log(`\nSummary: updated=${updated} skipped=${skipped} missing=${missing}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("stripe customer backfill failed:", error);
    process.exit(1);
  });
}
