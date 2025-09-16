import { TokenAlertDialog } from "@/components/TokenAlertDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDistanceToNow } from "@/lib/utils";
import { Analyst } from "@/prisma/client";
import { Loader2Icon, PlayIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { backgroundGeneratePodcast, fetchAnalystPodcasts } from "./actions";

type AnalystPodcast = ExtractServerActionData<typeof fetchAnalystPodcasts>[number];

export function AnalystPodcastsSection({
  analyst,
  podcasts,
  defaultPodcastSystem,
}: {
  analyst: Analyst;
  podcasts: AnalystPodcast[];
  defaultPodcastSystem: string;
}) {
  const t = useTranslations("AnalystPage");
  const router = useRouter();
  const [isPodcastDialogOpen, setIsPodcastDialogOpen] = useState<AnalystPodcast | null>(null);
  const [isPromptDialogOpen, setIsPromptDialogOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");

  const openPromptDialog = useCallback(() => {
    setSystemPrompt(defaultPodcastSystem);
    setIsPromptDialogOpen(true);
  }, [defaultPodcastSystem]);

  const generatePodcast = useCallback(async () => {
    try {
      await backgroundGeneratePodcast({
        analystId: analyst.id,
        systemPrompt,
      });
      router.refresh();
    } catch (error) {
      toast.error(`${error}`);
    }
  }, [analyst.id, router, systemPrompt]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="text-lg font-medium">Podcasts</div>
        <Button variant="default" size="sm" onClick={openPromptDialog}>
          Generate Podcast Script
        </Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {podcasts.map((podcast) => (
          <div
            key={podcast.id}
            className="w-full cursor-pointer"
            onClick={() => {
              if (!podcast.generatedAt) {
                setIsPodcastDialogOpen(podcast);
              } else {
                setIsPodcastDialogOpen(podcast);
              }
            }}
          >
            <div className="block w-full aspect-[2/1] cursor-pointer border border-input rounded-md overflow-hidden transition-all hover:border-primary/50 hover:shadow-sm bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 flex items-center justify-center">
              <div className="flex flex-col items-center justify-center text-center p-4">
                <PlayIcon className="size-8 mb-2 text-purple-600 dark:text-purple-400" />
                <div className="text-xs font-medium text-purple-800 dark:text-purple-200">
                  Podcast Script
                </div>
              </div>
            </div>
            <div className="mt-1 ml-1 font-mono text-xs text-muted-foreground flex items-center justify-between">
              <span>{formatDistanceToNow(podcast.createdAt)}</span>
              {!podcast.generatedAt && (
                <Loader2Icon className="size-4 animate-spin text-amber-500" />
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={!!isPodcastDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsPodcastDialogOpen(null);
          }
        }}
        modal
      >
        <DialogContent className="sm:max-w-[80vw]" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>
              {isPodcastDialogOpen?.generatedAt ? "Podcast Script" : "Generating podcast script"}
            </DialogTitle>
          </DialogHeader>
          {isPodcastDialogOpen && (
            <div className="h-[70vh]">
              {isPodcastDialogOpen.generatedAt ? (
                <div className="w-full h-full overflow-y-auto scrollbar-thin">
                  <div className="prose prose-sm max-w-none dark:prose-invert p-4">
                    <div className="whitespace-pre-wrap text-sm">
                      {isPodcastDialogOpen.script || "Script content not available"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Loader2Icon className="size-8 animate-spin mx-auto mb-4" />
                    <p>Generating podcast script...</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isPromptDialogOpen} onOpenChange={(open) => setIsPromptDialogOpen(open)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Customize Podcast Prompt</DialogTitle>
          </DialogHeader>
          <div className="py-4 overflow-hidden">
            <Textarea
              placeholder="Enter custom instructions for the podcast script generation. Leave blank to use default settings."
              className="min-h-[200px] max-h-[400px]"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Additional instructions will be passed to the AI when generating your podcast script. These
              will supplement the standard podcast template.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsPromptDialogOpen(false)}>
              Cancel
            </Button>
            <TokenAlertDialog
              value={100000}
              onConfirm={() => {
                generatePodcast();
                setIsPromptDialogOpen(false);
              }}
            >
              <Button variant="default">Generate Podcast Script</Button>
            </TokenAlertDialog>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 