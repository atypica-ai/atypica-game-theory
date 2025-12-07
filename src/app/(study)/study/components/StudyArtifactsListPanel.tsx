import { ToolName } from "@/ai/tools/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { truncateForTitle } from "@/lib/textUtils";
import { formatDistanceToNow } from "@/lib/utils";
import { FileType2Icon, Loader2Icon, MicIcon, PlayIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useStudyContext } from "../hooks/StudyContext";
import { AnalystReportShareButton } from "./AnalystReportShareButton";

// Custom Artifacts Icon
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

// Badge component with auto-refresh logic for total artifact count
function ArtifactsCountBadge() {
  const {
    artifacts: { refreshCount: refreshArtifactsCount, reportCount, podcastCount },
    lastToolInvocation,
  } = useStudyContext();

  // Initial fetch
  useEffect(() => {
    refreshArtifactsCount();
  }, [refreshArtifactsCount]);

  // Refresh when tool invocations complete
  useEffect(() => {
    if (
      lastToolInvocation?.type === `tool-${ToolName.generateReport}` &&
      lastToolInvocation.state === "output-available"
    ) {
      refreshArtifactsCount();
    }
  }, [refreshArtifactsCount, lastToolInvocation]);

  const totalCount = (reportCount ?? 0) + (podcastCount ?? 0);
  if (totalCount === 0) return null;

  return (
    <Badge
      variant="default"
      className="absolute -top-2 -left-2 size-5 flex items-center justify-center text-xs font-bold font-mono rounded-full p-0 scale-75"
    >
      {totalCount}
    </Badge>
  );
}

/**
 * 和 ReportsListPanel 和 PodcastsListPanel 不同的是，这个组件使用 StudyContext 来存出数据
 */
export default function StudyArtifactsListPanel({ download = false }: { download?: boolean }) {
  const tReports = useTranslations("StudyPage.ReportsListPanel");
  const tPodcasts = useTranslations("StudyPage.PodcastsListPanel");
  const tArtifacts = useTranslations("StudyPage.ArtifactsListPanel");

  const [isOpen, setIsOpen] = useState(false);

  const {
    artifacts: {
      refresh: refreshArtifacts,
      reports,
      podcasts,
      isLoadingReports,
      isLoadingPodcasts,
      podcastCount,
      reportCount,
    },
  } = useStudyContext();

  // Track previous podcast count to detect new podcasts
  const prevPodcastCountRef = useRef<number | null>(null);

  // Fetch data when popover opens
  useEffect(() => {
    if (isOpen) {
      refreshArtifacts();
    }
  }, [isOpen, refreshArtifacts]);

  // Auto-open panel when new podcast is detected
  useEffect(() => {
    const prevCount = prevPodcastCountRef.current;
    const currentCount = podcastCount;
    // Check if podcast count increased (new podcast added)
    if (prevCount !== null && currentCount !== null && currentCount > prevCount) {
      setIsOpen(true);
    }
    // Update ref for next comparison
    prevPodcastCountRef.current = currentCount;
  }, [podcastCount]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 gap-1.5 relative hover:bg-transparent hover:text-primary"
        >
          <ArtifactsIcon className="shrink-0 size-4" />
          <span className="text-xs max-sm:hidden whitespace-nowrap">{tArtifacts("title")}</span>
          <ArtifactsCountBadge />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0 dark:bg-zinc-800" align="center">
        {/*
        <div className="flex items-center gap-2 p-3 border-b border-border/50">
          <SparklesIcon className="size-4 text-muted-foreground" />
          <div className="text-sm font-medium">{tArtifacts("title")}</div>
        </div>
        */}
        <div className="max-h-80 overflow-y-auto scrollbar-thin">
          {/* Podcasts Section */}
          <div className="border-b border-border/50">
            <div className="px-3 py-2 flex items-center gap-2 bg-muted/30">
              <MicIcon className="size-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">{tPodcasts("title")}</span>
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
                        className={`border border-input rounded-md p-3 flex items-center justify-between gap-2 ${
                          isGenerating ? "opacity-60" : ""
                        }`}
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
              <span className="text-sm font-medium">{tReports("title")}</span>
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
                      <div className="relative w-full aspect-[16/9] cursor-pointer border border-input rounded-md overflow-hidden transition-all hover:border-primary/50 hover:shadow-sm bg-accent/10">
                        {report.coverCdnHttpUrl ? (
                          <Image
                            loader={({ src }) => src}
                            src={report.coverCdnHttpUrl}
                            alt="Report cover"
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground"></div>
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
