"use client";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDate } from "@/lib/utils";
import { CalendarDaysIcon, PaperclipIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { fetchUserStudies } from "./actions";

type TStudy = ExtractServerActionData<typeof fetchUserStudies>[number];

export function StudyCard({ study: { studyUserChat, analyst } }: { study: TStudy }) {
  const t = useTranslations("StudyListPage");
  const tRoot = useTranslations();
  const locale = useLocale();

  // Determine study status
  const getStudyStatus = () => {
    if (studyUserChat.backgroundToken) {
      return "backgroundRunning";
    } else if (analyst?.reports && analyst.reports.length > 0) {
      return "reportGenerated";
    } else {
      return "notCompleted";
    }
  };

  const status = getStudyStatus();

  return (
    <Card className="flex flex-col h-full transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-top">
        <HippyGhostAvatar seed={studyUserChat.id} className="size-8 mr-2 shrink-0" />
        <CardTitle className="text-base font-semibold line-clamp-2 leading-5 h-10">
          {studyUserChat.title}
        </CardTitle>
        <div className="shrink-0 ml-auto px-2 py-1 text-xs font-semibold">
          {(() => {
            switch (analyst?.kind) {
              case "testing":
                return <span>{tRoot("AnalystListPage.kinds.testing")}</span>;
              case "planning":
                return <span>{tRoot("AnalystListPage.kinds.planning")}</span>;
              case "insights":
                return <span>{tRoot("AnalystListPage.kinds.insights")}</span>;
              case "creation":
                return <span>{tRoot("AnalystListPage.kinds.creation")}</span>;
              case "productRnD":
                return <span>{tRoot("AnalystListPage.kinds.productRnD")}</span>;
              case "misc":
                return <span>{tRoot("AnalystListPage.kinds.misc")}</span>;
              default:
                return <span>N/A</span>;
            }
          })()}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="text-sm text-muted-foreground mb-3 line-clamp-3 leading-[1.25rem] h-[3.75rem]">
          {analyst?.topic || t("noTopic")}
        </div>
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center">
              <CalendarDaysIcon className="mr-1 h-4 w-4" />
              <div>{formatDate(studyUserChat.updatedAt, locale)}</div>
            </div>
            {analyst?.attachments && analyst.attachments.length > 0 && (
              <div className="flex items-center">
                <PaperclipIcon className="mr-1 h-4 w-4" />
                <div>{analyst.attachments.length}</div>
              </div>
            )}
          </div>
          <div className="flex items-center">
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                status === "backgroundRunning"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100"
                  : status === "reportGenerated"
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                    : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
              }`}
            >
              {t(`status.${status}`)}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" className="w-full">
          <Link href={`/study/${studyUserChat.token}`}>{t("viewStudy")}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
