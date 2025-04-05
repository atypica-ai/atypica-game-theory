import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { forbidden, notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StudyPage({
  searchParams,
}: {
  searchParams: Promise<{ id: string; hello: string }>;
}) {
  const { id, hello } = await searchParams;

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
    const callbackUrl = `/study?id=${studyUserChatId}` + (hello ? "&hello=1" : "");
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (studyUserChat.userId !== session.user.id) {
    forbidden();
  }

  redirect(`/study/${studyUserChat.token}` + (hello ? "?hello=1" : ""));
}
