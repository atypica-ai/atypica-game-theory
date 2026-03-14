import { StudyToolName } from "@/app/(study)/tools/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { truncateForTitle } from "@/lib/textUtils";
import { formatDistanceToNow } from "@/lib/utils";
import { ChevronRightIcon, FileType2Icon, Loader2Icon, MicIcon, PlayIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useStudyContext } from "../hooks/StudyContext";
import { AnalystReportShareButton } from "./AnalystReportShareButton";

const ArtifactsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

export default function StudyArtifactsListPanel({
  download = false,
  popoverSide,
}: {
  download?: boolean;
  popoverSide?: "top" | "bottom";
}) {
  const tReports = useTranslations("StudyPage.ReportsListPanel");
  const tPodcasts = useTranslations("StudyPage.PodcastsListPanel");
  const tArtifacts = useTranslations("StudyPage.ArtifactsListPanel");

  const [isOpen, setIsOpen] = useState(false);

  const {
    artifacts: {
      refresh: refreshArtifacts,
      refreshCount: refreshArtifactsCount,
      reports,
      podcasts,
      isLoadingReports,
      isLoadingPodcasts,
      podcastCount,
      reportCount,
    },
    lastToolInvocation,
  } = useStudyContext();

  const totalCount = (reportCount ?? 0) + (podcastCount ?? 0);
  const prevPodcastCountRef = useRef<number | null>(null);

  useEffect(() => {
    refreshArtifactsCount();
  }, [refreshArtifactsCount]);

  useEffect(() => {
    if (
      lastToolInvocation?.type === `tool-${StudyToolName.generateReport}` &&
      lastToolInvocation.state === "output-available"
    ) {
      refreshArtifactsCount();
    }
  }, [refreshArtifactsCount, lastToolInvocation]);

  useEffect(() => {
    if (isOpen) refreshArtifacts();
  }, [isOpen, refreshArtifacts]);

  useEffect(() => {
    const prev = prevPodcastCountRef.current;
    if (prev !== null && podcastCount !== null && podcastCount > prev) {
      setIsOpen(true);
    }
    prevPodcastCountRef.current = podcastCount;
  }, [podcastCount]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 has-[>svg]:px-2 rounded-sm text-xs bg-background/80 backdrop-blur-sm"
        >
          <ArtifactsIcon />
          <span>{tArtifacts("title")}</span>
          {totalCount > 0 && <span className="font-medium text-foreground">{totalCount}</span>}
          <ChevronRightIcon className="size-3" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0 dark:bg-zinc-800" align="start" side={popoverSide}>
        <div className="max-h-80 overflow-y-auto scrollbar-thin">
          {/* Podcasts Section */}
          <div className="border-b border-border/50">
            <div className="px-3 py-2 flex items-center gap-2 bg-muted/30">
              <MicIcon className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">{tPodcasts("title")}</span>
              {(podcastCount ?? podcasts.length) > 0 && (
                <Badge variant="secondary" className="ml-auto h-4 px-1.5 text-[10px]">
                  {podcastCount ?? podcasts.length}
                </Badge>
              )}
            </div>
            {isLoadingPodcasts ? (
              <div className="p-6 flex justify-center">
                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : podcasts.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {tPodcasts("noPodcastsYet")}
              </div>
            ) : (
              <div className="p-3 grid grid-cols-1 gap-3">
                {podcasts.map((podcast) => {
                  const isGenerating = !podcast.generatedAt;
                  return (
                    <div key={podcast.id}>
                      <div
                        className={`border border-border/60 rounded-md p-3 flex items-center justify-between gap-2 ${isGenerating ? "opacity-60" : ""}`}
                      >
                        <div className="flex-1 text-xs">
                          {isGenerating ? (
                            <div className="text-muted-foreground italic">
                              {tPodcasts("generatingHint")}
                            </div>
                          ) : podcast.script ? (
                            <div className="line-clamp-2">
                              {truncateForTitle(podcast.extra.metadata?.title || podcast.script, {
                                maxDisplayWidth: 60,
                                suffix: "...",
                              })}
                            </div>
                          ) : (
                            "-"
                          )}
                        </div>
                        {isGenerating ? (
                          <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <Button asChild size="sm" variant="outline">
                            <Link
                              href={`/artifacts/podcast/${podcast.token}/share?utm_source=podcast&utm_medium=share`}
                              target="_blank"
                            >
                              <PlayIcon className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                      </div>
                      <div className="mt-1 ml-1 text-xs text-muted-foreground font-mono">
                        {formatDistanceToNow(podcast.createdAt)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reports Section */}
          <div>
            <div className="px-3 py-2 flex items-center gap-2 bg-muted/30">
              <FileType2Icon className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">{tReports("title")}</span>
              {(reportCount ?? reports.length) > 0 && (
                <Badge variant="secondary" className="ml-auto h-4 px-1.5 text-[10px]">
                  {reportCount ?? reports.length}
                </Badge>
              )}
            </div>
            {isLoadingReports ? (
              <div className="p-6 flex justify-center">
                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : reports.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {tReports("noReportsYet")}
              </div>
            ) : (
              <div className="p-3 grid grid-cols-2 gap-3">
                {reports.map((report) => (
                  <AnalystReportShareButton
                    reportToken={report.token}
                    key={report.id}
                    download={download}
                  >
                    <div>
                      <div className="relative w-full aspect-video cursor-pointer border border-border/60 rounded-md overflow-hidden transition-all hover:border-border bg-zinc-100 dark:bg-zinc-800">
                        {report.coverCdnHttpUrl ? (
                          <Image
                            src={report.coverCdnHttpUrl}
                            alt="Report cover"
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground" />
                        )}
                      </div>
                      <div className="mt-1 ml-1 font-mono text-xs text-muted-foreground">
                        {formatDistanceToNow(report.createdAt)}
                      </div>
                    </div>
                  </AnalystReportShareButton>
                ))}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
