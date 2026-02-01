import "server-only";

import { createPersonalUser } from "@/app/(auth)/lib";
import { AWS_MARKETPLACE_CONFIG, AWS_MARKETPLACE_FAKE_EMAIL_DOMAIN } from "@/app/(aws)/config";
import { manuallyAddTeamSubscription } from "@/app/payment/manualSubscription";
import { createTeam } from "@/app/team/lib";
import { rootLogger } from "@/lib/logging";
import type { Team, User } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { syncAwsSubscriptionExpiration } from "./subscription";

const logger = rootLogger.child({ module: "aws-marketplace-auth" });

/**
 * Create AWS Marketplace user with team
 *
 * Creates a complete AWS Marketplace user setup:
 * - Personal user with empty password (cannot login via email/password)
 * - Team owned by the personal user
 * - Team member user for actual usage
 * - AWS customer record in database
 * - Initial subscription (1 month, team plan)
 *
 * @param customerIdentifier - AWS customer identifier
 * @param productCode - AWS Marketplace product code
 * @returns { personalUser, team, teamUser }
 */
export async function createAWSMarketplaceUserWithTeam({
  customerIdentifier,
  productCode,
}: {
  customerIdentifier: string;
  productCode: string;
}): Promise<{
  personalUser: Omit<User, "password">;
  team: Team;
  teamUser: User;
}> {
  const email = `${customerIdentifier}@${AWS_MARKETPLACE_FAKE_EMAIL_DOMAIN}`;

  try {
    // 1. Create personal user (with tokensAccount and signup tokens, same as normal registration)
    const personalUser = await createPersonalUser({
      email,
      password: undefined, // No password - cannot login via email/password
      emailVerified: new Date(), // Skip email verification
      grantSignupTokens: true, // Grant signup tokens like normal users
    });

    // 2. Create team and team member user
    const { team, teamUser } = await createTeam({
      name: "", // AWS teams start with no name
      ownerUser: personalUser,
    });

    // 3. Update team seats to AWS config value
    await prisma.team.update({
      where: { id: team.id },
      data: { seats: AWS_MARKETPLACE_CONFIG.DEFAULT_QUANTITY },
    });

    // 4. Create AWS Marketplace customer record
    await prisma.aWSMarketplaceCustomer.create({
      data: {
        userId: personalUser.id,
        customerIdentifier,
        productCode,
        status: "active",
        dimension: AWS_MARKETPLACE_CONFIG.DEFAULT_DIMENSION,
        quantity: AWS_MARKETPLACE_CONFIG.DEFAULT_QUANTITY,
        subscribedAt: new Date(),
      },
    });

    // 5. Create team subscription (1 month, team plan, 3 seats)
    await manuallyAddTeamSubscription({
      teamId: team.id,
      seats: 3,
      plan: "team",
      startsAt: new Date(),
      months: 1,
    });

    // 6. Sync subscription expiration from AWS Entitlement API
    await syncAwsSubscriptionExpiration({
      customerIdentifier,
      teamId: team.id,
    });

    logger.info({
      msg: "AWS Marketplace user and team created",
      userId: personalUser.id,
      customerIdentifier,
      teamId: team.id,
      teamUserId: teamUser.id,
    });

    return { personalUser, team, teamUser };
  } catch (error) {
    // Handle concurrent registration (unique constraint violation)
    if ((error as { code?: string }).code === "P2002") {
      logger.warn({
        msg: "Concurrent AWS registration detected, fetching existing user",
        customerIdentifier,
      });

      const existing = await prisma.aWSMarketplaceCustomer.findUnique({
        where: { customerIdentifier },
        include: { user: true },
      });

      if (existing) {
        const team = await prisma.team.findFirst({
          where: { ownerUserId: existing.user.id },
        });

        const teamUser = await prisma.user.findFirst({
          where: {
            personalUserId: existing.user.id,
            teamIdAsMember: team?.id,
          },
        });

        if (team && teamUser) {
          logger.info({
            msg: "Returning existing AWS user from concurrent registration",
            userId: existing.user.id,
            customerIdentifier,
            teamUserId: teamUser.id,
          });

          // Check if subscription exists, create if not
          const existingSubscription = await prisma.subscription.findFirst({
            where: { teamId: team.id },
          });

          if (!existingSubscription) {
            await manuallyAddTeamSubscription({
              teamId: team.id,
              seats: AWS_MARKETPLACE_CONFIG.DEFAULT_QUANTITY,
              plan: "team",
              startsAt: new Date(),
              months: 1,
            });

            await syncAwsSubscriptionExpiration({
              customerIdentifier,
              teamId: team.id,
            });

            logger.info({
              msg: "Created subscription for existing AWS user",
              userId: existing.user.id,
              teamId: team.id,
            });
          }

          return { personalUser: existing.user, team, teamUser };
        }
      }
    }
    throw error;
  }
}
