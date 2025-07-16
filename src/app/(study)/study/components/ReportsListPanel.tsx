import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDistanceToNow } from "@/lib/utils";
import { ClipboardListIcon, FileType2Icon, Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { fetchAnalystReportsOfStudyUserChat } from "../actions";
import { useStudyContext } from "../hooks/StudyContext";
import { AnalystReportShareButton } from "./AnalystReportShareButton";

export default function ReportsListPanel() {
  const t = useTranslations("Components.ReportsListPanel");
  const { studyUserChat } = useStudyContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [reports, setReports] = useState<
    ExtractServerActionData<typeof fetchAnalystReportsOfStudyUserChat>
  >([]);

  const fetchReports = useCallback(() => {
    setIsLoading(true);
    fetchAnalystReportsOfStudyUserChat({
      studyUserChatToken: studyUserChat.token,
    })
      .then((result) => {
        if (!result.success) throw result;
        setReports(result.data);
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [studyUserChat.token]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) {
          fetchReports();
        }
      }}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <PopoverTrigger asChild>
              <div className="p-1 cursor-pointer rounded hover:bg-muted relative mr-1">
                <FileType2Icon className="size-5" />
                {reports.length > 0 && (
                  <Badge
                    variant="default"
                    className="absolute -top-2 -right-2 size-5 flex items-center justify-center text-xs font-bold font-mono rounded-full p-0 scale-75"
                  >
                    {reports.length}
                  </Badge>
                )}
              </div>
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
          <div className="p-6 flex items-center justify-center">
            <Loader2Icon className="size-4 animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {t("noReportsYet") || "No reports available yet"}
          </div>
        ) : (
          <div className="p-3 grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto scrollbar-thin">
            {reports.map((report) => (
              <AnalystReportShareButton reportToken={report.token} key={report.id}>
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
      </PopoverContent>
    </Popover>
  );
}
