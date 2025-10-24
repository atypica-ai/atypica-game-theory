import { ToolName } from "@/ai/tools/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { truncateForTitle } from "@/lib/textUtils";
import { formatDistanceToNow } from "@/lib/utils";
import { FileType2Icon, Loader2Icon, MicIcon, PlayIcon, SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useStudyContext } from "../hooks/StudyContext";
import { AnalystReportShareButton } from "./AnalystReportShareButton";

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

  const totalCount = reportCount + podcastCount;
  if (totalCount === 0) return null;

  return (
    <Badge
      variant="default"
      className="absolute -top-2 -right-2 size-5 flex items-center justify-center text-xs font-bold font-mono rounded-full p-0 scale-75"
    >
      {totalCount}
    </Badge>
  );
}

/**
 * 和 ReportsListPanel 和 PodcastsListPanel 不同的是，这个组件使用 StudyContext 来存出数据
 */
export default function StudyArtifactsListPanel({
  children,
  download = false,
}: {
  children?: React.ReactNode;
  download?: boolean;
}) {
  const tReports = useTranslations("StudyPage.ReportsListPanel");
  const tPodcasts = useTranslations("StudyPage.PodcastsListPanel");
  const tArtifacts = useTranslations("StudyPage.ArtifactsListPanel");

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"reports" | "podcasts">("reports");

  const {
    artifacts: {
      refresh: refreshArtifacts,
      reports,
      podcasts,
      isLoadingReports,
      isLoadingPodcasts,
      podcastCount,
    },
  } = useStudyContext();

  // Track previous podcast count to detect new podcasts
  const prevPodcastCountRef = useRef<number>(podcastCount);

  // Fetch data when popover opens
  useEffect(() => {
    if (isOpen) {
      refreshArtifacts();
    }
  }, [isOpen, refreshArtifacts]);

  // Auto-open panel and switch to podcasts tab when new podcast is detected
  useEffect(() => {
    const prevCount = prevPodcastCountRef.current;
    const currentCount = podcastCount;
    // Check if podcast count increased (new podcast added)
    if (prevCount > 0 && currentCount > prevCount) {
      setIsOpen(true);
      setActiveTab("podcasts");
    }
    // Update ref for next comparison
    prevPodcastCountRef.current = currentCount;
  }, [podcastCount]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <PopoverTrigger asChild>
              {children || (
                <div className="p-1 cursor-pointer rounded hover:bg-muted relative mr-1">
                  <SparklesIcon className="size-5" />
                  <ArtifactsCountBadge />
                </div>
              )}
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>{tArtifacts("title")}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent className="w-80 p-0 dark:bg-zinc-800" align="center">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "reports" | "podcasts")}>
          <div className="flex items-center gap-2 p-3 border-b border-border/50">
            <SparklesIcon className="size-4 text-muted-foreground" />
            <div className="text-sm font-medium">{tArtifacts("title")}</div>
          </div>
          <TabsList className="w-full grid grid-cols-2 rounded-none border-b">
            <TabsTrigger value="reports" className="gap-1.5">
              <FileType2Icon className="size-3.5" />
              <span>{tReports("title")}</span>
              {reports.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {reports.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="podcasts" className="gap-1.5">
              <MicIcon className="size-3.5" />
              <span>{tPodcasts("title")}</span>
              {podcasts.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {podcasts.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="m-0">
            {isLoadingReports ? (
              <div className="p-6 flex justify-center">
                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : reports.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {tReports("noReportsYet")}
              </div>
            ) : (
              <div className="p-3 grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto scrollbar-thin">
                {reports.map((report) => (
                  <AnalystReportShareButton
                    reportToken={report.token}
                    key={report.id}
                    download={download}
                  >
                    <div>
                      <div
                        className="block w-full aspect-[2/1] cursor-pointer border border-input rounded-md overflow-hidden transition-all hover:border-primary/50 hover:shadow-sm bg-accent/10 [&>svg]:w-full [&>svg]:h-full"
                        dangerouslySetInnerHTML={{ __html: report.coverSvg }}
                      ></div>
                      <div className="mt-1 ml-1 font-mono text-xs text-muted-foreground">
                        {formatDistanceToNow(report.createdAt)}
                      </div>
                    </div>
                  </AnalystReportShareButton>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="podcasts" className="m-0">
            {isLoadingPodcasts ? (
              <div className="p-6 flex justify-center">
                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : podcasts.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {tPodcasts("noPodcastsYet")}
              </div>
            ) : (
              <div className="p-3 grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto scrollbar-thin">
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
                              {truncateForTitle(podcast.script, {
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
                              href={`/artifacts/podcast/${podcast.token}/share`}
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
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
