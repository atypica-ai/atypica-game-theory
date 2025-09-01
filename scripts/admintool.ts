// Admin tool for user management
// Usage:
//   pnpm tsx scripts/admintool.ts create-user email@example.com password123
//   pnpm tsx scripts/admintool.ts make-admin email@example.com

// Mock server-only module to avoid client component error
import { Module } from "module";
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
  if (id === "server-only") {
    return {}; // Mock empty object
  }
  return originalRequire.apply(this, arguments as any);
};

import { AdminRole } from "@/prisma/client";
import { loadEnvConfig } from "@next/env";

async function createUser(email: string, password: string) {
  loadEnvConfig(process.cwd());
  const { createPersonalUser } = await import("@/app/(auth)/lib");
  const { prisma } = await import("@/prisma/prisma");

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      console.error(`Error: User with email ${email} already exists`);
      process.exit(1);
    }

    // Create user with email verification already passed
    const user = await createPersonalUser({
      email,
      password,
      emailVerified: new Date(), // Mark email as verified
    });

    console.log(`User created successfully:`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Email verified: Yes`);
  } catch (error) {
    console.error(`Error creating user: ${(error as Error).message}`);
    process.exit(1);
  }
}

async function makeAdmin(email: string) {
  loadEnvConfig(process.cwd());
  const { prisma } = await import("@/prisma/prisma");

  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { adminUser: true },
    });

    if (!user) {
      console.error(`Error: User with email ${email} not found`);
      process.exit(1);
    }

    if (user.teamIdAsMember) {
      console.error(`Error: Cannot make team member user an admin`);
      process.exit(1);
    }

    // Check if user is already an admin
    if (user.adminUser) {
      console.log(`User ${email} is already an admin with role: ${user.adminUser.role}`);

      // Update to SUPER_ADMIN if not already
      if (user.adminUser.role !== AdminRole.SUPER_ADMIN) {
        await prisma.adminUser.update({
          where: { userId: user.id },
          data: { role: AdminRole.SUPER_ADMIN },
        });
        console.log(`Updated user ${email} to SUPER_ADMIN`);
      }
    } else {
      // Create admin user record
      await prisma.adminUser.create({
        data: {
          userId: user.id,
          role: AdminRole.SUPER_ADMIN,
          permissions: [],
        },
      });
      console.log(`User ${email} has been made a SUPER_ADMIN`);
    }

    console.log(`Admin user created successfully:`);
    console.log(`  User ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: SUPER_ADMIN`);
  } catch (error) {
    console.error(`Error making user admin: ${(error as Error).message}`);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error("Usage:");
    console.error("  pnpm tsx scripts/admintool.ts create-user <email> <password>");
    console.error("  pnpm tsx scripts/admintool.ts make-admin <email>");
    process.exit(1);
  }

  const command = args[0];

  switch (command) {
    case "create-user":
      if (args.length !== 3) {
        console.error("Usage: pnpm tsx scripts/admintool.ts create-user <email> <password>");
        process.exit(1);
      }
      await createUser(args[1], args[2]);
      break;

    case "make-admin":
      if (args.length !== 2) {
        console.error("Usage: pnpm tsx scripts/admintool.ts make-admin <email>");
        process.exit(1);
      }
      await makeAdmin(args[1]);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.error("Available commands: create-user, make-admin");
      process.exit(1);
  }
}

if (require.main === module) {
  main();
}
