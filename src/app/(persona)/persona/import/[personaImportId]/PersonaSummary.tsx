"use client";
import { createOrGetUserPersonaChat, fetchPersonaChatStat } from "@/app/(persona)/actions";
import { Button } from "@/components/ui/button";
import { Persona } from "@/prisma/client";
import { BrainIcon, MessageCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

type ChatSession = {
  messageCount: number;
  lastMessageAt: Date | null;
};

export function PersonaSummary({
  personas,
}: {
  personas: (Omit<Persona, "id" | "token"> & { id: undefined; token: string })[];
}) {
  const t = useTranslations("PersonaImport.personaSummary");
  const router = useRouter();
  const [chatCreating, setChatCreating] = useState<Record<string, boolean>>({});
  const [personaChatStats, setPersonaChatStats] = useState<Record<string, ChatSession[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<Record<string, boolean>>({});

  const loadChatHistory = useCallback(
    async (personaToken: string) => {
      if (personaChatStats[personaToken] || loadingHistory[personaToken]) return;
      setLoadingHistory((prev) => ({ ...prev, [personaToken]: true }));
      try {
        const result = await fetchPersonaChatStat(personaToken);
        if (!result.success) throw result;
        setPersonaChatStats((prev) => ({ ...prev, [personaToken]: result.data }));
      } catch (error) {
        console.log("Failed to load chat history:", error);
      } finally {
        setLoadingHistory((prev) => ({ ...prev, [personaToken]: false }));
      }
    },
    [personaChatStats, loadingHistory],
  );

  // 预加载所有画像的聊天历史
  useEffect(() => {
    personas.forEach((persona) => {
      loadChatHistory(persona.token);
    });
  }, [personas, loadChatHistory]);

  const handleStartChat = useCallback(
    async (personaToken: string) => {
      setChatCreating((prev) => ({ ...prev, [personaToken]: true }));
      try {
        const result = await createOrGetUserPersonaChat(personaToken);
        if (!result.success) {
          throw new Error(result.message);
        }
        router.push(`/persona/chat/${result.data.token}`);
      } catch (error) {
        console.log("Failed to start chat:", error);
        toast.error("Failed to start chat");
      } finally {
        setChatCreating((prev) => ({ ...prev, [personaToken]: false }));
      }
    },
    [router],
  );

  const extractSummaryFromPrompt = (prompt: string) => {
    const match = prompt.match(/<persona>([\s\S]*?)<\/persona>/);
    return match ? match[1] : prompt;
  };

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/20">
      <div className="space-y-4">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
            <BrainIcon className="size-3" />
          </div>
          {t("title")}
        </h2>

        <div className="grid gap-4">
          {personas.map((persona) => {
            const personaChatHistory = personaChatStats[persona.token] || [];
            const hasHistory =
              personaChatHistory.length > 0 &&
              personaChatHistory.some((chat) => chat.messageCount > 0);

            return (
              <div
                key={persona.token}
                className="p-4 bg-muted/50 rounded-lg border border-border/30"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{persona.name}</h4>
                      <div className="text-sm text-muted-foreground">{persona.source}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleStartChat(persona.token)}
                      disabled={chatCreating[persona.token] || loadingHistory[persona.token]}
                      className="flex items-center gap-2"
                    >
                      <MessageCircleIcon className="size-3" />
                      {chatCreating[persona.token]
                        ? t("starting")
                        : loadingHistory[persona.token]
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
                        className="px-2 py-1 bg-background text-foreground text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-2">
                  <div className="p-2 rounded-sm text-xs bg-background border border-border/20">
                    <Streamdown>{extractSummaryFromPrompt(persona.prompt)}</Streamdown>
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
