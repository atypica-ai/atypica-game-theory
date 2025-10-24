import { ToolName } from "@/ai/tools/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ExtractServerActionData } from "@/lib/serverAction";
import { truncateForTitle } from "@/lib/textUtils";
import { formatDistanceToNow } from "@/lib/utils";
import { FileType2Icon, Loader2Icon, MicIcon, PlayIcon, SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  fetchAnalystPodcastsCountOfStudyUserChat,
  fetchAnalystPodcastsOfStudyUserChat,
  fetchAnalystReportsCountOfStudyUserChat,
  fetchAnalystReportsOfStudyUserChat,
} from "../actions";
import { useStudyContext } from "../hooks/StudyContext";
import { AnalystReportShareButton } from "./AnalystReportShareButton";

// Badge component with auto-refresh logic for total artifact count
function ArtifactsCountBadge() {
  const { studyUserChat, lastToolInvocation } = useStudyContext();
  const [reportCount, setReportCount] = useState(0);
  const [podcastCount, setPodcastCount] = useState(0);

  const fetchCounts = useCallback(async () => {
    try {
      const [reportsResult, podcastsResult] = await Promise.all([
        fetchAnalystReportsCountOfStudyUserChat({
          studyUserChatToken: studyUserChat.token,
        }),
        fetchAnalystPodcastsCountOfStudyUserChat({
          studyUserChatToken: studyUserChat.token,
        }),
      ]);
      if (reportsResult.success) {
        setReportCount(reportsResult.data);
      }
      if (podcastsResult.success) {
        setPodcastCount(podcastsResult.data);
      }
    } catch (error) {
      console.log("Failed to fetch artifact counts:", error);
    }
  }, [studyUserChat.token]);

  // Initial fetch
  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Refresh when tool invocations complete
  useEffect(() => {
    if (
      lastToolInvocation?.type === `tool-${ToolName.generateReport}` &&
      lastToolInvocation.state === "output-available"
    ) {
      fetchCounts();
    }
  }, [fetchCounts, lastToolInvocation]);

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

export default function StudyArtifactsListPanel({
  children,
  studyUserChatToken,
  download = false,
}: {
  children?: React.ReactNode;
  studyUserChatToken: string;
  download?: boolean;
}) {
  const tReports = useTranslations("StudyPage.ReportsListPanel");
  const tPodcasts = useTranslations("StudyPage.PodcastsListPanel");
  const tArtifacts = useTranslations("StudyPage.ArtifactsListPanel");

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"reports" | "podcasts">("reports");

  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [isLoadingPodcasts, setIsLoadingPodcasts] = useState(false);

  const [reports, setReports] = useState<
    ExtractServerActionData<typeof fetchAnalystReportsOfStudyUserChat>
  >([]);
  const [podcasts, setPodcasts] = useState<
    ExtractServerActionData<typeof fetchAnalystPodcastsOfStudyUserChat>
  >([]);

  const fetchReports = useCallback(async () => {
    if (!studyUserChatToken) return;
    setIsLoadingReports(true);
    try {
      const result = await fetchAnalystReportsOfStudyUserChat({
        studyUserChatToken: studyUserChatToken,
      });
      if (result.success) {
        setReports(result.data);
      }
    } catch (error) {
      console.log("Failed to fetch reports:", error);
    } finally {
      setIsLoadingReports(false);
    }
  }, [studyUserChatToken]);

  const fetchPodcasts = useCallback(async () => {
    if (!studyUserChatToken) return;
    setIsLoadingPodcasts(true);
    try {
      const result = await fetchAnalystPodcastsOfStudyUserChat({
        studyUserChatToken: studyUserChatToken,
      });
      if (result.success) {
        setPodcasts(result.data);
      }
    } catch (error) {
      console.log("Failed to fetch podcasts:", error);
    } finally {
      setIsLoadingPodcasts(false);
    }
  }, [studyUserChatToken]);

  // Fetch data when popover opens
  useEffect(() => {
    if (isOpen) {
      fetchReports();
      fetchPodcasts();
    }
  }, [isOpen, fetchReports, fetchPodcasts]);

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
                {podcasts.map((podcast) => (
                  <div key={podcast.id}>
                    <div className="border border-input rounded-md p-3 flex items-center justify-between gap-2">
                      <div className="flex-1 text-xs line-clamp-2 mb-1">
                        {podcast.script
                          ? truncateForTitle(podcast.script, {
                              maxDisplayWidth: 60,
                              suffix: "...",
                            })
                          : "-"}
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/artifacts/podcast/${podcast.token}/share`} target="_blank">
                          <PlayIcon className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                    <div className="mt-1 ml-1 text-xs text-muted-foreground font-mono">
                      {formatDistanceToNow(podcast.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
