import { StudyPageClient } from "@/app/(study)/study/StudyPageClient";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { throwServerActionError } from "@/lib/serverAction";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Metadata } from "next/types";
import { Suspense } from "react";
import { fetchUserChatByToken } from "../../actions";

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
  const title = "💬 " + studyUserChat.title;
  return generatePageMetadata({ title, locale });
}

async function StudySharePage({
  userChatToken,
  replay,
}: {
  userChatToken: string;
  replay: boolean;
}) {
  const result = await fetchUserChatByToken(userChatToken, "study");
  if (result.success) {
    const studyUserChat = result.data;
    return <StudyPageClient studyUserChat={studyUserChat} replay={replay} />;
  } else {
    throwServerActionError(result);
  }
}

export default async function StudySharePageWithLoading({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ replay?: string }>;
}) {
  const { token } = await params;
  const { replay } = await searchParams;
  if (replay !== "1") {
    redirect(`/study/${token}/share?replay=1`);
  }
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <StudySharePage userChatToken={token} replay={true} />
    </Suspense>
  );
}
