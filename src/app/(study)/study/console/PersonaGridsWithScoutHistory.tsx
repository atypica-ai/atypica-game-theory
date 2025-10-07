import { TPersonaForStudy } from "@/ai/tools/experts/buildPersona/types";
import { TStudyMessageWithTool } from "@/ai/tools/types";
import { StudyToolUIPartDisplay } from "@/ai/tools/ui";
import { fetchPersonasByIds, fetchUserChatByToken } from "@/app/(study)/study/actions";
import { useStudyContext } from "@/app/(study)/study/hooks/StudyContext";
import { useProgressiveMessages } from "@/app/(study)/study/hooks/useProgressiveMessages";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExtractServerActionData } from "@/lib/serverAction";
import { ChevronLeftIcon, ChevronRightIcon, LoaderIcon, SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { FC, useCallback, useEffect, useRef, useState } from "react";
import { StreamSteps } from "./StreamSteps";

type TPersonaDetail = ExtractServerActionData<typeof fetchPersonasByIds>[number];

export const PersonaGridsWithScoutHistory: FC<{
  personas: TPersonaForStudy[];
}> = ({ personas }) => {
  const t = useTranslations("StudyPage.ToolConsole");
  const [promptPersona, setPromptPersona] = useState<TPersonaDetail | null>(null);
  const [scoutUserChatToken, setScoutUserChatToken] = useState<string | null>(null);
  const [personasDetails, setPersonasDetails] = useState<TPersonaDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const onPromptPersona = useCallback(
    (personaId: number) => {
      const promptPersona = personasDetails.find((persona) => persona.id === personaId);
      if (promptPersona) {
        setPromptPersona(promptPersona);
      }
    },
    [personasDetails],
  );

  const onScoutPersona = useCallback(
    (personaId: number) => {
      const persona = personasDetails.find((persona) => persona.id === personaId);
      if (persona) {
        setScoutUserChatToken(persona.scoutUserChatToken);
      }
    },
    [personasDetails],
  );

  useEffect(() => {
    setIsLoading(true);
    fetchPersonasByIds({
      ids: personas.map(({ personaId }) => personaId),
    })
      .then((result) => {
        if (!result.success) {
          throw new Error(result.message);
        }
        const personas = result.data;
        setPersonasDetails(personas);
        setScoutUserChatToken(
          personas.find((persona) => persona.scoutUserChatToken)?.scoutUserChatToken ?? null,
        );
      })
      .catch((error) => {
        console.log(error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [personas]);

  const checkScrollButtons = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10); // 10px buffer
    }
  }, []);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      // Initial check
      checkScrollButtons();
      // Check again after content loads
      const checkMultipleTimes = () => {
        checkScrollButtons();
        // Check a few times with increasing delays to ensure we catch content after it renders
        setTimeout(checkScrollButtons, 100);
        setTimeout(checkScrollButtons, 500);
        setTimeout(checkScrollButtons, 1000);
      };
      checkMultipleTimes();
      // Add event listeners
      scrollContainer.addEventListener("scroll", checkScrollButtons);
      window.addEventListener("resize", checkScrollButtons);
      return () => {
        scrollContainer.removeEventListener("scroll", checkScrollButtons);
        window.removeEventListener("resize", checkScrollButtons);
      };
    }
  }, [checkScrollButtons, personasDetails]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 w-full">
        <LoaderIcon className="animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="relative w-full">
        {/* Visual indicator that content is scrollable right - only shown when there's more content */}
        {showRightArrow && (
          <div className="absolute top-0 right-0 z-0 w-24 h-full bg-gradient-to-l from-background/40 to-transparent pointer-events-none"></div>
        )}
        {/* Visual indicator that content is scrollable left - only shown when scrolled */}
        {showLeftArrow && (
          <div className="absolute top-0 left-0 z-0 w-24 h-full bg-gradient-to-r from-background/40 to-transparent pointer-events-none"></div>
        )}

        {showLeftArrow && (
          <div className="absolute left-1 top-1/2 -translate-y-1/2 z-10">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-background/90 shadow-md hover:bg-background h-8 w-8 border-muted"
              onClick={scrollLeft}
              aria-label="Scroll left"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div
          ref={scrollContainerRef}
          className="flex gap-5 pt-1 pb-3 px-2 overflow-x-auto scrollbar-thin scroll-smooth"
          // style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {personas.map((persona) => (
            <Card
              key={persona.personaId}
              className="duration-300 hover:bg-accent/50 hover:shadow-md p-4 cursor-pointer min-w-80 w-80 shrink-0 flex flex-col"
              onClick={() => onScoutPersona(persona.personaId)}
            >
              <CardHeader className="px-0">
                <CardTitle className="flex items-center gap-2 overflow-hidden">
                  <HippyGhostAvatar seed={persona.personaId} className="size-6" />
                  <div className="flex-1 truncate text-sm">{persona.name}</div>
                  <Button
                    variant="default"
                    size="sm"
                    className="text-xs h-6 px-1 bg-primary/80"
                    onClick={() => onPromptPersona(persona.personaId)}
                  >
                    <SparklesIcon className="size-3" />
                    {t("personaPrompt")}
                  </Button>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  {t("personaSource")}：{persona.source}
                </CardDescription>
              </CardHeader>
              {/* <CardContent className="px-1">
                <div className="line-clamp-2 text-sm">{persona.prompt}</div>
              </CardContent> */}
              <CardFooter className="mt-auto px-0">
                <div className="flex flex-wrap gap-1.5">
                  {(persona.tags as string[])?.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>

        {showRightArrow && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 z-10">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-background/90 shadow-md hover:bg-background h-8 w-8 border-muted"
              onClick={scrollRight}
              aria-label="Scroll right"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-scroll scrollbar-thin">
        <ScoutTaskChatMessages scoutUserChatToken={scoutUserChatToken} />
      </div>

      <Dialog open={!!promptPersona} onOpenChange={() => setPromptPersona(null)}>
        {promptPersona && (
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{promptPersona?.name}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {t("personaSource")}：{promptPersona?.source}
              </DialogDescription>
            </DialogHeader>
            <div className="bg-muted/50 rounded-lg p-4 max-h-[60vh] overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap font-mono">{promptPersona?.prompt}</pre>
            </div>
            <DialogFooter className="justify-between sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {(promptPersona?.tags as string[])?.map((tag, index) => (
                  <Badge key={index} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
};

const ScoutTaskChatMessages = ({ scoutUserChatToken }: { scoutUserChatToken: string | null }) => {
  const { studyUserChat } = useStudyContext();
  const [messages, setMessages] = useState<TStudyMessageWithTool[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { partialMessages: messagesDisplay } = useProgressiveMessages({
    uniqueId: `searchPersonas-scoutUserChatToken`,
    messages: messages,
    enabled: true,
    fixedDuration: 10 * 1000,
  });

  const reloadMessages = useCallback(async () => {
    if (!scoutUserChatToken) {
      setMessages([]);
      return;
    }
    setIsLoading(true);
    const result = await fetchUserChatByToken(scoutUserChatToken, "scout");
    if (result.success) {
      setMessages(result.data.messages as TStudyMessageWithTool[]);
    } else {
      console.log(result.message);
    }
    setIsLoading(false);
  }, [scoutUserChatToken]);

  useEffect(() => {
    reloadMessages();
  }, [reloadMessages]);

  return isLoading ? (
    <div className="flex items-center justify-center py-8 w-full">
      <LoaderIcon className="animate-spin" />
    </div>
  ) : scoutUserChatToken ? (
    <div className="space-y-6 w-full">
      {messagesDisplay.map((message) => (
        <StreamSteps<TStudyMessageWithTool>
          key={`message-${message.id}`}
          avatar={
            message.role === "assistant" ? (
              <HippyGhostAvatar seed={scoutUserChatToken} />
            ) : message.role === "user" ? (
              <HippyGhostAvatar seed={studyUserChat.token} />
            ) : undefined
          }
          message={message}
          renderToolUIPart={(toolPart) => <StudyToolUIPartDisplay toolUIPart={toolPart} />}
        ></StreamSteps>
      ))}
    </div>
  ) : null;
};
