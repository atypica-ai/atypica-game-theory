"use client";

import { createOrGetSageChat } from "@/app/(sage)/actions";
import { SageToolUIPartDisplay } from "@/app/(sage)/tools/ui";
import type { SageExtra, TSageMessageWithTool } from "@/app/(sage)/types";
import { UserChatSession } from "@/components/chat/UserChatSession";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { Button } from "@/components/ui/button";
import type { ChatMessageAttachment, Sage, User, UserChat } from "@/prisma/client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ClientMessagePayload, prepareLastUIMessageForRequest } from "@/ai/messageUtilsClient";

export function PublicSageView({
  sage,
  isOwner,
  userChat: initialUserChat,
  initialMessages = [],
  isAuthenticated,
}: {
  sage: Omit<Sage, "expertise" | "attachments" | "extra"> & {
    extra: SageExtra;
    expertise: string[];
    attachments: ChatMessageAttachment[];
    user: Pick<User, "id" | "name" | "email">;
  };
  isOwner: boolean;
  userChat: UserChat | null;
  initialMessages?: TSageMessageWithTool[];
  isAuthenticated: boolean;
}) {
  const t = useTranslations("Sage.detail");
  const tPublic = useTranslations("Sage.public");
  const router = useRouter();
  const { data: session } = useSession();
  const [userChat, setUserChat] = useState(initialUserChat);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [showChat, setShowChat] = useState(!!initialUserChat);

  const extraRequestPayload = useMemo(
    () => ({ userChatToken: userChat?.token ?? "" }),
    [userChat?.token]
  );

  // Chat hooks
  const useChatHelpers = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat/sage",
      prepareSendMessagesRequest({ id, messages, body: extraBody }) {
        const body: ClientMessagePayload = {
          id,
          message: prepareLastUIMessageForRequest(messages),
          ...extraRequestPayload,
        };
        if (extraBody && "attachments" in extraBody) {
          body["attachments"] = extraBody.attachments;
        }
        return { body };
      },
    }),
    experimental_throttle: 300,
  });

  const useChatRef = useRef({
    regenerate: useChatHelpers.regenerate,
    setMessages: useChatHelpers.setMessages,
    sendMessage: useChatHelpers.sendMessage,
  });

  const handleStartChat = async () => {
    if (!isAuthenticated) {
      router.push("/auth/signin");
      return;
    }

    setIsCreatingChat(true);
    try {
      const result = await createOrGetSageChat(sage.id);
      if (!result.success) throw result;
      const { userChat: newUserChat } = result.data;
      setUserChat(newUserChat);
      setShowChat(true);
    } catch (error) {
      console.log("Error creating chat:", error);
      toast.error(t("createChatFailed"));
    } finally {
      setIsCreatingChat(false);
    }
  };

  if (showChat && userChat) {
    return (
      <FitToViewport className="flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="w-full mt-2 px-3 py-3 max-w-4xl mx-auto border-b">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowChat(false)}
              className="gap-2"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <div className="flex-1">
              <h1 className="font-medium text-sm">{sage.name}</h1>
              {sage.domain && (
                <p className="text-xs text-muted-foreground">{sage.domain}</p>
              )}
            </div>
          </div>
        </div>

        {/* Centered Chat Area */}
        <div className="flex-1 overflow-hidden w-full max-w-4xl mx-auto flex flex-col">
          <UserChatSession
            nickname={{ assistant: sage.name, user: session?.user?.email ?? "You" }}
            avatar={{
              assistant: <HippyGhostAvatar className="size-8" seed={sage.id} />,
              user: session?.user ? (
                <HippyGhostAvatar className="size-8" seed={session.user.id} />
              ) : undefined,
            }}
            useChatHelpers={useChatHelpers}
            useChatRef={useChatRef}
            renderToolUIPart={(toolPart) => <SageToolUIPartDisplay toolUIPart={toolPart} />}
            acceptAttachments={true}
          />
        </div>
      </FitToViewport>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <HippyGhostAvatar className="size-16" seed={sage.id} />
                <div>
                  <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                    {sage.name}
                  </h1>
                  <p className="text-base text-zinc-600 dark:text-zinc-400">{sage.domain}</p>
                </div>
              </div>

              {/* Expertise Tags */}
              {sage.expertise.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {sage.expertise.map((exp, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full"
                    >
                      {exp}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {isOwner && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/sage/${sage.token}`}>
                    {tPublic("manage")}
                  </Link>
                </Button>
              )}
              <Button onClick={handleStartChat} disabled={isCreatingChat}>
                <MessageCircle className="size-4" />
                {isAuthenticated ? t("chatWithSage") : tPublic("signInToChat")}
              </Button>
            </div>
          </div>
        </div>

        {/* Memory Document Preview */}
        {sage.memoryDocument && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              {tPublic("aboutExpert")}
            </h3>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap text-xs bg-zinc-50 dark:bg-zinc-800 p-4 rounded-md overflow-x-auto max-h-96 overflow-y-auto">
                {sage.memoryDocument.substring(0, 2000)}
                {sage.memoryDocument.length > 2000 && "\n\n..."}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
