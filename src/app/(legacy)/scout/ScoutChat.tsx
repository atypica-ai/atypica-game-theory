"use client";
import { ScoutUserChat } from "@/data/UserChat";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ScoutChatHistory } from "./ScoutChatHistory";
import { ScoutChatMessages } from "./ScoutChatMessages";

export function ScoutChat() {
  const t = useTranslations("ScoutPage");
  const [currentChat, setCurrentChat] = useState<ScoutUserChat | null>(null);

  return (
    <div
      className={cn(
        "flex-1 overflow-y-auto scrollbar-thin",
        "flex flex-col items-stretch justify-between gap-4 w-full max-w-5xl mx-auto p-3",
      )}
    >
      <div className="relative w-full">
        <h1 className="sm:text-lg font-medium px-18 text-center truncate">
          {currentChat?.title || t("title")}
        </h1>
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
          <ScoutChatHistory onSelectChat={setCurrentChat} />
        </div>
      </div>
      <ScoutChatMessages scoutUserChat={currentChat} />
    </div>
  );
}
