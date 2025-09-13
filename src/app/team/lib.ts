import "server-only";

import { createTeamMemberUser } from "@/app/(auth)/lib";
import { Team, User } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";

export async function createTeam({
  name,
  ownerUser,
}: {
  name: string;
  ownerUser: Pick<User, "id" | "name">;
}): Promise<{
  team: Team;
  teamUser: Omit<User, "teamIdAsMember" | "personalUserId"> & {
    teamIdAsMember: number;
    personalUserId: number;
  };
}> {
  const team = await prisma.team.create({
    data: {
      name,
      seats: 1,
      ownerUserId: ownerUser.id,
    },
  });

  await prisma.tokensAccount.create({
    data: {
      teamId: team.id,
      permanentBalance: 0,
      monthlyBalance: 0,
    },
  });

  // 创建团队拥有者的团队用户身份
  const teamUser = await createTeamMemberUser({
    personalUser: ownerUser,
    teamAsMember: team,
  });

  return { team, teamUser };
}
