import authOptions from "@/app/(auth)/authOptions";
import { getServerSession } from "next-auth";
import { forbidden, redirect } from "next/navigation";
import { verifyTeamOwnership } from "../actions";
import { TeamCapabilitiesPageClient } from "./TeamCapabilitiesPageClient";
import { prisma } from "@/prisma/prisma";

export default async function TeamCapabilitiesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect(`/auth/signin?callbackUrl=/team/capabilities`);
  }

  if (session.userType !== "TeamMember" || !session.team) {
    forbidden();
  }

  const ownershipCheck = await verifyTeamOwnership(session.team.id, session.user.id);
  if (!ownershipCheck.success) {
    forbidden();
  }

  const latestMemory = await prisma.memory.findFirst({
    where: { teamId: session.team.id },
    orderBy: { version: "desc" },
    select: { core: true, version: true, createdAt: true, updatedAt: true },
  });

  return <TeamCapabilitiesPageClient initialMemory={latestMemory} />;
}
