import { ToolName } from "@/ai/tools/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ExtractServerActionData } from "@/lib/serverAction";
import { truncateForTitle } from "@/lib/textUtils";
import { formatDistanceToNow } from "@/lib/utils";
import { Loader2Icon, MicIcon, PlayIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  fetchAnalystPodcastsCountOfStudyUserChat,
  fetchAnalystPodcastsOfStudyUserChat,
} from "../actions";
import { useStudyContext } from "../hooks/StudyContext";

// Badge component with auto-refresh logic for podcast count
function PodcastsCountBadge() {
  const { studyUserChat, lastToolInvocation } = useStudyContext();
  const [podcastCount, setPodcastCount] = useState(0);

  const fetchPodcastCount = useCallback(async () => {
    try {
      const result = await fetchAnalystPodcastsCountOfStudyUserChat({
        studyUserChatToken: studyUserChat.token,
      });
      if (result.success) {
        setPodcastCount(result.data);
      }
    } catch (error) {
      console.log("Failed to fetch podcast count:", error);
    }
  }, [studyUserChat.token]);

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchPodcastCount();
  }, [fetchPodcastCount]);

  // Refresh when tool invocations complete
  useEffect(() => {
    if (
      lastToolInvocation?.type === `tool-${ToolName.generateReport}` &&
      lastToolInvocation.state === "output-available"
    ) {
      fetchPodcastCount();
    }
  }, [fetchPodcastCount, lastToolInvocation]);

  if (podcastCount === 0) return null;

  return (
    <Badge
      variant="default"
      className="absolute -top-2 -right-2 size-5 flex items-center justify-center text-xs font-bold font-mono rounded-full p-0 scale-75"
    >
      {podcastCount}
    </Badge>
  );
}

export default function PodcastsListPanel({
  children,
  studyUserChatToken,
}: {
  children?: React.ReactNode;
  studyUserChatToken?: string;
}) {
  const t = useTranslations("StudyPage.PodcastsListPanel");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [podcasts, setPodcasts] = useState<
    ExtractServerActionData<typeof fetchAnalystPodcastsOfStudyUserChat>
  >([]);

  const fetchPodcasts = useCallback(async () => {
    if (!studyUserChatToken) return;
    setIsLoading(true);
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
      setIsLoading(false);
    }
  }, [studyUserChatToken]);

  // Only fetch when popover opens
  useEffect(() => {
    if (isOpen) {
      fetchPodcasts();
    }
  }, [isOpen, fetchPodcasts]);

  if (!studyUserChatToken) {
    // If no token provided, we can't show anything meaningful
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <PopoverTrigger asChild>
              {children || (
                <div className="p-1 cursor-pointer rounded hover:bg-muted relative mr-1">
                  <MicIcon className="size-5" />
                  <PodcastsCountBadge />
                </div>
              )}
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>{t("title")}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent className="w-80 p-0 dark:bg-zinc-800" align="center">
        <div className="flex items-center gap-2 p-3 border-b border-border/50">
          <MicIcon className="size-4 text-muted-foreground" />
          <div className="text-sm font-medium">{t("title")}</div>
        </div>
        {isLoading ? (
          <div className="p-6 flex justify-center">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : podcasts.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">{t("noPodcastsYet")}</div>
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
                    <div className="flex-1 text-xs line-clamp-2 mb-1">
                      {isGenerating ? (
                        <span className="text-muted-foreground italic">{t("generating")}</span>
                      ) : podcast.script ? (
                        truncateForTitle(podcast.script, {
                          maxDisplayWidth: 60,
                          suffix: "...",
                        })
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
      </PopoverContent>
    </Popover>
  );
}
