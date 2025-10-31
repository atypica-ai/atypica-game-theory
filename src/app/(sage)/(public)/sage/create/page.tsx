import authOptions from "@/app/(auth)/authOptions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getServerSession, Session } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CreateSageForm } from "./CreateSageForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Sage.create");
  const locale = await getLocale();
  return generatePageMetadata({
    title: t("title"),
    locale,
  });
}

async function SageCreatePage({ sessionUser }: { sessionUser: NonNullable<Session["user"]> }) {
  // Only allow @tezign.com users
  if (!sessionUser.email?.endsWith("@tezign.com")) {
    // Show coming soon message for non-Tezign users
    const t = await getTranslations("Sage.create");
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md mx-auto p-8 text-center space-y-4">
          <div className="text-6xl mb-4">🚀</div>
          <h1 className="text-2xl font-bold">{t("comingSoonTitle")}</h1>
          <p className="text-muted-foreground">{t("comingSoonDescription")}</p>
          <div className="pt-4">
            <Link href="/sage" className="text-sm text-primary hover:underline">
              {t("backToHome")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <CreateSageForm />;
}

export default async function SageCreatePageWithLoading() {
  // Check Tezign email access
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
