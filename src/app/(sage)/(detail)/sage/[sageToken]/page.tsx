import authOptions from "@/app/(auth)/authOptions";
import { SageAvatar, SageExtra } from "@/app/(sage)/types";
import { NotFound } from "@/components/NotFound";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { prisma } from "@/prisma/prisma";
import type { Metadata } from "next";
import { getServerSession, Session } from "next-auth";
import { getLocale } from "next-intl/server";
import { forbidden } from "next/navigation";
import { Suspense } from "react";
import { SageDetailPageClient } from "./SageDetailPageClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sageToken: string }>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const { sageToken } = await params;

  // Only need name for metadata
  const sage = await prisma.sage.findUnique({
    where: { token: sageToken },
    select: { name: true, domain: true },
  });

  if (!sage) {
    return {};
  }

  return generatePageMetadata({
    title: sage.name,
    description: sage.domain,
    locale,
  });
}

async function SageDetailPage({
  sageToken,
  sessionUser,
}: {
  sageToken: string;
  sessionUser: NonNullable<Session["user"]>;
}) {
  const sageData = await prisma.sage.findUnique({
    where: {
      token: sageToken,
      userId: sessionUser.id,
    },
    select: {
      id: true,
      token: true,
      name: true,
      locale: true,
      bio: true,
      domain: true,
      expertise: true,
      avatar: true,
      extra: true,
    },
  });

  if (!sageData) {
    return NotFound();
  }

  const sage = {
    ...sageData,
    expertise: sageData.expertise as string[],
    extra: sageData.extra as SageExtra,
    avatar: sageData.avatar as SageAvatar,
  };

  return <SageDetailPageClient sage={sage} />;
}

export default async function SageDetailPageeWithLoading({
  params,
}: {
  params: Promise<{ sageToken: string }>;
}) {
  const token = (await params).sageToken;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    forbidden(); // layout 里已经处理过了，这里其实不会出现
  }
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <SageDetailPage sageToken={token} sessionUser={session.user} />
    </Suspense>
  );
}
