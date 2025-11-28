import authOptions from "@/app/(auth)/authOptions";
import { validateInterviewShareToken } from "@/app/(interviewProject)/lib";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { Button } from "@/components/ui/button";
import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense } from "react";
import { InviteInterviewClient } from "./InviteInterviewClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("InterviewProject.shareInvite");
  const locale = await getLocale();
  return generatePageMetadata({
    title: t("title"),
    description: t("description"),
    locale,
  });
}

async function InvalidLinkPage() {
  const t = await getTranslations("InterviewProject.shareInvite");
  return (
    <div className="flex-1 px-4 py-8 flex items-center justify-center">
      <div className="w-full max-w-sm text-center space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">{t("errorTitle")}</h1>
          <p className="text-muted-foreground">{t("errorDescription")}</p>
        </div>
        <div className="space-y-4">
          <Button asChild size="lg" className="w-full">
            <Link href="/">{t("returnHome")}</Link>
          </Button>
        </div>
        <div className="pt-6">
          <p className="text-xs text-muted-foreground">
            {t("poweredBy")}{" "}
            <a
              href="https://atypica.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              atypica.AI
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

async function SharePage({ shareToken }: { shareToken: string }) {
  const session = await getServerSession(authOptions);
  // Validate the share token
  const projectInfo = await validateInterviewShareToken(shareToken);
  if (!projectInfo) {
    return <InvalidLinkPage />;
  }
  return (
    <InviteInterviewClient
      shareToken={shareToken}
      projectInfo={projectInfo}
      user={session?.user || null}
    />
  );
}

export default async function SharePageWithLoading({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <SharePage shareToken={shareToken} />
    </Suspense>
  );
}
