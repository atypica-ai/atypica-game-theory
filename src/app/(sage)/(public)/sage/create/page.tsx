import authOptions from "@/app/(auth)/authOptions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getServerSession, Session } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CreateSagePageClient } from "./CreateSagePageClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Sage.create");
  const locale = await getLocale();
  return generatePageMetadata({
    title: t("title"),
    locale,
  });
}

async function SageCreatePage({
  sessionUser, // eslint-disable-line @typescript-eslint/no-unused-vars
}: {
  sessionUser: NonNullable<Session["user"]>;
}) {
  return <CreateSagePageClient />;
}

export default async function SageCreatePageWithLoading() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/sage/create`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <SageCreatePage sessionUser={session.user} />
    </Suspense>
  );
}
