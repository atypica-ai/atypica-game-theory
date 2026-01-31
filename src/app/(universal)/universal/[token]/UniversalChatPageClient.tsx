"use client";
import { ClientMessagePayload, prepareLastUIMessageForRequest } from "@/ai/messageUtilsClient";
import { TUniversalMessageWithTool } from "@/app/(universal)/tools/types";
import { UniversalToolUIPartDisplay } from "@/app/(universal)/tools/ui";
import { WorkspaceFilesPanel } from "@/app/(universal)/universal/components/WorkspaceFilesPanel";
import { UserChatSession } from "@/components/chat/UserChatSession";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { Button } from "@/components/ui/button";
import { UserChat } from "@/prisma/client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { FolderOpenIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";

export function UniversalChatPageClient({
  userChat,
  initialMessages = [],
}: {
  userChat: Omit<UserChat, "kind" | "extra"> & {
    kind: "universal";
  };
  initialMessages?: TUniversalMessageWithTool[];
}) {
  const { data: session } = useSession();
  const extraRequestPayload = useMemo(() => ({ userChatToken: userChat.token }), [userChat.token]);

  // Chat hooks
  const useChatHelpers = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat/universal",
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
  });

  const useChatRef = useRef({
    regenerate: useChatHelpers.regenerate,
    setMessages: useChatHelpers.setMessages,
    sendMessage: useChatHelpers.sendMessage,
  });

  const requestSentRef = useRef(false);
  useEffect(() => {
    if (requestSentRef.current) return;
    requestSentRef.current = true;
    if (initialMessages.length === 0) {
      // If no initial message, start the conversation with AI
      useChatRef.current.sendMessage({ text: "[READY]" });
    } else if (initialMessages[initialMessages.length - 1]?.role === "user") {
      useChatRef.current.regenerate();
    }
  }, [initialMessages]);

  // Files panel state
  const [filesPanelOpen, setFilesPanelOpen] = useState(false);

  return (
    <FitToViewport className="flex flex-col overflow-hidden">
      {/* Chat Header */}
      <div className="w-full mt-2 px-3 py-3 max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex-1" />
        <h1 className="font-medium text-sm text-center flex-1">{userChat.title || "GEA"}</h1>
        <div className="flex-1 flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setFilesPanelOpen(true)}
            className="size-8"
            title="View workspace files"
          >
            <FolderOpenIcon className="size-4" />
          </Button>
        </div>
      </div>

      {/* Centered Chat Area */}
      <div className="flex-1 overflow-hidden w-full max-w-4xl mx-auto flex flex-col">
        <UserChatSession
          nickname={{ assistant: "GEA", user: session?.user?.email ?? "You" }}
          avatar={{
            assistant: <HippyGhostAvatar className="size-8" seed={0} />,
            user: session?.user ? (
              <HippyGhostAvatar className="size-8" seed={session.user.id} />
            ) : undefined,
          }}
          useChatHelpers={useChatHelpers}
          useChatRef={useChatRef}
          renderToolUIPart={(toolPart) => <UniversalToolUIPartDisplay toolUIPart={toolPart} />}
          acceptAttachments={false}
        />
      </div>

      {/* Workspace Files Panel */}
      <WorkspaceFilesPanel open={filesPanelOpen} onOpenChange={setFilesPanelOpen} />
    </FitToViewport>
  );
}
