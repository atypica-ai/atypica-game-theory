import { StudyPageClient } from "@/app/study/StudyPageClient";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth/next";
import { forbidden, notFound, redirect } from "next/navigation";
import { Metadata } from "next/types";
import { fetchUserChatByToken } from "../actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const studyUserChatToken = (await params).token;
  if (!studyUserChatToken) {
    return {};
  }
  const studyUserChat = await fetchUserChatByToken(studyUserChatToken, "study");
  return studyUserChat.title ? { title: studyUserChat.title } : {};
}

export const dynamic = "force-dynamic";

export default async function StudyPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ hello: string }>;
}) {
  const { hello } = await searchParams;
  const { token: studyUserChatToken } = await params;
  if (!studyUserChatToken) {
    // redirect("/");
    notFound();
  }

  const studyUserChat = await fetchUserChatByToken(studyUserChatToken, "study");

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/study");
  }

  if (studyUserChat.userId !== session.user.id) {
    forbidden();
  }

  return (
    <StudyPageClient studyUserChat={studyUserChat} replay={false} isHelloChat={hello === "1"} />
  );
}
