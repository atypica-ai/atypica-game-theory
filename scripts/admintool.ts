// Admin tool for user management
// Usage:
//   pnpm tsx scripts/admintool.ts create-user email@example.com password123
//   pnpm tsx scripts/admintool.ts make-admin email@example.com

import { AdminRole } from "@/prisma/client";
import { loadEnvConfig } from "@next/env";
import "./mock-server-only";

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

async function createTeam(ownerEmail: string, teamName: string) {
  loadEnvConfig(process.cwd());
  const { createTeam: createTeamLib } = await import("@/app/team/lib");
  const { prisma } = await import("@/prisma/prisma");

  try {
    // Find owner user by email
    const ownerUser = await prisma.user.findUnique({
      where: { email: ownerEmail.toLowerCase() },
    });

    if (!ownerUser) {
      console.error(`Error: User with email ${ownerEmail} not found`);
      process.exit(1);
    }

    if (ownerUser.teamIdAsMember) {
      console.error(`Error: User ${ownerEmail} is a team member, not a personal user`);
      console.error(`Only personal users can own teams`);
      process.exit(1);
    }

    // Check if team name already exists for this user
    const existingTeam = await prisma.team.findFirst({
      where: {
        ownerUserId: ownerUser.id,
        name: teamName,
      },
    });

    if (existingTeam) {
      console.error(`Error: Team "${teamName}" already exists for user ${ownerEmail}`);
      process.exit(1);
    }

    // Create the team using the existing createTeam function
    const { team, teamUser } = await createTeamLib({
      name: teamName,
      ownerUser: { id: ownerUser.id, name: ownerUser.name },
    });

    console.log(`Team created successfully:`);
    console.log(`  Team ID: ${team.id}`);
    console.log(`  Team Name: ${team.name}`);
    console.log(`  Owner Email: ${ownerEmail}`);
    console.log(`  Owner User ID: ${ownerUser.id}`);
    console.log(`  Seats: ${team.seats}`);
    console.log(`  Team User ID (owner): ${teamUser.id}`);
  } catch (error) {
    console.error(`Error creating team: ${(error as Error).message}`);
    process.exit(1);
  }
}

async function addSubscription(
  email: string,
  plan: string,
  startDateStr: string,
  monthsStr: string,
) {
  loadEnvConfig(process.cwd());
  const { manuallyAddSubscription } = await import("@/app/payment/manualSubscription");
  const { prisma } = await import("@/prisma/prisma");

  try {
    // Validate plan
    if (plan !== "pro" && plan !== "max") {
      console.error(`Error: Invalid plan "${plan}". Must be "pro" or "max"`);
      process.exit(1);
    }

    // Parse months
    const months = parseInt(monthsStr, 10);
    if (isNaN(months) || months < 1) {
      console.error(`Error: Invalid months "${monthsStr}". Must be a positive integer`);
      process.exit(1);
    }

    // Parse start date
    const startDate = new Date(startDateStr);
    if (isNaN(startDate.getTime())) {
      console.error(`Error: Invalid start date "${startDateStr}". Use ISO format: YYYY-MM-DD`);
      process.exit(1);
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      console.error(`Error: User with email ${email} not found`);
      process.exit(1);
    }

    if (user.teamIdAsMember) {
      console.error(`Error: User ${email} is a team member, not a personal user`);
      console.error(`This command only works for personal users`);
      process.exit(1);
    }

    // Add subscription (manuallyAddSubscription will check for overlapping subscriptions)
    await manuallyAddSubscription({
      userId: user.id,
      plan: plan as "pro" | "max",
      startsAt: startDate,
      months,
    });

    console.log(`Subscription added successfully:`);
    console.log(`  User Email: ${email}`);
    console.log(`  User ID: ${user.id}`);
    console.log(`  Plan: ${plan}`);
    console.log(`  Start Date: ${startDate.toISOString()}`);
    console.log(`  Months: ${months}`);
  } catch (error) {
    console.error(`Error adding subscription: ${(error as Error).message}`);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error("Usage:");
    console.error("  pnpm tsx scripts/admintool.ts create-user <email> <password>");
    console.error("  pnpm tsx scripts/admintool.ts make-admin <email>");
    console.error("  pnpm tsx scripts/admintool.ts create-team <owner-email> <team-name>");
    console.error(
      "  pnpm tsx scripts/admintool.ts add-subscription <email> <pro|max> <start-date> <months>",
    );
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

    case "create-team":
      if (args.length !== 3) {
        console.error("Usage: pnpm tsx scripts/admintool.ts create-team <owner-email> <team-name>");
        process.exit(1);
      }
      await createTeam(args[1], args[2]);
      break;

    case "add-subscription":
      if (args.length !== 5) {
        console.error(
          "Usage: pnpm tsx scripts/admintool.ts add-subscription <email> <pro|max> <start-date> <months>",
        );
        console.error("Example: pnpm tsx scripts/admintool.ts add-subscription user@example.com pro 2024-01-30 3");
        process.exit(1);
      }
      await addSubscription(args[1], args[2], args[3], args[4]);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.error("Available commands: create-user, make-admin, create-team, add-subscription");
      process.exit(1);
  }
}

if (require.main === module) {
  main();
}
