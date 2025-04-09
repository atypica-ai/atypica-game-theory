import { StudyPageClient } from "@/app/study/StudyPageClient";
import { throwServerActionError } from "@/lib/serverAction";
import { notFound, redirect } from "next/navigation";
import { Metadata } from "next/types";
import { fetchUserChatByToken } from "../../actions";

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
  if (result.success && result.data.title) {
    const studyUserChat = result.data;
    return { title: studyUserChat.title };
  }
  return {};
}

export const dynamic = "force-dynamic";

export default async function StudySharePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ id?: string; replay?: string }>;
}) {
  const { token } = await params;
  const { replay } = await searchParams;
  if (!token) {
    notFound();
  }
  if (replay !== "1") {
    redirect(`/study/${token}/share?replay=1`);
  }
  const result = await fetchUserChatByToken(token, "study");
  if (result.success) {
    const studyUserChat = result.data;
    return <StudyPageClient studyUserChat={studyUserChat} replay={true} isHelloChat={false} />;
  } else {
    throwServerActionError(result);
  }
}
