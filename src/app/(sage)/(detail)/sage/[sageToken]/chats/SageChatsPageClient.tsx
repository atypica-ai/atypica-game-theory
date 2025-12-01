"use client";
import { discoverKnowledgeGapsFromSageChatsAction } from "@/app/(sage)/(detail)/actions";
import { SageExtra } from "@/app/(sage)/types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { ChatMessage, Sage, UserChat } from "@/prisma/client";
import { formatDistanceToNow } from "date-fns";
import { ExternalLinkIcon, MessageSquareIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ChatWithLastMessage = UserChat & { messages: ChatMessage[] };

export function SageChatsPageClient({
  sage,
  chats,
}: {
  sage: Pick<Sage, "id"> & { extra: SageExtra };
  chats: ChatWithLastMessage[];
}) {
  const t = useTranslations("Sage.ChatsPage");
  const router = useRouter();
  const [isRequesting, setIsRequesting] = useState(false);
  const isProcessing = useMemo(
    () =>
      (sage.extra.processing && Date.now() - sage.extra.processing.startsAt < 30 * 60 * 1000) ||
      isRequesting,
    [sage.extra.processing, isRequesting],
  );

  // Auto-refresh when processing
  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        router.refresh();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [isProcessing, router]);

  const handleAnalyze = useCallback(async () => {
    setIsRequesting(true);
    try {
      const result = await discoverKnowledgeGapsFromSageChatsAction({ sageId: sage.id });
      if (!result.success) throw result;
      toast.success(t("analyzeSubmitted"));
      setTimeout(() => router.refresh(), 1000);
    } catch (error) {
      console.error("Failed to analyze chats:", error);
      toast.error(t("analyzeFailed"));
    } finally {
      setIsRequesting(false);
    }
  }, [sage.id, router, t]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{t("userChatHistory")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {chats.length} {t("totalChats")}
          </p>
        </div>
        {chats.length > 0 && (
          <Button onClick={handleAnalyze} disabled={isProcessing} size="sm" variant="outline">
            <SearchIcon className="h-4 w-4" />
            {isProcessing ? t("analyzing") : t("analyzeRecentChats")}
          </Button>
        )}
      </div>

      <Separator />

      {/* Chats List */}
      {chats.length === 0 ? (
        <div className="py-12 text-center">
          <MessageSquareIcon className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">{t("noChatsYet")}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("startChatWithSage")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {chats.map((chat) => {
            const lastMessage = chat.messages[0];
            const lastMessagePreview = lastMessage
              ? lastMessage.content.substring(0, 80) +
                (lastMessage.content.length > 80 ? "..." : "")
              : t("noMessages");

            return (
              <Link
                key={chat.id}
                href={`/sage/chat/view/${chat.token}`}
                className="block py-2 px-3 rounded hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {chat.title || t("untitledChat")}
                    </div>
                    <div className="text-xs text-muted-foreground/70 mt-0.5">
                      {formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true })}
                    </div>
                    {lastMessage && (
                      <p className="text-xs text-muted-foreground/60 line-clamp-1 mt-1">
                        {lastMessagePreview}
                      </p>
                    )}
                  </div>
                  <ExternalLinkIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
