import authOptions from "@/app/(auth)/authOptions";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth/next";
import { forbidden, notFound, redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

export default async function LegacyStudyPageRedirect({
  searchParams,
}: {
  searchParams: Promise<{ id: string; pulseId: string }>;
}) {
  const { id, pulseId } = await searchParams;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const params = new URLSearchParams();
    if (id) params.set("id", id);
    if (pulseId) params.set("pulseId", pulseId);
    const queryString = params.toString();
    const callbackUrl = `/study${queryString ? `?${queryString}` : ""}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  // Handle pulseId parameter - fetch pulse and create research brief
  if (pulseId) {
    const pulseIdNum = parseInt(pulseId);
    const pulse = await prisma.pulse.findUnique({
      where: { id: pulseIdNum },
      include: { category: true },
    });

    if (!pulse) {
      notFound();
    }

    // Get locale for message template
    const locale = await getLocale();

    // Build research message based on locale
    const researchMessage = locale.startsWith('zh')
      ? `请开始研究关于"${pulse.title}"的课题。以下是相关详细信息：【${pulse.content}】。`
      : `Please start a research on the topic of \`${pulse.title}\`. Here are some details: 【${pulse.content}】.`;

    // Redirect to newstudy with pre-filled message
    redirect(`/newstudy?brief=${encodeURIComponent(researchMessage)}`);
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
