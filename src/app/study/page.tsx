import { authOptions } from "@/lib/auth";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth/next";
import { forbidden, notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StudyPage({
  searchParams,
}: {
  searchParams: Promise<{ id: string }>;
}) {
  const { id } = await searchParams;
  if (!id) {
    redirect("/");
  }
  const studyUserChatId = parseInt(id);

  const studyUserChat = await prisma.userChat.findUnique({
    where: { id: studyUserChatId, kind: "study" },
  });

  if (!studyUserChat) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/study?id=${studyUserChatId}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (studyUserChat.userId !== session.user.id) {
    forbidden();
  }

  redirect(`/study/${studyUserChat.token}`);
}
