import { fetchClarifyInterviewSession } from "@/app/interviewProject/actions";
import UserTokensBalance from "@/components/UserTokensBalance";
import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";
import { convertDBMessageToAIMessage } from "@/lib/messageUtils";
import { generatePageMetadata } from "@/lib/metadata";
import { prisma } from "@/lib/prisma";
import { ArrowLeftIcon } from "lucide-react";
import { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageLayout } from "../../PageLayout";
import { ClarifySessionClient } from "./ClarifySessionClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  if (!token) {
    return {};
  }

  const result = await fetchClarifyInterviewSession(token);
  if (!result.success) {
    return {};
  }
  const interviewSession = result.data;

  return generatePageMetadata({
    title: interviewSession.title,
    description: interviewSession.project.brief || undefined,
  });
}

export default async function ClarifySessionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/interviewProject/clarify/${token}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const result = await fetchClarifyInterviewSession(token);
  if (!result.success) {
    notFound();
  }
  const interviewSession = result.data;
  // fetchClarifyInterviewSession 里面已经判断了
  // if (interviewSession.project.userId !== session.user.id) {
  //   forbidden();
  // }
  const userChatId = interviewSession.userChatId;
  if (!userChatId) {
    throw new Error("Something went wrong, useChat should exist on clarify session");
  }
  const messages = (
    await prisma.chatMessage.findMany({
      where: { userChatId },
      orderBy: { id: "asc" },
    })
  ).map(convertDBMessageToAIMessage);

  return (
    <PageLayout
      menus={
        <>
          <Button variant="ghost" asChild>
            <Link href={`/interviewProject/${interviewSession.project.token}`}>
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to Project
            </Link>
          </Button>
          <UserTokensBalance />
        </>
      }
    >
      <ClarifySessionClient
        interviewSession={{ ...interviewSession, userChatId }}
        initialMessages={messages}
      />
    </PageLayout>
  );
}
