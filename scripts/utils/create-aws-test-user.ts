/**
 * Create a test AWS Marketplace user for local development.
 *
 * This script creates a fake AWS Marketplace user without calling the real AWS Entitlement API.
 * It mimics what createAWSMarketplaceUserWithTeam() does, but skips the AWS API sync step.
 *
 * Usage:
 *   pnpm tsx scripts/utils/create-aws-test-user.ts <customer-identifier>
 *
 * Example:
 *   pnpm tsx scripts/utils/create-aws-test-user.ts test-customer-001
 *
 * The user will be created with:
 *   - Email: <customer-identifier>@aws.atypica.ai
 *   - No password (cannot login via email/password)
 *   - A team with 3 seats
 *   - An active team subscription (1 month)
 *   - An AWSMarketplaceCustomer record (status: active)
 *
 * To login, use NextAuth with the team member user's email via the AWS Marketplace flow,
 * or query the DB directly to find the teamUser email.
 */

import { loadEnvConfig } from "@next/env";
import { Module } from "module";
import "../mock-server-only";

const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
  if (id === "next/server") {
    const actual = originalRequire.apply(this, arguments as any);
    return {
      ...actual,
      after: (fn: () => unknown) => {
        Promise.resolve().then(() => fn()).catch(() => {});
      },
    };
  }
  return originalRequire.apply(this, arguments as any);
};

async function createAwsTestUser(customerIdentifier: string) {
  loadEnvConfig(process.cwd());

  const { createPersonalUser } = await import("@/app/(auth)/lib");
  const { generateImpersonationLoginUrl } = await import("@/app/(auth)/impersonationLogin");
  const { manuallyAddTeamSubscription } = await import("@/app/payment/manualSubscription");
  const { createTeam } = await import("@/app/team/lib");
  const { prisma } = await import("@/prisma/prisma");

  const AWS_MARKETPLACE_FAKE_EMAIL_DOMAIN = "aws.atypica.ai";
  const DEFAULT_QUANTITY = 3;
  const DEFAULT_DIMENSION = "team_plan";
  const FAKE_PRODUCT_CODE = "test-product-code";

  const email = `${customerIdentifier}@${AWS_MARKETPLACE_FAKE_EMAIL_DOMAIN}`;

  const existing = await prisma.user.findUnique({
    where: { email },
  });
  if (existing) {
    console.error(`Error: AWS user with identifier "${customerIdentifier}" already exists`);
    console.error(`  Email: ${email}`);
    process.exit(1);
  }

  const personalUser = await createPersonalUser({
    email,
    password: undefined,
    emailVerified: new Date(),
    grantSignupTokens: true,
  });

  const { team, teamUser } = await createTeam({
    name: `AWS Test Team (${customerIdentifier})`,
    ownerUser: personalUser,
  });

  await prisma.team.update({
    where: { id: team.id },
    data: { seats: DEFAULT_QUANTITY },
  });

  await prisma.aWSMarketplaceCustomer.create({
    data: {
      userId: personalUser.id,
      customerIdentifier,
      productCode: FAKE_PRODUCT_CODE,
      status: "active",
      dimension: DEFAULT_DIMENSION,
      quantity: DEFAULT_QUANTITY,
      subscribedAt: new Date(),
    },
  });

  await manuallyAddTeamSubscription({
    teamId: team.id,
    seats: DEFAULT_QUANTITY,
    plan: "team",
    startsAt: new Date(),
    months: 1,
  });

  console.log(`AWS test user created successfully:`);
  console.log(`  Customer Identifier: ${customerIdentifier}`);
  console.log(`  Personal User ID:    ${personalUser.id}`);
  console.log(`  Personal User Email: ${personalUser.email}`);
  console.log(`  Team ID:             ${team.id}`);
  console.log(`  Team Name:           ${team.name}`);
  console.log(`  Team Seats:          ${DEFAULT_QUANTITY}`);
  console.log(`  Team User ID:        ${teamUser.id}`);
  console.log(`  Team User Email:     ${teamUser.email}`);
  console.log(``);
  const loginUrl = generateImpersonationLoginUrl(teamUser.id, "http://localhost:3000", 24, "/pricing");
  console.log(`Login URL (valid 24h):`);
  console.log(`  ${loginUrl}`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length !== 1) {
    console.error("Usage: pnpm tsx scripts/utils/create-aws-test-user.ts <customer-identifier>");
    console.error("Example: pnpm tsx scripts/utils/create-aws-test-user.ts test-customer-001");
    process.exit(1);
  }

  try {
    await createAwsTestUser(args[0]);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

main();
