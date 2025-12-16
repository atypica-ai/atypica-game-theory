import authOptions from "@/app/(auth)/authOptions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { prisma } from "@/prisma/prisma";
import { getServerSession, Session } from "next-auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TeamDetailPageClient } from "./TeamDetailPageClient";

async function TeamDetailPage({
  sessionUser,
  teamId,
}: {
  sessionUser: NonNullable<Session["user"]>;
  userType: "TeamMember";
  teamId: number;
}) {
  const [user, team] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: sessionUser.id },
    }),
    prisma.team.findUniqueOrThrow({
      where: {
        id: teamId, // user.teamIdAsMember
      },
    }),
  ]);
  const isOwner = team.ownerUserId === user.personalUserId;
  // 所有团队成员都可以访问团队页面，但只有 owner 可以进行操作
  return <TeamDetailPageClient team={team} isOwner={isOwner} />;
}

export default async function TeamDetailPageWithLoading() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/team`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  if (session?.userType !== "TeamMember" || !session?.team) {
    redirect("/account");
  }
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <TeamDetailPage
        sessionUser={session.user}
        userType={session.userType}
        teamId={session.team.id}
      />
    </Suspense>
  );
}
