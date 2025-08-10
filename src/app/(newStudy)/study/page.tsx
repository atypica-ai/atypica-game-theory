import authOptions from "@/app/(auth)/authOptions";
import { NewStudyInputBox } from "@/components/NewStudyInputBox";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { prisma } from "@/prisma/prisma";
import { CommandIcon } from "lucide-react";
import { getServerSession } from "next-auth/next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { forbidden, notFound, redirect } from "next/navigation";
import { Suspense } from "react";

async function StudyPage({ searchParams }: { searchParams: Promise<{ id: string }> }) {
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

  const t = await getTranslations("StudyPage.NewStudy");

  return (
    <div className="flex-1 hero-grid">
      <div className="w-2xl max-w-full mx-auto px-4 py-12 sm:py-40">
        <div className="w-full flex items-center justify-center gap-2 mb-8 text-2xl font-medium">
          <CommandIcon className="size-6" />
          <span>{t("startYourStudy")}</span>
        </div>
        <div className="w-full">
          <NewStudyInputBox />
        </div>
        <div className="mt-8 text-center text-sm">
          <Link
            href="/featured-studies"
            className="text-primary underline-offset-4 hover:underline"
          >
            {t("viewFeaturedStudies")}
          </Link>
          <span className="mx-2 text-muted-foreground">{t("or")}</span>
          <Link href="/studies" className="text-primary underline-offset-4 hover:underline">
            {t("viewMyProjects")}
          </Link>
        </div>
        <div className="mt-2 text-xs text-muted-foreground text-center">{t("newStudyHint")}</div>
      </div>
    </div>
  );
}

export default async function StudyPageWithLoading({
  searchParams,
}: {
  searchParams: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <StudyPage searchParams={searchParams} />
    </Suspense>
  );
}
