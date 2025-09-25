import { TokenAlertDialog } from "@/components/TokenAlertDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDistanceToNow } from "@/lib/utils";
import { Analyst } from "@/prisma/client";
import { Loader2Icon, PlayIcon, VolumeXIcon, Volume2Icon, PauseIcon, DownloadIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { backgroundGeneratePodcast, fetchAnalystPodcasts } from "@/app/(podcast)/actions";

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
  const t = useTranslations("AnalystPage");
  const router = useRouter();
  const [isPodcastDialogOpen, setIsPodcastDialogOpen] = useState<AnalystPodcast | null>(null);
  const [isPromptDialogOpen, setIsPromptDialogOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [generatingAudio, setGeneratingAudio] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [podcasts, setPodcasts] = useState<AnalystPodcast[]>(initialPodcasts);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const generateAudio = useCallback(async (podcastToken: string) => {
    try {
      setGeneratingAudio(podcastToken);
      const response = await fetch('/api/podcast/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ podcastToken }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate audio');
      }

      toast.success('Audio generation started');
      
      // Start polling for completion
      setIsPolling(true);
      
    } catch (error) {
      toast.error(`Failed to generate audio: ${error}`);
      setGeneratingAudio(null);
      setIsPolling(false);
    }
  }, []);

  const playAudio = useCallback((podcastUrl: string, podcastToken: string) => {
    if (playingAudio === podcastToken) {
      // Stop current audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPlayingAudio(null);
      return;
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
    }

    // Create new audio element
    const audio = new Audio(podcastUrl);
    audioRef.current = audio;
    
    audio.addEventListener('ended', () => {
      setPlayingAudio(null);
    });

    audio.addEventListener('error', () => {
      toast.error('Failed to play audio');
      setPlayingAudio(null);
    });

    audio.play().then(() => {
      setPlayingAudio(podcastToken);
    }).catch(() => {
      toast.error('Failed to play audio');
      setPlayingAudio(null);
    });
  }, [playingAudio]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingAudio(null);
  }, []);

  // Polling effect for audio generation status
  useEffect(() => {
    if (!isPolling || !generatingAudio) return;

    const pollInterval = setInterval(async () => {
      try {
        // Refresh the page to check for updates
        router.refresh();
        
        // Check if any podcast now has audio that was being generated
        const updatedPodcasts = await fetchAnalystPodcasts({ analystId: analyst.id });
        if (updatedPodcasts.success) {
          const generatingPodcast = updatedPodcasts.data.find(p => p.token === generatingAudio);
          if (generatingPodcast?.podcastUrl && generatingPodcast?.generatedAt) {
            toast.success('Audio generation completed!');
            setGeneratingAudio(null);
            setIsPolling(false);
            router.refresh();
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
        // Stop polling on error to prevent infinite retries
        setIsPolling(false);
        setGeneratingAudio(null);
        toast.error('Failed to check audio generation status');
      }
    }, 3000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [isPolling, generatingAudio, analyst.id, router]);

  // Update local state when initial podcasts change
  useEffect(() => {
    setPodcasts(initialPodcasts);
    
    // Check if any podcast we think is generating already has audio
    if (generatingAudio) {
      const podcast = initialPodcasts.find(p => p.token === generatingAudio);
      if (podcast?.podcastUrl && podcast?.generatedAt) {
        setGeneratingAudio(null);
        setIsPolling(false);
      }
    }
  }, [initialPodcasts, generatingAudio]);

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
                {podcast.podcastUrl ? (
                  <Volume2Icon className="size-8 mb-2 text-green-600 dark:text-green-400" />
                ) : (
                  <PlayIcon className="size-8 mb-2 text-purple-600 dark:text-purple-400" />
                )}
                <div className="text-xs font-medium text-purple-800 dark:text-purple-200">
                  {podcast.podcastUrl ? "Podcast Audio" : "Podcast Script"}
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
                <div className="w-full h-full flex flex-col">
                  {/* Audio controls section */}
                  {isPodcastDialogOpen.script && (
                    <div className="border-b p-4 bg-muted/30">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {isPodcastDialogOpen.podcastUrl ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => playAudio(isPodcastDialogOpen.podcastUrl!, isPodcastDialogOpen.token)}
                                disabled={generatingAudio === isPodcastDialogOpen.token}
                              >
                                {playingAudio === isPodcastDialogOpen.token ? (
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
                              <a
                                href={isPodcastDialogOpen.podcastUrl}
                                download={`podcast-${isPodcastDialogOpen.token}.mp3`}
                                className="inline-flex"
                              >
                                <Button variant="outline" size="sm">
                                  <DownloadIcon className="size-4 mr-1" />
                                  Download
                                </Button>
                              </a>
                            </>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => generateAudio(isPodcastDialogOpen.token)}
                              disabled={generatingAudio === isPodcastDialogOpen.token || !isPodcastDialogOpen.script}
                            >
                              {generatingAudio === isPodcastDialogOpen.token ? (
                                <>
                                  <Loader2Icon className="size-4 mr-1 animate-spin" />
                                  Generating Audio...
                                </>
                              ) : (
                                <>
                                  <Volume2Icon className="size-4 mr-1" />
                                  Generate Audio
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                        {generatingAudio === isPodcastDialogOpen.token && (
                          <div className="text-sm text-muted-foreground">
                            Audio generation may take 2-5 minutes...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Script content */}
                  <div className="flex-1 overflow-y-auto scrollbar-thin">
                    <div className="prose prose-sm max-w-none dark:prose-invert p-4">
                      <div className="whitespace-pre-wrap text-sm">
                        {isPodcastDialogOpen.script || "Script content not available"}
                      </div>
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