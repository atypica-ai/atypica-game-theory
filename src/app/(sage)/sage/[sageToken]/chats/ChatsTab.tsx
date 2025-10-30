"use client";

import type { SageExtra } from "@/app/(sage)/types";
import { Separator } from "@/components/ui/separator";
import type { ChatMessage, Sage, UserChat } from "@/prisma/client";
import { formatDistanceToNow } from "date-fns";
import { ExternalLinkIcon, MessageSquareIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

type SageWithExtra = Omit<Sage, "extra"> & { extra: SageExtra };
type ChatWithLastMessage = UserChat & { messages: ChatMessage[] };

export function ChatsTab({ chats }: { sage: SageWithExtra; chats: ChatWithLastMessage[] }) {
  const t = useTranslations("Sage.detail");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">{t("userChatHistory")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {chats.length} {t("totalChats")}
        </p>
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
                href={`/c/${chat.id}`}
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
                  <ExternalLinkIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
