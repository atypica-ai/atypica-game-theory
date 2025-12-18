import { ToolName } from "@/ai/tools/types";
import {
  fetchAnalystReportsCountOfStudyUserChat,
  fetchAnalystReportsOfStudyUserChat,
} from "@/app/(study)/study/actions";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDistanceToNow } from "@/lib/utils";
import { ClipboardListIcon, FileType2Icon, Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useStudyContext } from "../hooks/StudyContext";
import { AnalystReportShareButton } from "./AnalystReportShareButton";

// Badge component with auto-refresh logic for report count
function ReportsCountBadge() {
  const { studyUserChat, lastToolInvocation } = useStudyContext();
  const [reportCount, setReportCount] = useState(0);

  const fetchReportCount = useCallback(async () => {
    try {
      const result = await fetchAnalystReportsCountOfStudyUserChat({
        studyUserChatToken: studyUserChat.token,
      });
      if (result.success) {
        setReportCount(result.data);
      }
    } catch (error) {
      console.log("Failed to fetch report count:", error);
    }
  }, [studyUserChat.token]);

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchReportCount();
  }, [fetchReportCount]);

  // Refresh when tool invocations complete
  useEffect(() => {
    if (
      lastToolInvocation?.type === `tool-${ToolName.generateReport}` &&
      lastToolInvocation.state === "output-available"
    ) {
      fetchReportCount();
    }
  }, [fetchReportCount, lastToolInvocation]);

  if (reportCount === 0) return null;

  return (
    <Badge
      variant="default"
      className="absolute -top-2 -right-2 size-5 flex items-center justify-center text-xs font-bold font-mono rounded-full p-0 scale-75"
    >
      {reportCount}
    </Badge>
  );
}

export default function ReportsListPanel({
  children,
  studyUserChatToken,
  download = false,
}: {
  children?: React.ReactNode;
  studyUserChatToken: string;
  download: boolean;
}) {
  const t = useTranslations("StudyPage.ReportsListPanel");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [reports, setReports] = useState<
    ExtractServerActionData<typeof fetchAnalystReportsOfStudyUserChat>
  >([]);

  const fetchReports = useCallback(async () => {
    if (!studyUserChatToken) return;
    setIsLoading(true);
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
      setIsLoading(false);
    }
  }, [studyUserChatToken]);

  // Only fetch when popover opens
  useEffect(() => {
    if (isOpen) {
      fetchReports();
    }
  }, [isOpen, fetchReports]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <PopoverTrigger asChild>
              {children || (
                <div className="p-1 cursor-pointer rounded hover:bg-muted relative mr-1">
                  <FileType2Icon className="size-5" />
                  <ReportsCountBadge />
                </div>
              )}
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>{t("title")}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent className="w-80 p-0 dark:bg-zinc-800" align="center">
        <div className="flex items-center gap-2 p-3 border-b border-border/50">
          <ClipboardListIcon className="size-4 text-muted-foreground" />
          <div className="text-sm font-medium">{t("title")}</div>
        </div>
        {isLoading ? (
          <div className="p-6 flex justify-center">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : reports.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">{t("noReportsYet")}</div>
        ) : (
          <div className="p-3 grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto scrollbar-thin">
            {reports.map((report) => (
              <AnalystReportShareButton
                reportToken={report.token}
                key={report.id}
                download={download}
              >
                <div>
                  <div className="relative w-full aspect-video cursor-pointer border border-input rounded-md overflow-hidden transition-all hover:border-primary/50 hover:shadow-sm bg-accent/10">
                    {report.coverCdnHttpUrl ? (
                      <Image
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
      </PopoverContent>
    </Popover>
  );
}
