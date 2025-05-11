import { StudyPageClient } from "@/app/study/StudyPageClient";
import { authOptions } from "@/lib/auth";
import { generatePageMetadata } from "@/lib/request/metadata";
import { throwServerActionError } from "@/lib/serverAction";
import { getServerSession } from "next-auth/next";
import { forbidden, notFound, redirect } from "next/navigation";
import { Metadata } from "next/types";
import { fetchUserChatByToken } from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
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
  });
}

export default async function StudyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token: studyUserChatToken } = await params;
  if (!studyUserChatToken) {
    // redirect("/");
    notFound();
  }

  const result = await fetchUserChatByToken(studyUserChatToken, "study");
  if (!result.success) {
    throwServerActionError(result);
  }
  const studyUserChat = result.data;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/study/${studyUserChatToken}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (studyUserChat.userId !== session.user.id) {
    forbidden();
  }

  return <StudyPageClient studyUserChat={studyUserChat} replay={false} />;
}
