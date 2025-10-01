import {
  fetchAnalystPodcasts,
  generatePodcastAction,
  getPodcastSignedUrl,
} from "@/app/(podcast)/actions";
import { TokenAlertDialog } from "@/components/TokenAlertDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDistanceToNow } from "@/lib/utils";
import { Analyst } from "@/prisma/client";
import { DownloadIcon, Loader2Icon, PauseIcon, PlayIcon, Volume2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type AnalystPodcast = ExtractServerActionData<typeof fetchAnalystPodcasts>[number];

export function AnalystPodcastsSection({
  analyst,
  podcasts: initialPodcasts,
  defaultPodcastSystem,
}: {
  analyst: Analyst;
  podcasts: AnalystPodcast[];
  defaultPodcastSystem: string;
}) {
  const router = useRouter();
  const [isPodcastDialogOpen, setIsPodcastDialogOpen] = useState<{
    analystPodcast: AnalystPodcast;
  } | null>(null);
  const [isPromptDialogOpen, setIsPromptDialogOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [podcasts, setPodcasts] = useState<AnalystPodcast[]>(initialPodcasts);
  const [downloadUrls, setDownloadUrls] = useState<Record<string, string>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const openPromptDialog = useCallback(() => {
    setSystemPrompt(defaultPodcastSystem);
    setIsPromptDialogOpen(true);
  }, [defaultPodcastSystem]);

  const generatePodcast = useCallback(async () => {
    try {
      await generatePodcastAction({
        analystId: analyst.id,
        systemPrompt,
      });

      // Start polling to track progress
      setIsPolling(true);
      router.refresh();
    } catch (error) {
      toast.error(`${error}`);
    }
  }, [analyst.id, router, systemPrompt]);

  const playAudio = useCallback(
    async (podcastToken: string) => {
      if (playingAudio === podcastToken) {
        // Stop current audio
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        setPlayingAudio(null);
        return;
      }

      try {
        // Get signed URL for the podcast
        const result = await getPodcastSignedUrl({ podcastToken });
        if (!result.success || !result.data) {
          toast.error("Failed to get audio URL");
          return;
        }

        // Stop any currently playing audio
        if (audioRef.current) {
          audioRef.current.pause();
        }

        // Create new audio element
        const audio = new Audio(result.data);
        audioRef.current = audio;

        audio.addEventListener("ended", () => {
          setPlayingAudio(null);
        });

        audio.addEventListener("error", () => {
          toast.error("Failed to play audio");
          setPlayingAudio(null);
        });

        audio
          .play()
          .then(() => {
            setPlayingAudio(podcastToken);
          })
          .catch(() => {
            toast.error("Failed to play audio");
            setPlayingAudio(null);
          });
      } catch (error) {
        toast.error("Failed to play audio");
        console.error("Play audio error:", error);
      }
    },
    [playingAudio],
  );

  const getDownloadUrl = useCallback(
    async (podcastToken: string) => {
      // Return cached URL if available
      if (downloadUrls[podcastToken]) {
        return downloadUrls[podcastToken];
      }

      try {
        const result = await getPodcastSignedUrl({ podcastToken });
        if (result.success && result.data) {
          setDownloadUrls((prev) => ({ ...prev, [podcastToken]: result.data! }));
          return result.data;
        }
        return null;
      } catch (error) {
        console.error("Get download URL error:", error);
        return null;
      }
    },
    [downloadUrls],
  );

  // Polling effect for podcast generation status (script + audio)
  useEffect(() => {
    if (!isPolling) return;

    const pollInterval = setInterval(async () => {
      try {
        // Refresh the page to check for updates
        router.refresh();

        // Check for any podcasts that are still being generated
        const updatedPodcasts = await fetchAnalystPodcasts({ analystId: analyst.id });
        if (updatedPodcasts.success) {
          // Check if any podcast is still processing
          const stillProcessing = updatedPodcasts.data.some((podcast) => {
            return !!podcast.extra?.processing;
          });

          // If no podcasts are processing, stop polling
          if (!stillProcessing) {
            setIsPolling(false);
            toast.success("Podcast generation completed!");
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
        // Stop polling on error to prevent infinite retries
        setIsPolling(false);
        toast.error("Failed to check generation status");
      }
    }, 3000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [isPolling, analyst.id, router]);

  // Update local state when initial podcasts change
  useEffect(() => {
    setPodcasts(initialPodcasts);
  }, [initialPodcasts]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

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
            className="cursor-pointer"
            onClick={() => setIsPodcastDialogOpen({ analystPodcast: podcast })}
          >
            <div className="aspect-[2/1] border border-input rounded-md overflow-hidden transition-all hover:border-primary/50 hover:shadow-sm bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 flex flex-col items-center justify-center text-center p-4">
              {podcast.objectUrl ? (
                <Volume2Icon className="size-8 mb-2 text-green-600 dark:text-green-400" />
              ) : (
                <PlayIcon className="size-8 mb-2 text-purple-600 dark:text-purple-400" />
              )}
              <div className="text-xs font-medium text-purple-800 dark:text-purple-200">
                {podcast.objectUrl ? "Podcast Audio" : "Podcast Script"}
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
              {isPodcastDialogOpen?.analystPodcast.generatedAt
                ? "Podcast Script"
                : "Generating podcast script"}
            </DialogTitle>
          </DialogHeader>
          {isPodcastDialogOpen && (
            <div className="h-[70vh]">
              {isPodcastDialogOpen.analystPodcast.generatedAt ? (
                <div className="w-full h-full flex flex-col">
                  {/* Audio controls section */}
                  {isPodcastDialogOpen.analystPodcast.script && (
                    <div className="border-b p-4 bg-muted/30 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {isPodcastDialogOpen.analystPodcast.objectUrl ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => playAudio(isPodcastDialogOpen.analystPodcast.token)}
                              disabled={!!isPodcastDialogOpen.analystPodcast.extra?.processing}
                            >
                              {playingAudio === isPodcastDialogOpen.analystPodcast.token ? (
                                <>
                                  <PauseIcon className="size-4 mr-1" />
                                  Pause
                                </>
                              ) : (
                                <>
                                  <PlayIcon className="size-4 mr-1" />
                                  Play Audio
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                const url = await getDownloadUrl(
                                  isPodcastDialogOpen.analystPodcast.token,
                                );
                                if (url) {
                                  const link = document.createElement("a");
                                  link.href = url;
                                  link.download = `podcast-${isPodcastDialogOpen.analystPodcast.token}.mp3`;
                                  link.click();
                                } else {
                                  toast.error("Failed to get download URL");
                                }
                              }}
                            >
                              <DownloadIcon className="size-4 mr-1" />
                              Download
                            </Button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Volume2Icon className="size-4" />
                            Audio will be generated automatically
                          </div>
                        )}
                      </div>
                      {!!isPodcastDialogOpen.analystPodcast.extra?.processing && (
                        <div className="text-sm text-muted-foreground">
                          Podcast generation in progress...
                        </div>
                      )}
                    </div>
                  )}

                  {/* Script content */}
                  <div className="flex-1 overflow-y-auto scrollbar-thin prose prose-sm max-w-none dark:prose-invert p-4">
                    <div className="whitespace-pre-wrap text-sm">
                      {isPodcastDialogOpen.analystPodcast.script || "Script content not available"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Loader2Icon className="size-8 animate-spin mb-4" />
                  <p>Generating podcast script...</p>
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
              Additional instructions will be passed to the AI when generating your podcast script.
              These will supplement the standard podcast template.
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
