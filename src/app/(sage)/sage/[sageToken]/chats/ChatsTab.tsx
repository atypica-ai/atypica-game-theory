"use client";

import type { Sage, UserChat, ChatMessage } from "@/prisma/client";
import type { SageExtra } from "../../../types";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { MessageSquareIcon, ExternalLinkIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type SageWithExtra = Omit<Sage, "extra"> & { extra: SageExtra };
type ChatWithLastMessage = UserChat & { messages: ChatMessage[] };

export function ChatsTab({ chats }: { sage: SageWithExtra; chats: ChatWithLastMessage[] }) {
  const t = useTranslations("Sage.detail");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("userChatHistory")}</h1>
        <p className="text-muted-foreground mt-1">
          {chats.length} {t("totalChats")}
        </p>
      </div>

      <Separator />

      {/* Chats List */}
      {chats.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquareIcon className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">{t("noChatsYet")}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {t("startChatWithSage")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {chats.map((chat) => {
            const lastMessage = chat.messages[0];
            const lastMessagePreview = lastMessage
              ? lastMessage.content.substring(0, 100) + (lastMessage.content.length > 100 ? "..." : "")
              : t("noMessages");

            return (
              <Card key={chat.id} className="hover:bg-accent/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">
                        {chat.title || t("untitledChat")}
                      </CardTitle>
                      <div className="text-xs text-muted-foreground mt-1">
                        {t("lastUpdated")}: {formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true })}
                      </div>
                    </div>
                    <Link href={`/c/${chat.id}`}>
                      <Button variant="ghost" size="sm">
                        <ExternalLinkIcon className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                {lastMessage && (
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {lastMessagePreview}
                    </p>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
