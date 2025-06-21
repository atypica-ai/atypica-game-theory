"use client";
import { fetchStatsByStudyUserChatToken } from "@/app/(study)/study/actions";
import { useStudyContext } from "@/app/(study)/study/hooks/StudyContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDuration } from "@/lib/utils";
import { InfoIcon } from "lucide-react";
import { useEffect, useState } from "react";

type Stat = {
  dimension: string;
  total: number | null;
};

export function NerdStats() {
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState<Stat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);
  const { studyUserChat } = useStudyContext();

  useEffect(() => {
    if (!isOpen) return;
    if (lastFetchTime && Date.now() - lastFetchTime < 5000) return; // 5 seconds cooldown
    setIsLoading(true);
    fetchStatsByStudyUserChatToken(studyUserChat.token)
      .then((result) => {
        if (!result.success) {
          throw result;
        }
        setStats(result.data);
        setLastFetchTime(Date.now());
      })
      .catch((error) => {
        console.error("Failed to fetch chat statistics:", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [studyUserChat.token, isOpen, lastFetchTime]);

  // Helper function to get stat value by dimension
  const getStatValue = (dimension: string) => {
    const stat = stats.find((s) => s.dimension === dimension);
    return stat?.total ?? 0;
  };

  return (
    <div className="flex justify-end">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:bg-transparent hover:text-primary font-mono"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
          >
            <InfoIcon className="h-3 w-3 mr-1" />
            Nerd Stats
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[22rem] sm:w-[40rem] p-0 border-none bg-transparent shadow-none"
          align="center"
          sideOffset={0}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading stats...</div>
            ) : (
              <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl sm:rounded-3xl border border-input overflow-hidden">
                {/* Header */}
                <div className="px-3 tracking-tighter sm:px-6 sm:tracking-normal py-4 border-b border-input flex items-center">
                  <div className="text-xs sm:text-xl font-mono space-x-2">
                    <span>💻</span>
                    <span>atypica.AI</span>
                    <span className="text-foreground/80">&lt;creative reasoning α&gt;</span>
                    <span>queries</span>
                  </div>
                </div>
                {/* Stats Header */}
                <div className="text-xs sm:text-base text-foreground/70  grid grid-cols-4 border-b border-input border-dashed font-mono">
                  <div className="py-3 px-3 sm:px-6 text-center border-r border-input border-dashed">
                    time
                  </div>
                  <div className="py-3 px-3 sm:px-6 text-center border-r border-input border-dashed">
                    steps
                  </div>
                  <div className="py-3 px-3 sm:px-6 text-center border-r border-input border-dashed">
                    agents
                  </div>
                  <div className="py-3 px-3 sm:px-6 text-center border-r border-input">tokens</div>
                </div>

                {/* Stats Values */}
                <div className="text-xs  sm:text-xl font-mono text-primary grid grid-cols-4 bg-zinc-100 dark:bg-[#85CFF6]/5 border-b border-input">
                  <div className="py-3 px-3 sm:py-6 sm:px-6 text-center border-r border-input border-dashed">
                    {formatDuration(getStatValue("duration"))}
                  </div>
                  <div className="py-3 px-0 sm:py-6 sm:px-6 text-center border-r border-input border-dashed">
                    {getStatValue("steps")}
                  </div>
                  <div className="py-3 px-3 sm:py-6 sm:px-6 text-center border-r border-input border-dashed">
                    {getStatValue("personas") + 3 /* personas + expert agents */}
                  </div>
                  <div className="py-3 px-0 sm:py-6 sm:px-6 tracking-tighter text-center border-r border-input">
                    {getStatValue("tokens").toLocaleString()}
                  </div>
                </div>

                {/* Footer */}
                <div className="text-xs sm:text-sm px-3 sm:px-6 py-3 text-zinc-600 dark:text-[#85CFF6] font-medium text-right">
                  BMRLab
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
