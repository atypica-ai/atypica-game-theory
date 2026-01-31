"use client";
import { ClientMessagePayload, prepareLastUIMessageForRequest } from "@/ai/messageUtilsClient";
import { clearPersonaChatHistory } from "@/app/(persona)/actions";
import { PersonaToolUIPartDisplay } from "@/app/(persona)/tools/ui";
import { TPersonaMessageWithTool } from "@/app/(persona)/types";
import { UserChatSession } from "@/components/chat/UserChatSession";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { Persona } from "@/prisma/client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { BotIcon, CalendarIcon, InfoIcon, RefreshCwIcon, TagIcon, TrashIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export function PersonaChatClient({
  userChatToken,
  persona,
  initialMessages = [],
}: {
  userChatToken: string;
  persona: Persona;
  initialMessages?: TPersonaMessageWithTool[];
}) {
  const locale = useLocale();
  const t = useTranslations("PersonaImport.personaChat");
  const { data: session } = useSession();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const extraRequestPayload = useMemo(() => ({ userChatToken: userChatToken }), [userChatToken]);

  // Chat hooks
  const useChatHelpers = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat/persona",
      prepareSendMessagesRequest({ id, messages, body: extraBody }) {
        const message = prepareLastUIMessageForRequest(messages);
        const body: ClientMessagePayload = {
          id,
          message,
          ...extraRequestPayload,
        };
        if (extraBody && "attachments" in extraBody) {
          body["attachments"] = extraBody.attachments;
        }
        return { body };
      },
    }),
    // experimental_throttle: 300,
  });

  const useChatRef = useRef({
    regenerate: useChatHelpers.regenerate,
    setMessages: useChatHelpers.setMessages,
    sendMessage: useChatHelpers.sendMessage,
  });

  const handleClearHistory = async () => {
    setIsClearing(true);
    try {
      const result = await clearPersonaChatHistory(userChatToken);

      if (!result.success) {
        throw new Error(result.message || t("clearFailed"));
      }

      toast.success(t("historyCleared"));

      // 清空当前聊天界面的消息
      useChatHelpers.setMessages([]);
    } catch (error) {
      console.log("Error clearing history:", error);
      toast.error(t("clearFailed"));
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <FitToViewport className="flex flex-col overflow-hidden">
      {/* Chat Header */}
      <div className="w-full mt-2 px-3 py-3 max-w-4xl mx-auto relative">
        <h1 className="font-medium text-sm text-center">{persona.name}</h1>
        {/* Detail Modal Trigger */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-foreground absolute right-0 top-1/2 -translate-y-1/2"
            >
              <InfoIcon className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">{t("details")}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BotIcon className="w-5 h-5" />
                {persona.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Basic Info */}
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    {t("created")}
                  </div>
                  <div className="text-sm flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" />
                    {formatDate(persona.createdAt, locale)}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    {t("source")}
                  </div>
                  <div className="text-sm">{persona.source}</div>
                </div>

                {persona.tier !== null && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      {t("tier")}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {t("tier")} {persona.tier}
                    </Badge>
                  </div>
                )}

                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <TagIcon className="w-3 h-3" />
                    {t("tags")}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(persona.tags as string[])?.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Import Analysis */}
              <div className="pt-4 border-t">
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {/* 只有当有聊天记录时才显示清除按钮 */}
                    <ConfirmDialog
                      title={t("confirmClearHistory")}
                      onConfirm={async () => {
                        await handleClearHistory();
                      }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled={!useChatHelpers.messages.length || isClearing}
                      >
                        {isClearing ? (
                          <>
                            <RefreshCwIcon className="w-4 h-4 animate-spin" />
                            {t("clearing")}...
                          </>
                        ) : (
                          <>
                            <TrashIcon className="w-4 h-4" />
                            {t("clearChatHistory")}
                          </>
                        )}
                      </Button>
                    </ConfirmDialog>

                    {persona.personaImportId && (
                      <Button
                        asChild
                        variant="default"
                        size="sm"
                        className={useChatHelpers.messages.length > 0 ? "flex-1" : "w-full"}
                      >
                        <Link
                          href={`/persona/import/${persona.personaImportId}`}
                          className="flex items-center gap-2"
                        >
                          <BotIcon className="w-4 h-4" />
                          {t("returnToPersonaCreation")}
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Centered Chat Area */}
      <div className="flex-1 overflow-hidden w-full max-w-4xl mx-auto flex flex-col">
        <UserChatSession
          nickname={{ assistant: persona.name, user: session?.user?.email ?? "You" }}
          avatar={{
            assistant: <HippyGhostAvatar className="size-8" seed={persona.id} />,
            user: session?.user ? (
              <HippyGhostAvatar className="size-8" seed={session.user.id} />
            ) : undefined,
          }}
          useChatHelpers={useChatHelpers}
          useChatRef={useChatRef}
          renderToolUIPart={(toolPart) => <PersonaToolUIPartDisplay toolUIPart={toolPart} />}
          acceptAttachments={true}
        />
      </div>
    </FitToViewport>
  );
}
