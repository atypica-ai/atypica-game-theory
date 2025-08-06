import authOptions from "@/app/(auth)/authOptions";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth";
import { forbidden, redirect } from "next/navigation";
import { TeamDetailPageClient } from "./TeamDetailPageClient";

export default async function TeamDetailPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/team`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
  });

  if (user.teamIdAsMember) {
    const team = await prisma.team.findUniqueOrThrow({
      where: { id: user.teamIdAsMember },
    });
    if (team.ownerUserId === user.personalUserId) {
      // 团队成员是 owner，直接进入团队管理界面
      return <TeamDetailPageClient teamId={team.id} />;
    } else {
      // 团队成员不是 owner，无权限访问
      forbidden();
    }
  }

  // 不是团队用户，切换到个人页面
  redirect("/account");
}
