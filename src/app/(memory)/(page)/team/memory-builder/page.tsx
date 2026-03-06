import authOptions from "@/app/(auth)/authOptions";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth";
import { forbidden, redirect } from "next/navigation";
import { MemoryBuilderPageClient } from "../../components/MemoryBuilderPageClient";

export default async function TeamMemoryBuilderPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    const callbackUrl = `/team/memory-builder`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (session?.userType !== "TeamMember" || !session?.team) {
    forbidden();
  }

  const [team, user] = await Promise.all([
    prisma.team.findUnique({ where: { id: session.team.id }, select: { ownerUserId: true } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { personalUserId: true } }),
  ]);

  if (!team || !user || team.ownerUserId !== user.personalUserId) {
    forbidden();
  }

  return <MemoryBuilderPageClient mode="team" />;
}
