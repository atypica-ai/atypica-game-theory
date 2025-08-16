"use client";
import { createOrGetUserPersonaChat, fetchPersonaChatStat } from "@/app/(persona)/actions";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Persona } from "@/prisma/client";
import { BrainIcon, MessageCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type ChatSession = {
  messageCount: number;
  lastMessageAt: Date | null;
};

export function PersonaSummary({ personas }: { personas: Persona[] }) {
  const t = useTranslations("PersonaImport.personaSummary");
  const router = useRouter();
  const [chatCreating, setChatCreating] = useState<Record<number, boolean>>({});
  const [personaChatStats, setPersonaChatStats] = useState<Record<number, ChatSession[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<Record<number, boolean>>({});

  const loadChatHistory = useCallback(
    async (personaId: number) => {
      if (personaChatStats[personaId] || loadingHistory[personaId]) return;
      setLoadingHistory((prev) => ({ ...prev, [personaId]: true }));
      try {
        const result = await fetchPersonaChatStat(personaId);
        if (!result.success) throw result;
        setPersonaChatStats((prev) => ({ ...prev, [personaId]: result.data }));
      } catch (error) {
        console.log("Failed to load chat history:", error);
      } finally {
        setLoadingHistory((prev) => ({ ...prev, [personaId]: false }));
      }
    },
    [personaChatStats, loadingHistory],
  );

  // 预加载所有画像的聊天历史
  useEffect(() => {
    personas.forEach((persona) => {
      loadChatHistory(persona.id);
    });
  }, [personas, loadChatHistory]);

  const handleStartChat = useCallback(
    async (personaId: number) => {
      setChatCreating((prev) => ({ ...prev, [personaId]: true }));
      try {
        const result = await createOrGetUserPersonaChat(personaId);
        if (!result.success) {
          throw new Error(result.message);
        }
        router.push(`/persona/chat/${result.data.token}`);
      } catch (error) {
        console.log("Failed to start chat:", error);
        toast.error("Failed to start chat");
      } finally {
        setChatCreating((prev) => ({ ...prev, [personaId]: false }));
      }
    },
    [router],
  );

  const extractSummaryFromPrompt = (prompt: string) => {
    const match = prompt.match(/<persona>([\s\S]*?)<\/persona>/);
    return match ? match[1] : prompt;
  };

  return (
    <div className="bg-card text-card-foreground rounded-lg border p-3 sm:p-6">
      <div className="space-y-3">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center">
              <BrainIcon className="size-3" />
            </div>
            {t("title")}
          </h2>
          <p className="text-muted-foreground ml-9 text-sm">{t("description")}</p>
        </div>

        <div className="grid gap-3">
          {personas.map((persona) => {
            const personaChatHistory = personaChatStats[persona.id] || [];
            const hasHistory =
              personaChatHistory.length > 0 &&
              personaChatHistory.some((chat) => chat.messageCount > 0);

            return (
              <div key={persona.id} className="p-4 bg-muted/50 rounded-lg border">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{persona.name}</h4>
                      <div className="text-sm text-muted-foreground">{persona.source}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleStartChat(persona.id)}
                      disabled={chatCreating[persona.id] || loadingHistory[persona.id]}
                      className="flex items-center gap-2"
                    >
                      <MessageCircleIcon className="size-3" />
                      {chatCreating[persona.id]
                        ? t("starting")
                        : loadingHistory[persona.id]
                          ? t("checking")
                          : hasHistory
                            ? t("continueChat")
                            : t("startChat")}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(persona.tags as string[]).map((tag, tagIndex) => (
                      <span
                        key={tagIndex}
                        className="px-2 py-1 bg-background text-foreground text-xs rounded border"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-2">
                  <div className="border p-2 rounded-sm text-xs bg-background">
                    <Markdown>{extractSummaryFromPrompt(persona.prompt)}</Markdown>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
