"use client";
import PodcastsListPanel from "@/app/(study)/study/components/PodcastsListPanel";
import ReportsListPanel from "@/app/(study)/study/components/ReportsListPanel";
import { ShareReplayButton } from "@/app/(study)/study/components/ShareReplayButton";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn, formatDate } from "@/lib/utils";
import { CalendarDaysIcon, FileTextIcon, MicIcon, PaperclipIcon, PlayIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { fetchUserStudies } from "./actions";

type TStudy = ExtractServerActionData<typeof fetchUserStudies>[number];

export function StudyCard({ study: studyUserChat }: { study: TStudy }) {
  const t = useTranslations("StudyListPage");
  const locale = useLocale();

  // Determine study status
  const getStudyStatus = () => {
    // TODO: 之后需要优化，不应该直接访问 runId
    if (studyUserChat.extra.runId) {
      return "backgroundRunning";
    } else if (studyUserChat.context.reportTokens?.length) {
      return "reportGenerated";
    } else {
      return "notCompleted";
    }
  };

  const status = getStudyStatus();
  const hasStats =
    Boolean(studyUserChat.context.reportTokens?.length) ||
    Boolean(studyUserChat.context.podcastTokens?.length) ||
    Boolean(studyUserChat.context.attachments?.length);

  return (
    <Card className="flex flex-col h-full border border-zinc-200 dark:border-zinc-700 shadow-sm bg-linear-to-br from-white to-zinc-50/50 dark:from-zinc-800 dark:to-zinc-700/50">
      <CardHeader>
        {/* Header with avatar and meta info */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <HippyGhostAvatar
              seed={studyUserChat.id}
              className="size-10 ring-2 ring-zinc-100 dark:ring-zinc-800"
            />
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDaysIcon className="h-3.5 w-3.5" />
                <span>{formatDate(studyUserChat.updatedAt, locale)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>{t(`status.${status}`)}</span>
                <div
                  className={cn("w-2 h-2 rounded-full", {
                    "bg-amber-400 animate-pulse": status === "backgroundRunning",
                    "bg-green-400": status === "reportGenerated",
                    "bg-gray-300": status === "notCompleted",
                  })}
                />
              </div>
            </div>
          </div>

          {/* Share button */}
          <ShareReplayButton studyUserChat={studyUserChat}></ShareReplayButton>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {/* Title */}
        <h3 className="text-lg font-semibold line-clamp-2 leading-6 text-zinc-900 dark:text-zinc-100">
          {studyUserChat.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-4 line-clamp-3 leading-relaxed">
          {studyUserChat.context.studyTopic || t("noTopic")}
        </p>

        {/* Stats section */}
        {hasStats && (
          <div className="p-3 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg flex items-center justify-start gap-4">
            {studyUserChat.context.reportTokens?.length ? (
              <ReportsListPanel studyUserChatToken={studyUserChat.token} download={true}>
                <div className="flex items-center gap-1.5 text-sm cursor-pointer ">
                  <FileTextIcon className="h-4 w-4" />
                  <span className="font-medium">
                    {t("stats.reports", { count: studyUserChat.context.reportTokens.length })}
                  </span>
                </div>
              </ReportsListPanel>
            ) : null}
            {studyUserChat.context.podcastTokens?.length ? (
              <PodcastsListPanel studyUserChatToken={studyUserChat.token}>
                <div className="flex items-center gap-1.5 text-sm text-violet-600 dark:text-violet-400 cursor-pointer">
                  <MicIcon className="h-4 w-4" />
                  <span className="font-medium">
                    {t("stats.podcasts", { count: studyUserChat.context.podcastTokens.length })}
                  </span>
                </div>
              </PodcastsListPanel>
            ) : null}
            {studyUserChat.context.attachments?.length ? (
              <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                <PaperclipIcon className="h-3.5 w-3.5" />
                <span>
                  {t("stats.attachments", { count: studyUserChat.context.attachments.length })}
                </span>
              </div>
            ) : null}
          </div>
        )}
        {/*{analyst?.attachments && analyst.attachments.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <PaperclipIcon className="h-3.5 w-3.5" />
            <span>{t("stats.attachments", { count: analyst.attachments.length })}</span>
          </div>
        )}*/}
      </CardContent>

      <CardFooter className="pt-0">
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link prefetch={true} href={`/study/${studyUserChat.token}`}>
            <PlayIcon className="size-4" />
            {t("viewStudy")}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
