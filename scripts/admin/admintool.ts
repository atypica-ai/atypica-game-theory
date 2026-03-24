// Admin tool for user management
// Usage:
//   pnpm tsx scripts/admintool.ts create-user email@example.com password123
//   pnpm tsx scripts/admintool.ts make-admin email@example.com

import { AdminRole } from "@/prisma/client";
import { loadEnvConfig } from "@next/env";
import "../mock-server-only";

// Parse --key value style arguments
function parseKeyValueArgs(args: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const value = args[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for --${key}`);
      }
      parsed[key] = value;
      i++; // Skip the value in next iteration
    }
  }
  return parsed;
}

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

async function listTeams(ownerEmail: string) {
  loadEnvConfig(process.cwd());
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
      process.exit(1);
    }

    // Find teams owned by this user
    const teams = await prisma.team.findMany({
      where: { ownerUserId: ownerUser.id },
      select: {
        id: true,
        name: true,
        seats: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (teams.length === 0) {
      console.log(`No teams found for user ${ownerEmail}`);
      return;
    }

    console.log(`Teams owned by ${ownerEmail}:`);
    console.log("");
    teams.forEach((team) => {
      console.log(`  ID: ${team.id}`);
      console.log(`  Name: ${team.name}`);
      console.log(`  Seats: ${team.seats}`);
      console.log(`  Created: ${team.createdAt.toISOString()}`);
      console.log("");
    });
  } catch (error) {
    console.error(`Error listing teams: ${(error as Error).message}`);
    process.exit(1);
  }
}

async function addSubscription(args: string[]) {
  loadEnvConfig(process.cwd());
  const { manuallyAddSubscription, createManualPaymentRecord } =
    await import("@/app/payment/manualSubscription");
  const { prisma } = await import("@/prisma/prisma");

  try {
    const params = parseKeyValueArgs(args);

    // Validate required parameters
    if (!params.email) {
      console.error("Error: Missing --email parameter");
      process.exit(1);
    }
    if (!params.plan) {
      console.error("Error: Missing --plan parameter");
      process.exit(1);
    }
    if (!params.start) {
      console.error("Error: Missing --start parameter");
      process.exit(1);
    }
    if (!params.months) {
      console.error("Error: Missing --months parameter");
      process.exit(1);
    }

    const { email, plan, start: startDateStr, months: monthsStr, currency } = params;

    // Validate plan
    if (plan !== "pro" && plan !== "max" && plan !== "super") {
      console.error(`Error: Invalid plan "${plan}". Must be "pro", "max", or "super"`);
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

    // Validate currency (optional, defaults to CNY)
    if (currency && currency !== "CNY" && currency !== "USD") {
      console.error(`Error: Invalid currency "${currency}". Must be "CNY" or "USD"`);
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

    // Import Currency type
    const { Currency } = await import("@/prisma/client");

    // Create payment record first
    const payment = await createManualPaymentRecord({
      userId: user.id,
      plan: plan as "pro" | "max" | "super",
      months,
      currency: (currency as typeof Currency.CNY | typeof Currency.USD) || Currency.CNY,
      paidAt: startDate,
    });

    // Add subscription with payment record ID
    await manuallyAddSubscription({
      userId: user.id,
      plan: plan as "pro" | "max" | "super",
      startsAt: startDate,
      months,
      paymentRecordId: payment.paymentRecordId,
    });

    console.log(`Subscription added successfully:`);
    console.log(`  User Email: ${email}`);
    console.log(`  User ID: ${user.id}`);
    console.log(`  Plan: ${plan}`);
    console.log(`  Start Date: ${startDate.toISOString()}`);
    console.log(`  Months: ${months}`);
    console.log(``);
    console.log(`Payment Record:`);
    console.log(`  Payment Record ID: ${payment.paymentRecordId}`);
    console.log(`  Order No: ${payment.orderNo}`);
    console.log(`  Product: ${payment.productName}`);
    console.log(`  Price per month: ${payment.price} ${payment.currency}`);
    console.log(`  Quantity: ${payment.quantity} month(s)`);
    console.log(`  Total Amount: ${payment.amount} ${payment.currency}`);
  } catch (error) {
    console.error(`Error adding subscription: ${(error as Error).message}`);
    process.exit(1);
  }
}

async function addTeamSubscription(args: string[]) {
  loadEnvConfig(process.cwd());
  const { manuallyAddTeamSubscription, createManualPaymentRecord } =
    await import("@/app/payment/manualSubscription");
  const { prisma } = await import("@/prisma/prisma");

  try {
    const params = parseKeyValueArgs(args);

    // Validate required parameters
    if (!params.teamId) {
      console.error("Error: Missing --teamId parameter");
      process.exit(1);
    }
    if (!params.plan) {
      console.error("Error: Missing --plan parameter");
      process.exit(1);
    }
    if (!params.seats) {
      console.error("Error: Missing --seats parameter");
      process.exit(1);
    }
    if (!params.start) {
      console.error("Error: Missing --start parameter");
      process.exit(1);
    }
    if (!params.months) {
      console.error("Error: Missing --months parameter");
      process.exit(1);
    }

    const {
      teamId: teamIdStr,
      plan,
      seats: seatsStr,
      start: startDateStr,
      months: monthsStr,
      currency,
    } = params;

    // Parse teamId
    const teamId = parseInt(teamIdStr, 10);
    if (isNaN(teamId) || teamId < 1) {
      console.error(`Error: Invalid teamId "${teamIdStr}". Must be a positive integer`);
      process.exit(1);
    }

    // Parse seats
    const seats = parseInt(seatsStr, 10);
    if (isNaN(seats) || seats < 0) {
      console.error(`Error: Invalid seats "${seatsStr}". Must be a non negative integer`);
      process.exit(1);
    }

    if (plan !== "team" && plan !== "superteam") {
      console.error(`Error: Invalid plan "${plan}". Must be "team" or "superteam"`);
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

    // Validate currency (optional, defaults to CNY)
    if (currency && currency !== "CNY" && currency !== "USD") {
      console.error(`Error: Invalid currency "${currency}". Must be "CNY" or "USD"`);
      process.exit(1);
    }

    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { ownerUser: true },
    });

    if (!team) {
      console.error(`Error: Team with ID ${teamId} not found`);
      process.exit(1);
    }

    // Import Currency type
    const { Currency } = await import("@/prisma/client");

    // Find a team user for this team (usually the owner's team identity)
    const teamUser = await prisma.user.findFirst({
      where: {
        teamIdAsMember: teamId,
        personalUserId: team.ownerUserId,
      },
    });

    if (!teamUser) {
      console.error(`Error: No team user found for team ${teamId}`);
      console.error(`Team must have at least one team user (identity user)`);
      process.exit(1);
    }

    // Create payment record first (using team user's ID, not owner's ID)
    const payment = await createManualPaymentRecord({
      userId: teamUser.id,
      plan: plan as "team" | "superteam",
      months,
      seats,
      currency: (currency as typeof Currency.CNY | typeof Currency.USD) || Currency.CNY,
      paidAt: startDate,
    });

    // Add team subscription with payment record ID
    await manuallyAddTeamSubscription({
      teamId,
      seats,
      plan: plan as "team" | "superteam",
      startsAt: startDate,
      months,
      paymentRecordId: payment.paymentRecordId,
    });

    console.log(`Team subscription added successfully:`);
    console.log(`  Team ID: ${teamId}`);
    console.log(`  Team Name: ${team.name}`);
    console.log(`  Owner Email: ${team.ownerUser.email}`);
    console.log(`  Plan: ${plan}`);
    console.log(`  Seats: ${seats}`);
    console.log(`  Start Date: ${startDate.toISOString()}`);
    console.log(`  Months: ${months}`);
    console.log(``);
    console.log(`Payment Record:`);
    console.log(`  Payment Record ID: ${payment.paymentRecordId}`);
    console.log(`  Order No: ${payment.orderNo}`);
    console.log(`  Product: ${payment.productName}`);
    console.log(`  Price per seat: ${payment.price} ${payment.currency}`);
    console.log(`  Seats: ${seats}`);
    console.log(`  Quantity: ${payment.quantity} (${seats} seats × ${months} months)`);
    console.log(`  Total Amount: ${payment.amount} ${payment.currency}`);
  } catch (error) {
    console.error(`Error adding team subscription: ${(error as Error).message}`);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error("Usage:");
    console.error("  pnpm tsx scripts/admin/admintool.ts create-user <email> <password>");
    console.error("  pnpm tsx scripts/admin/admintool.ts make-admin <email>");
    console.error("  pnpm tsx scripts/admin/admintool.ts create-team <owner-email> <team-name>");
    console.error("  pnpm tsx scripts/admin/admintool.ts list-teams <owner-email>");
    console.error(
      "  pnpm tsx scripts/admin/admintool.ts add-subscription --email <email> --plan <pro|max|super> --start <YYYY-MM-DD> --months <number> [--currency <CNY|USD>]",
    );
    console.error(
      "  pnpm tsx scripts/admin/admintool.ts add-team-subscription --teamId <id> --plan <team|superteam> --seats <number> --start <YYYY-MM-DD> --months <number> [--currency <CNY|USD>]",
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

    case "list-teams":
      if (args.length !== 2) {
        console.error("Usage: pnpm tsx scripts/admintool.ts list-teams <owner-email>");
        process.exit(1);
      }
      await listTeams(args[1]);
      break;

    case "add-subscription":
      await addSubscription(args.slice(1));
      break;

    case "add-team-subscription":
      await addTeamSubscription(args.slice(1));
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.error(
        "Available commands: create-user, make-admin, create-team, list-teams, add-subscription, add-team-subscription",
      );
      process.exit(1);
  }
}

if (require.main === module) {
  main();
}
