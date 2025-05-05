"use client";
import { Textarea } from "@/components/ui/textarea";
import { createUserChat } from "@/data/UserChat";
import { cn, useDevice } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ScoutChatHistory } from "./ScoutChatHistory";

export function ScoutChat() {
  const t = useTranslations("ScoutPage");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { isMobile } = useDevice();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setIsLoading(true);
    try {
      const result = await createUserChat("scout", {
        role: "user",
        content: input,
      });
      if (!result.success) {
        throw result;
      }
      const chat = result.data;
      router.push(`/agents/scout/${chat.id}`);
    } catch (error) {
      console.error("Error saving input:", (error as Error).message);
    }
    setIsLoading(false);
  };

  return (
    <div
      className={cn(
        "flex-1 overflow-y-auto scrollbar-thin",
        "flex flex-col items-stretch justify-between gap-4 w-full max-w-5xl mx-auto p-3",
      )}
    >
      <div className="relative w-full">
        <h1 className="sm:text-lg font-medium px-18 text-center truncate">{t("title")}</h1>
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
          <ScoutChatHistory />
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Textarea
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
          }}
          className="min-h-24 resize-none focus-visible:border-primary/70 transition-colors p-5"
          enterKeyHint="enter"
          disabled={isLoading}
          onKeyDown={(e) => {
            if (!isMobile && e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (input.trim()) {
                const form = e.currentTarget.form;
                if (form) form.requestSubmit();
              }
            }
          }}
        />
      </form>
    </div>
  );
}
