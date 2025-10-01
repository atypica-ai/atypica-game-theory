import { extractInterviewTranscript, InterviewTranscript } from "@/app/(interviewProject)/lib";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { VALID_LOCALES } from "@/i18n/routing";
import { formatDate } from "@/lib/utils";
import { prisma } from "@/prisma/prisma";
import { Locale } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

async function getTranscriptData(userChatToken: string): Promise<{
  transcript: InterviewTranscript;
  sessionInfo: {
    title: string | null;
    createdAt: Date;
    projectBrief: string;
    intervieweeUser: { name: string; email: string | null } | null;
    intervieweePersona: { name: string } | null;
  };
}> {
  // Find the UserChat and related InterviewSession
  const userChat = await prisma.userChat.findUnique({
    where: {
      token: userChatToken,
      kind: "interviewSession",
    },
    select: {
      id: true,
      interviewSession: {
        select: {
          id: true,
          title: true,
          createdAt: true,
          project: {
            select: {
              brief: true,
            },
          },
          intervieweeUser: {
            select: {
              name: true,
              email: true,
            },
          },
          intervieweePersona: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!userChat?.interviewSession) {
    notFound();
  }

  const session = userChat.interviewSession;

  // Extract transcript data
  const transcript = await extractInterviewTranscript(userChat.id);

  return {
    transcript,
    sessionInfo: {
      title: session.title,
      createdAt: session.createdAt,
      projectBrief: session.project.brief,
      intervieweeUser: session.intervieweeUser,
      intervieweePersona: session.intervieweePersona,
    },
  };
}

async function InterviewTranscriptPage({
  userChatToken,
  localeParam,
}: {
  userChatToken: string;
  localeParam?: string;
}) {
  const locale: Locale =
    localeParam && VALID_LOCALES.includes(localeParam as Locale)
      ? (localeParam as Locale)
      : await getLocale();

  const t = await getTranslations({
    namespace: "InterviewProject.transcriptDisplay",
    locale,
  });

  const { transcript, sessionInfo } = await getTranscriptData(userChatToken);
  const { title, summary, participantInfo, messages } = transcript;

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-8 py-8">
      {/* Document Header */}
      <div className="text-center mb-12">
        <h1 className="text-2xl font-bold text-foreground/90 mb-4">{title}</h1>
        <div className="text-sm text-gray-600 space-y-1">
          <p>{formatDate(sessionInfo.createdAt, locale)}</p>
          <p>
            {sessionInfo.intervieweePersona
              ? `${sessionInfo.intervieweePersona.name}（${t("aiSimulated")}）`
              : sessionInfo.intervieweeUser?.name || t("unknown")}
          </p>
        </div>
      </div>

      {/* Research Objective */}
      {/*<section className="mb-8">
        <h2 className="text-xl font-semibold text-foreground/90 mb-3 pb-1 border-b border-gray-300">
          {t("researchObjective")}
        </h2>
        <div className="text-foreground/80 text-sm">
          <Markdown>{sessionInfo.projectBrief}</Markdown>
        </div>
      </section>*/}

      {/* Participant Information */}
      {participantInfo && Object.keys(participantInfo).length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-foreground/80 mb-3 pb-1 border-b border-border">
            {t("intervieweeInfo")}
          </h2>
          <div className="space-y-2 text-foreground/80">
            {Object.entries(participantInfo).map(([label, value]) => (
              <p key={label} className="text-foreground/80">
                <span>{label}：</span>
                {String(value)}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* Interview Content */}
      {messages.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-foreground/90 mb-3 pb-1 border-b border-border">
            {t("interviewContent")}
          </h2>
          {messages
            .filter((message) => !/\[READY\]|\[CONTINUE\]|\[USER_HESITATED\]/.test(message.content))
            .map((message, index) => (
              <div key={index} className="leading-relaxed text-sm">
                {message.role === "assistant" ? (
                  <div className="mb-2">
                    <strong className="font-bold">{t("interviewer")}</strong>
                    <strong className="font-bold ml-1">{message.content}</strong>
                  </div>
                ) : (
                  <div className="text-foreground/80 mb-8">
                    <span>{t("interviewee")}</span>
                    <span className="ml-1">{message.content}</span>
                  </div>
                )}
              </div>
            ))}
        </section>
      )}

      {/* Summary */}
      {summary && (
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-foreground/90 mb-3 pb-1 border-b border-border">
            {t("interviewSummary")}
          </h2>
          <p className="text-foreground/80 whitespace-pre-wrap leading-relaxed text-sm">
            {summary}
          </p>
        </section>
      )}

      {/* Document Footer */}
      <div className="mt-12 pt-6 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-500">
          {t("generatedNote")} {new Date().toLocaleDateString(locale)}
        </p>
      </div>
    </div>
  );
}

export default async function InterviewTranscriptPageWithLoading({
  params,
  searchParams,
}: {
  params: Promise<{ userChatToken: string }>;
  searchParams: Promise<{ locale?: string }>;
}) {
  const { userChatToken } = await params;
  const { locale: localeParam } = await searchParams;
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <InterviewTranscriptPage userChatToken={userChatToken} localeParam={localeParam} />
    </Suspense>
  );
}
