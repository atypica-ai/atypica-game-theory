"use client";
import PodcastsListPanel from "@/app/(study)/study/components/PodcastsListPanel";
import ReportsListPanel from "@/app/(study)/study/components/ReportsListPanel";
import { ShareReplayButton } from "@/app/(study)/study/components/ShareReplayButton";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn, formatDate } from "@/lib/utils";
import { ArrowRight, FileTextIcon, MicIcon, PaperclipIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { fetchUserStudies } from "./actions";

type TStudy = ExtractServerActionData<typeof fetchUserStudies>[number];

export function StudyCard({ study: studyUserChat }: { study: TStudy }) {
  const t = useTranslations("StudyListPage");
  const locale = useLocale();

  const getStudyStatus = () => {
    if (studyUserChat.extra.runId) {
      return "backgroundRunning";
    } else if (studyUserChat.context.reportTokens?.length) {
      return "reportGenerated";
    } else {
      return "notCompleted";
    }
  };

  const status = getStudyStatus();
  // const hasStats =
  //   Boolean(studyUserChat.context.reportTokens?.length) ||
  //   Boolean(studyUserChat.context.podcastTokens?.length) ||
  //   Boolean(studyUserChat.context.attachments?.length);

  return (
    <div className="group relative border border-border rounded-lg hover:border-foreground/20 transition-all duration-300 flex flex-col">
      <Link href={`/study/${studyUserChat.token}`} className="flex p-4 flex-1 flex-col">
        {/* Title with avatar prefix */}
        <div className="flex items-center gap-2 mb-1">
          <HippyGhostAvatar seed={studyUserChat.id} className="size-8 shrink-0" />
          <div className="flex-1 text-sm font-medium leading-snug line-clamp-2 pr-6">
            {studyUserChat.title || t("noTopic")}
          </div>
        </div>

        {/* Date + status */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{formatDate(studyUserChat.updatedAt, locale)}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            {t(`status.${status}`)}
            <span
              className={cn("w-1.5 h-1.5 rounded-full", {
                "bg-amber-400 animate-pulse": status === "backgroundRunning",
                "bg-green-400": status === "reportGenerated",
                "bg-gray-300": status === "notCompleted",
              })}
            />
          </span>
        </div>

        {/* Topic */}
        <p className="text-xs text-muted-foreground/80 leading-relaxed line-clamp-3 mt-3 mb-3 flex-1">
          {studyUserChat.context.studyTopic || ""}
        </p>

        {/* Footer: stats + arrow on same line */}
        <div className="flex items-center pt-4 mt-auto border-t border-border/50 text-xs text-muted-foreground gap-3">
          {studyUserChat.context.reportTokens?.length ? (
            <ReportsListPanel studyUserChatToken={studyUserChat.token} download={true}>
              <span className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors">
                <FileTextIcon className="h-3 w-3" />
                {t("stats.reports", { count: studyUserChat.context.reportTokens.length })}
              </span>
            </ReportsListPanel>
          ) : null}
          {studyUserChat.context.podcastTokens?.length ? (
            <PodcastsListPanel studyUserChatToken={studyUserChat.token}>
              <span className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors">
                <MicIcon className="h-3 w-3" />
                {t("stats.podcasts", { count: studyUserChat.context.podcastTokens.length })}
              </span>
            </PodcastsListPanel>
          ) : null}
          {studyUserChat.context.attachments?.length ? (
            <span className="flex items-center gap-1">
              <PaperclipIcon className="h-3 w-3" />
              {t("stats.attachments", { count: studyUserChat.context.attachments.length })}
            </span>
          ) : null}
          <ArrowRight className="size-3.5 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all ml-auto shrink-0" />
        </div>
      </Link>

      {/* Share button — hover only, hide text to keep icon-only in card */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity [&_span]:hidden">
        <ShareReplayButton studyUserChat={studyUserChat} />
      </div>
    </div>
  );
}
