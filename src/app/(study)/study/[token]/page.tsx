import authOptions from "@/app/(auth)/authOptions";
import { StudyPageClient } from "@/app/(study)/study/StudyPageClient";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { getServerSession } from "next-auth/next";
import { getLocale } from "next-intl/server";
import { forbidden, notFound, redirect } from "next/navigation";
import { Metadata } from "next/types";
import { Suspense } from "react";
import { fetchUserChatByToken } from "../actions";

// generateMetadata 需要访问数据库
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const token = (await params).token;
  if (!token) {
    return {};
  }
  const result = await fetchUserChatByToken(token, "study");
  if (!result.success || !result.data.title) {
    return {};
  }
  const studyUserChat = result.data;
  return generatePageMetadata({
    title: studyUserChat.title,
    locale,
  });
}

async function StudyPage({
  studyUserChatToken,
  sessionUserId,
}: {
  studyUserChatToken: string;
  sessionUserId: number;
}) {
  const result = await fetchUserChatByToken(studyUserChatToken, "study");
  if (!result.success) {
    notFound();
    // throwServerActionError(result);
  }
  const studyUserChat = result.data;

  if (studyUserChat.userId !== sessionUserId) {
    forbidden();
  }

  return <StudyPageClient studyUserChat={studyUserChat} replay={false} />;
}

// 必须是整个 StudyPage 放进 Suspense 而不是 StudyPageClient，因为要 wait 的是 StudyPage 在服务端加载的部分。
export default async function StudyPageWithLoading({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: studyUserChatToken } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/study/${studyUserChatToken}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <StudyPage studyUserChatToken={studyUserChatToken} sessionUserId={session.user.id} />
    </Suspense>
  );
}
