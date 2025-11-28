import authOptions from "@/app/(auth)/authOptions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { prisma } from "@/prisma/prisma";
import { getServerSession, Session } from "next-auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TeamDetailPageClient } from "./TeamDetailPageClient";

async function TeamDetailPage({ sessionUser }: { sessionUser: NonNullable<Session["user"]> }) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
  });

  if (user.teamIdAsMember) {
    const team = await prisma.team.findUniqueOrThrow({
      where: { id: user.teamIdAsMember },
    });
    const isOwner = team.ownerUserId === user.personalUserId;

    // 所有团队成员都可以访问团队页面，但只有 owner 可以进行操作
    return <TeamDetailPageClient team={team} isOwner={isOwner} />;
  }

  // 不是团队用户，切换到个人页面
  redirect("/account");
}

export default async function TeamDetailPageWithLoading() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/team`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <TeamDetailPage sessionUser={session.user} />
    </Suspense>
  );
}
