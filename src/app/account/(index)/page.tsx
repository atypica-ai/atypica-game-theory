import authOptions from "@/app/(auth)/authOptions";
import { fetchActiveUserSubscription } from "@/app/account/lib";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AccountPageClient } from "./AccountPageClient";

async function fetchUserTokens() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return null;
  }

  const userId = session.user.id;
  const userTokens = await prisma.userTokens.findUnique({
    where: { userId },
  });

  return userTokens;
}

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/account");
  }
  const userId = session.user.id;

  // TODO: 现在比较粗糙的在每次打开 account 页面的时候 reset 一下
  // 需要改成定时调用
  // 同时注意下 reset 操作和研究过程中的 consume 操作的写冲突可能性
  // await resetMonthlyTokens({ userId });
  // 先注释，可能会导致 subscription add monthly tokens 被计算两次

  const userTokens = await fetchUserTokens();
  const result = await fetchActiveUserSubscription({ userId });

  return <AccountPageClient userTokens={userTokens} {...result}></AccountPageClient>;
}
