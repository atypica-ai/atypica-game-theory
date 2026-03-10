"use client";
import { TStudyMessageWithTool } from "@/app/(study)/tools/types";
import GlobalHeader from "@/components/layout/GlobalHeader";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { cn } from "@/lib/utils";
import { UserChat } from "@/prisma/client";
import { getToolOrDynamicToolName, UIMessage } from "ai";
import { EyeIcon, EyeOffIcon, ScanIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChatBox } from "./ChatBox";
import { ChatReplay } from "./ChatReplay";
import { NerdStats } from "./components/NerdStats";
import { ShareReplayButton } from "./components/ShareReplayButton";
import { StudyProvider, useStudyContext } from "./hooks/StudyContext";
import { ToolConsole } from "./ToolConsole";

// 添加跟随状态切换按钮
const FollowButton = () => {
  const t = useTranslations("StudyPage.ToolConsole");
  const { viewToolInvocation, unsetViewToolInvocation } = useStudyContext();
  return (
    <Button
      onClick={() => unsetViewToolInvocation()}
      variant="ghost"
      size="sm"
      className="gap-1"
      title={viewToolInvocation ? "Stop following latest result" : "Follow latest result"}
    >
      {!viewToolInvocation ? <EyeIcon className="size-4" /> : <EyeOffIcon className="size-4" />}
      <span className="text-xs">{t("autoFollow")}</span>
    </Button>
  );
};

const Console = () => {
  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();
  const { consoleOpen, setConsoleOpen } = useStudyContext();
  const isMediaLg = useMediaQuery("lg");
  return (
    <section
      className={cn(
        isMediaLg
          ? "block"
          : consoleOpen
            ? "block animate-in zoom-in origin-bottom-right"
            : "hidden",
        "h-full w-1/2 max-lg:absolute max-lg:w-full max-lg:h-full max-lg:top-0 max-lg:left-0 max-lg:right-0 max-lg:bottom-0",
        "p-4 pl-2 max-lg:p-1",
      )}
    >
      <div
        className={cn(
          "relative w-full h-full overflow-hidden flex flex-col items-stretch justify-start",
          "border rounded-lg bg-zinc-100 dark:bg-zinc-900 shadow-[0_0_10px_0] shadow-primary/30 dark:shadow-primary/80",
        )}
      >
        <div className="m-4 max-lg:m-2 flex flex-row items-center justify-start">
          <div className="ml-1 text-lg max-lg:text-sm font-medium font-mono leading-tight">
            atypica.AI Console
          </div>
          <div className="ml-auto"></div>
          <FollowButton />
          <Button
            onClick={() => setConsoleOpen(false)}
            variant="ghost"
            size="icon"
            className="lg:hidden -mr-2"
          >
            <XIcon className="size-4" />
          </Button>
        </div>
        <div
          className={cn(
            "mx-4 mb-4 max-lg:m-0 p-4",
            "flex-1 overflow-y-auto scrollbar-thin border rounded-lg dark:border-zinc-800 bg-white dark:bg-background",
          )}
          ref={messagesContainerRef}
        >
          <ToolConsole />
          <div ref={messagesEndRef} />
        </div>
      </div>
    </section>
  );
};

const Agent = () => {
  const t = useTranslations("StudyPage.ToolConsole");
  const { replay, studyUserChat, consoleOpen, setConsoleOpen, lastToolInvocation } =
    useStudyContext();
  return (
    <section className="h-full w-1/2 max-lg:w-full pb-4 max-lg:pb-0 pl-2 max-lg:pl-0 flex flex-col items-stretch justify-start">
      <GlobalHeader
        className={cn(
          "h-12 border-border/50",
          // "max-sm:[&_[title='logo']]:hidden", // 不需要了
        )}
        drawerDirection="left"
      >
        <div className="flex items-center gap-1 sm:gap-2">
          <NerdStats />
          {!replay && <ShareReplayButton studyUserChat={studyUserChat} />}
        </div>
      </GlobalHeader>
      {replay ? <ChatReplay /> : <ChatBox />}
      <div
        className="bg-primary/90 text-primary-foreground h-8 px-3 mt-1 lg:hidden cursor-pointer flex items-center"
        onClick={() => setConsoleOpen(!consoleOpen)}
      >
        <span className="text-xs font-bold">
          {lastToolInvocation ? ">_ exec " + getToolOrDynamicToolName(lastToolInvocation) : ""}
        </span>
        <span className="ml-auto mr-1 text-xs font-bold">{t("viewConsole")}</span>
        <ScanIcon className="size-3" />
      </div>
    </section>
  );
};

export function StudyPageClient({
  studyUserChat: { messages, ...studyUserChat },
  replay,
}: {
  studyUserChat: Omit<UserChat, "kind"> & {
    kind: "study";
    messages: UIMessage[];
  };
  replay: boolean;
}) {
  // useEffect(() => {
  //   trackPage();
  // }, []);

  return (
    <StudyProvider
      studyUserChat={{ ...studyUserChat, messages: messages as TStudyMessageWithTool[] }}
      replay={replay}
    >
      <main className="relative flex-1 flex flex-rows w-dvw h-dvh overflow-hidden">
        <Agent />
        <Console />
      </main>
    </StudyProvider>
  );
}
