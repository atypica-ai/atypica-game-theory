import authOptions from "@/app/(auth)/authOptions";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth/next";
import { forbidden, notFound, redirect } from "next/navigation";

export default async function LegacyStudyPageRedirect({
  searchParams,
}: {
  searchParams: Promise<{ id: string }>;
}) {
  const { id } = await searchParams;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/study${id ? `?id=${id}` : ""}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (id) {
    const studyUserChatId = parseInt(id);
    const studyUserChat = await prisma.userChat.findUnique({
      where: { id: studyUserChatId, kind: "study" },
    });
    if (!studyUserChat) {
      notFound();
    }
    if (studyUserChat.userId !== session.user.id) {
      forbidden();
    }
    redirect(`/study/${studyUserChat.token}`);
  }

  redirect("/newstudy");
}
