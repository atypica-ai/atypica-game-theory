import authOptions from "@/app/(auth)/authOptions";
import { TUniversalMessageWithTool } from "@/app/(universal)/tools/types";
import { fetchUniversalUserChatByToken } from "@/app/(universal)/universal/actions";
import { Forbidden } from "@/components/Forbidden";
import { DefaultLayout } from "@/components/layout/DefaultLayout";
import { NotFound } from "@/components/NotFound";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { getServerSession } from "next-auth";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next/types";
import { Suspense } from "react";
import { UniversalChatPageClient } from "./UniversalChatPageClient";

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
  const result = await fetchUniversalUserChatByToken(token);
  if (!result.success || !result.data.title) {
    return {};
  }
  return generatePageMetadata({
    title: result.data.title,
    locale,
  });
}

async function UniversalChatContent({ token, userId }: { token: string; userId: number }) {
  const result = await fetchUniversalUserChatByToken(token);

  if (!result.success) {
    return (
      <DefaultLayout header={true} footer={true}>
        <NotFound />
      </DefaultLayout>
    );
  }

  const { messages, ...userChat } = result.data;

  if (userChat.userId !== userId) {
    return (
      <DefaultLayout header={true} footer={true}>
        <Forbidden />
      </DefaultLayout>
    );
  }

  return (
    <UniversalChatPageClient
      userChat={userChat}
      initialMessages={messages as TUniversalMessageWithTool[]}
    />
  );
}

export default async function UniversalChatPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    const callbackUrl = `/universal/${token}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <UniversalChatContent token={token} userId={session.user.id} />
    </Suspense>
  );
}
