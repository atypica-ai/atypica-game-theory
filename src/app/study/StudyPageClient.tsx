"use client";
import GlobalHeader from "@/components/GlobalHeader";
import { Button } from "@/components/ui/button";
import { useScrollToBottom } from "@/components/use-scroll-to-bottom";
import UserTokensBalance from "@/components/UserTokensBalance";
import { StudyUserChat } from "@/data/UserChat";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, EyeIcon, EyeOffIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChatBox } from "./ChatBox";
import { ChatReplay } from "./ChatReplay";
import { NerdStats } from "./components/NerdStats";
import ReportsListPanel from "./components/ReportsListPanel";
import { ShareReplayButton } from "./components/ShareReplayButton";
import { StudyProvider, useStudyContext } from "./hooks/StudyContext";
import { ToolConsole } from "./ToolConsole";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function Header() {
  const t = useTranslations("StudyPage");
  const { studyUserChat, replay } = useStudyContext();
  return (
    <div className="relative w-full flex items-center justify-between gap-2">
      <h1 className="flex-1 sm:text-lg font-medium truncate">
        {studyUserChat.title || t("research")}
      </h1>
      {/* <div className="absolute right-0 top-1/2 -translate-y-1/2"> */}
      {!replay ? <ShareReplayButton studyUserChat={studyUserChat} /> : <NerdStats />}
    </div>
  );
}

// 添加跟随状态切换按钮
const FollowButton = () => {
  const t = useTranslations("StudyPage.ToolConsole");
  const { viewToolInvocation, unsetViewToolInvocation } = useStudyContext();
  return (
    <Button
      onClick={() => unsetViewToolInvocation()}
      variant="ghost"
      size="sm"
      title={viewToolInvocation ? "Stop following latest result" : "Follow latest result"}
    >
      {!viewToolInvocation ? <EyeIcon className="h-4 w-4" /> : <EyeOffIcon className="h-4 w-4" />}
      <span className="ml-1 text-xs">
        {!viewToolInvocation ? t("autoFollow") : t("manualSelect")}
      </span>
    </Button>
  );
};

const Console = () => {
  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();
  const { consoleOpen, setConsoleOpen } = useStudyContext();
  return (
    <section
      className={cn(
        "h-full w-1/2 max-lg:w-full max-lg:absolute max-lg:left-0 max-lg:right-0 max-lg:bottom-0",
        "flex flex-col items-stretch justify-between gap-4 p-4 pl-2 max-lg:p-1",
        consoleOpen ? "max-lg:h-full max-lg:top-0" : "max-lg:h-auto",
      )}
    >
      <div
        className={cn(
          "relative p-4 flex-1 overflow-hidden flex flex-col items-stretch justify-start",
          "border rounded-lg bg-zinc-100 dark:bg-zinc-900 shadow-[0_0_10px_0] shadow-primary/30 dark:shadow-primary/80",
          consoleOpen ? "max-lg:p-3" : "max-lg:p-2",
        )}
      >
        <div
          className="absolute w-full left-0 right-0 top-0 p-1 hidden max-lg:flex items-center justify-center"
          onClick={() => setConsoleOpen(!consoleOpen)}
        >
          {consoleOpen ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
        </div>
        <div className="w-full flex flex-row items-center justify-start gap-4">
          <div
            className={cn(
              "ml-1 text-lg font-medium font-mono leading-tight",
              consoleOpen ? "max-lg:text-base" : "max-lg:text-sm",
            )}
          >
            atypica.AI Console
          </div>
          <div className="ml-auto"></div>
          <FollowButton />
        </div>
        <div
          className={cn(
            "p-4 flex-1 mt-4",
            !consoleOpen
              ? "max-lg:p-0 max-lg:flex-none max-lg:h-0 max-lg:mt-0 max-lg:invisible"
              : "",
            "overflow-y-auto scrollbar-thin border rounded-lg dark:border-zinc-800 bg-white dark:bg-background",
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

export function StudyPageClient({
  studyUserChat,
  replay,
}: {
  studyUserChat: StudyUserChat;
  replay: boolean;
}) {
  // useEffect(() => {
  //   trackPage();
  // }, []);

  return (
    <StudyProvider studyUserChat={studyUserChat} replay={replay}>
      <main className="relative flex-1 flex flex-rows w-dvw h-dvh overflow-hidden">
        {/* Left panel, the chat box */}
        <section className="h-full w-1/2 max-lg:w-full pb-4 max-lg:pb-16 flex flex-col items-stretch justify-start">
          <GlobalHeader className="border-border/50">
            {!replay ? (
              <>
                <ReportsListPanel />
                <ShareReplayButton studyUserChat={studyUserChat} />
                <UserTokensBalance />
              </>
            ) : (
              <>
                <ReportsListPanel />
                <NerdStats />
              </>
            )}
          </GlobalHeader>
          <div
            className={cn(
              "flex-1 overflow-y-auto scrollbar-thin flex flex-col items-stretch justify-start gap-4 relative",
            )}
          >
            {/* <Header /> */}
            {replay ? <ChatReplay /> : <ChatBox />}
          </div>
        </section>

        {/* Right panel, the console */}
        <Console />
      </main>
    </StudyProvider>
  );
}
