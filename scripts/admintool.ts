// Admin tool for local user management
// Usage:
//   pnpm tsx scripts/admintool.ts create-user <email> <password>
//   pnpm tsx scripts/admintool.ts list-users
//   pnpm tsx scripts/admintool.ts reset-password <email> <password>

import { loadEnvConfig } from "@next/env";
import "./mock-server-only";

loadEnvConfig(process.cwd());

async function createUser(email: string, password: string) {
  const { createPersonalUser } = await import("@/app/(auth)/lib");
  const { prisma } = await import("@/prisma/prisma");

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    console.error(`Error: User with email ${email} already exists (id=${existing.id})`);
    process.exit(1);
  }

  const user = await createPersonalUser({
    email,
    password,
    emailVerified: new Date(), // pre-verify so they can log in immediately
  });

  console.log(`User created successfully:`);
  console.log(`  ID:             ${user.id}`);
  console.log(`  Email:          ${user.email}`);
  console.log(`  Name:           ${user.name}`);
  console.log(`  Email verified: yes`);
}

async function listUsers() {
  const { prisma } = await import("@/prisma/prisma");

  const users = await prisma.user.findMany({
    where: { teamIdAsMember: null }, // personal users only
    select: { id: true, name: true, email: true, emailVerified: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  if (users.length === 0) {
    console.log("No users found.");
    return;
  }

  console.log(`${"ID".padEnd(6)}  ${"Email".padEnd(36)}  ${"Name".padEnd(20)}  Verified`);
  console.log("-".repeat(80));
  for (const u of users) {
    const verified = u.emailVerified ? "yes" : "no";
    console.log(
      `${String(u.id).padEnd(6)}  ${(u.email ?? "").padEnd(36)}  ${u.name.padEnd(20)}  ${verified}`,
    );
  }
}

async function resetPassword(email: string, password: string) {
  const { prisma } = await import("@/prisma/prisma");
  const { hash } = await import("bcryptjs");

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    console.error(`Error: User with email ${email} not found`);
    process.exit(1);
  }

  const hashed = await hash(password, 10);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

  console.log(`Password reset successfully for ${email} (id=${user.id})`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "create-user":
      if (args.length !== 3) {
        console.error("Usage: pnpm tsx scripts/admintool.ts create-user <email> <password>");
        process.exit(1);
      }
      await createUser(args[1], args[2]);
      break;

    case "list-users":
      await listUsers();
      break;

    case "reset-password":
      if (args.length !== 3) {
        console.error("Usage: pnpm tsx scripts/admintool.ts reset-password <email> <password>");
        process.exit(1);
      }
      await resetPassword(args[1], args[2]);
      break;

    default:
      console.error("Usage:");
      console.error("  pnpm tsx scripts/admintool.ts create-user <email> <password>");
      console.error("  pnpm tsx scripts/admintool.ts list-users");
      console.error("  pnpm tsx scripts/admintool.ts reset-password <email> <password>");
      process.exit(command ? 1 : 0);
  }
}

main().catch((err) => {
  console.error((err as Error).message);
  process.exit(1);
});
