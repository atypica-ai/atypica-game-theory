import { resetMonthlyTokens } from "@/app/payment/lib";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AccountLayout } from "./AccountLayout";
import { fetchActiveUserSubscription } from "./lib";

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

export default async function AccountLayoutPage({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/account");
  }
  const userId = session.user.id;

  // TODO: 现在比较粗糙的在每次打开 account 页面的时候 reset 一下
  // 需要改成定时调用
  // 同时注意下 reset 操作和研究过程中的 consume 操作的写冲突可能性
  await resetMonthlyTokens({ userId });

  const userTokens = await fetchUserTokens();
  const result = await fetchActiveUserSubscription({ userId });

  return (
    <AccountLayout userTokens={userTokens} {...result}>
      {children}
    </AccountLayout>
  );
}
