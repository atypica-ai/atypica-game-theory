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
  if (isDryRun) {
    console.log("DRY RUN mode enabled");
  }

  const paymentRecords = await prisma.paymentRecord.findMany({
    where: {
      paymentMethod: "stripe",
      status: "succeeded",
    },
    select: {
      id: true,
      userId: true,
      currency: true,
      stripeInvoice: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  type GroupValue = {
    customerId: string; // most recent (records are ordered by createdAt desc)
    targetUserId: number;
    currency: CurrencyKey;
  };

  const groups = new Map<string, GroupValue>();
  let extractedCount = 0;

  for (const record of paymentRecords) {
    if (record.currency !== "USD" && record.currency !== "CNY") {
      continue;
    }
    const customerId = extractStripeCustomerId(record.stripeInvoice);
    if (!customerId) continue;

    extractedCount++;
    const targetUserId = record.userId;
    const key = `${targetUserId}:${record.currency}`;
    // Only keep the first (most recent) customerId per user+currency
    if (!groups.has(key)) {
      groups.set(key, { customerId, targetUserId, currency: record.currency });
    }
  }

  const targetUserIds = Array.from(new Set(Array.from(groups.values()).map((g) => g.targetUserId)));
  const users = await prisma.user.findMany({
    where: { id: { in: targetUserIds } },
    select: {
      id: true,
      profile: {
        select: {
          id: true,
          extra: true,
        },
      },
    },
  });
  const userMap = new Map(users.map((user) => [user.id, user]));

  let missingProfileCount = 0;
  let updatedCount = 0;
  let skippedExistingCount = 0;

  for (const group of groups.values()) {
    const targetUser = userMap.get(group.targetUserId);
    if (!targetUser?.profile) {
      missingProfileCount++;
      console.log(
        `[MISSING_PROFILE] user=${group.targetUserId} currency=${group.currency} candidate=${group.customerId}`,
      );
      continue;
    }

    const extra = (targetUser.profile.extra ?? {}) as UserProfileExtraLike;
    const existing = extra.stripeCustomerIds?.[group.currency];
    if (existing) {
      skippedExistingCount++;
      continue;
    }

    const nextExtra: UserProfileExtraLike = {
      ...extra,
      stripeCustomerIds: {
        ...(extra.stripeCustomerIds ?? {}),
        [group.currency]: group.customerId,
      },
    };

    if (isDryRun) {
      updatedCount++;
      console.log(
        `[DRY_RUN_UPDATE] user=${group.targetUserId} currency=${group.currency} customerId=${group.customerId}`,
      );
      continue;
    }

    await prisma.userProfile.update({
      where: { id: targetUser.profile.id },
      data: {
        extra: nextExtra,
      },
    });
    updatedCount++;
  }

  const scannedCount = paymentRecords.length;
  const groupsCount = groups.size;

  console.log("");
  console.log("Summary");
  console.log(`- scanned payment records: ${scannedCount}`);
  console.log(`- extracted customer ids: ${extractedCount}`);
  console.log(`- grouped user+currency pairs: ${groupsCount}`);
  console.log(`- updated: ${updatedCount}`);
  console.log(`- skipped existing: ${skippedExistingCount}`);
  console.log(`- missing profile: ${missingProfileCount}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("stripe customer backfill failed:", error);
    process.exit(1);
  });
}
