"use client";
import { ClientMessagePayload, prepareLastUIMessageForRequest } from "@/ai/messageUtilsClient";
import {
  TAddUniversalUIToolResult,
  TUniversalMessageWithTool,
  UniversalToolName,
} from "@/app/(universal)/tools/types";
import { UniversalToolUIPartDisplay } from "@/app/(universal)/tools/ui";
import { UniversalTaskDetailPanel } from "@/app/(universal)/universal/components/UniversalTaskDetailPanel";
import { UniversalTaskListPanel } from "@/app/(universal)/universal/components/UniversalTaskListPanel";
import { WorkspaceFilesPanel } from "@/app/(universal)/universal/components/WorkspaceFilesPanel";
import { useUniversalChatSync } from "@/app/(universal)/universal/hooks/useUniversalChatSync";
import { useUniversalPanelResize } from "@/app/(universal)/universal/hooks/useUniversalPanelResize";
import { useUniversalTaskPanels } from "@/app/(universal)/universal/hooks/useUniversalTaskPanels";
import { extractTasksFromMessages } from "@/app/(universal)/universal/task-vm";
import { UserChatSession } from "@/components/chat/UserChatSession";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { Button } from "@/components/ui/button";
import { UserChat } from "@/prisma/client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { FolderOpenIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function UniversalChatPageClient({
  userChat,
  initialMessages = [],
}: {
  userChat: Omit<UserChat, "kind" | "extra"> & {
    kind: "universal" | "study";
  };
  initialMessages?: TUniversalMessageWithTool[];
}) {
  const { data: session } = useSession();
  const extraRequestPayload = useMemo(() => ({ userChatToken: userChat.token }), [userChat.token]);

  // Chat hooks
  const { addToolOutput: _addToolOutput, ...useChatHelpers } = useChat({
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

  // addToolResult: update tool output + continue conversation
  const addToolResult: TAddUniversalUIToolResult = useCallback(
    async (...args) => {
      await _addToolOutput(...args);
      useChatRef.current.sendMessage();
    },
    [_addToolOutput],
  );

  const requestSentRef = useRef(false);
  useEffect(() => {
    if (requestSentRef.current) return;
    requestSentRef.current = true;
    if (initialMessages.length === 0) {
      // If no initial message, start the conversation with AI
      useChatRef.current.sendMessage({ text: "[READY]" });
    } else if (initialMessages[initialMessages.length - 1]?.role === "user") {
      // If the last persisted message is from user, auto-continue once on page enter.
      useChatRef.current.regenerate();
    }
  }, [initialMessages]);

  useUniversalChatSync({
    userChatToken: userChat.token,
    userChatKind: userChat.kind,
    messages: useChatHelpers.messages as TUniversalMessageWithTool[],
    status: useChatHelpers.status,
    onSetMessages: useChatRef.current.setMessages,
  });

  // Files panel state
  const [filesPanelOpen, setFilesPanelOpen] = useState(false);
  const tasks = useMemo(
    () => extractTasksFromMessages(useChatHelpers.messages as TUniversalMessageWithTool[]),
    [useChatHelpers.messages],
  );
  const {
    hasTasks,
    collapseMiddlePanel,
    selectedTaskCallId,
    selectedTask,
    selectTask,
    openTaskDetailFromToolUI,
  } = useUniversalTaskPanels(tasks);
  const {
    desktopContainerRef,
    threeColWidths,
    twoColWidths,
    isDragging,
    resizeHandleClassName,
    startResizeChatBoundary,
    startResizeListBoundary,
  } = useUniversalPanelResize();

  return (
    <FitToViewport className="flex flex-col overflow-hidden">
      {/* Chat Header */}
      <div className="w-full mt-2 px-3 py-3 max-w-[1800px] mx-auto flex items-center justify-between">
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

      <div className="flex-1 overflow-hidden w-full max-w-[1800px] mx-auto px-3 pb-3">
        <div
          className="hidden lg:flex h-full min-h-0 border border-border overflow-hidden relative"
          ref={desktopContainerRef}
        >
          <section
            className="h-full overflow-hidden min-w-0 transition-[width] duration-150 ease-out"
            style={
              hasTasks
                ? { width: `${collapseMiddlePanel ? twoColWidths.chat : threeColWidths.chat}%` }
                : { width: "100%" }
            }
          >
            <UserChatSession
              nickname={{ assistant: "Atypica", user: session?.user?.email ?? "You" }}
              avatar={{
                assistant: <HippyGhostAvatar className="size-8" seed={0} />,
                user: session?.user ? (
                  <HippyGhostAvatar className="size-8" seed={session.user.id} />
                ) : undefined,
              }}
              useChatHelpers={useChatHelpers}
              useChatRef={useChatRef}
              renderToolUIPart={(toolPart) => (
                <UniversalToolUIPartDisplay
                  toolUIPart={toolPart}
                  addToolResult={addToolResult}
                  onOpenReport={({ toolCallId }) => openTaskDetailFromToolUI({ toolCallId })}
                  onOpenTaskDetail={openTaskDetailFromToolUI}
                />
              )}
              acceptAttachments={false}
              toolInvocationVariant="compact"
            />
          </section>

          {hasTasks ? (
            <button
              type="button"
              aria-label="Resize panels"
              onMouseDown={() => startResizeChatBoundary(collapseMiddlePanel)}
              className={resizeHandleClassName}
            >
              <span />
            </button>
          ) : null}

          {hasTasks && !collapseMiddlePanel ? (
            <>
              <section
                className="h-full min-w-0 overflow-hidden transition-[width] duration-150 ease-out"
                style={{ width: `${threeColWidths.list}%` }}
              >
                <UniversalTaskListPanel
                  tasks={tasks}
                  selectedTaskCallId={selectedTaskCallId}
                  onSelectTask={selectTask}
                />
              </section>
              <button
                type="button"
                aria-label="Resize panels"
                onMouseDown={startResizeListBoundary}
                className={resizeHandleClassName}
              >
                <span />
              </button>
            </>
          ) : null}

          {hasTasks ? (
            <section
              className="h-full min-w-0 overflow-hidden transition-[width] duration-150 ease-out"
              style={{ width: `${collapseMiddlePanel ? twoColWidths.detail : threeColWidths.detail}%` }}
            >
              <UniversalTaskDetailPanel task={selectedTask} userChatToken={userChat.token} />
            </section>
          ) : null}
          {isDragging ? <div className="absolute inset-0 z-20 cursor-col-resize" aria-hidden /> : null}
        </div>

        <div className="h-full flex flex-col gap-3 lg:hidden">
          <section className="h-full rounded-lg border bg-background overflow-hidden min-w-0">
            <UserChatSession
              nickname={{ assistant: "Atypica", user: session?.user?.email ?? "You" }}
              avatar={{
                assistant: <HippyGhostAvatar className="size-8" seed={0} />,
                user: session?.user ? (
                  <HippyGhostAvatar className="size-8" seed={session.user.id} />
                ) : undefined,
              }}
              useChatHelpers={useChatHelpers}
              useChatRef={useChatRef}
              renderToolUIPart={(toolPart) => (
                <UniversalToolUIPartDisplay
                  toolUIPart={toolPart}
                  addToolResult={addToolResult}
                  onOpenReport={({ toolCallId }) => openTaskDetailFromToolUI({ toolCallId })}
                  onOpenTaskDetail={openTaskDetailFromToolUI}
                />
              )}
              acceptAttachments={false}
              toolInvocationVariant="compact"
            />
          </section>

          {hasTasks && !collapseMiddlePanel ? (
            <div className="space-y-3">
              <UniversalTaskListPanel
                tasks={tasks}
                selectedTaskCallId={selectedTaskCallId}
                onSelectTask={selectTask}
              />
              <UniversalTaskDetailPanel task={selectedTask} userChatToken={userChat.token} />
            </div>
          ) : null}

          {hasTasks && collapseMiddlePanel ? (
            <div className="h-full min-h-0">
              <UniversalTaskDetailPanel task={selectedTask} userChatToken={userChat.token} />
            </div>
          ) : null}
        </div>
      </div>

      {/* Workspace Files Panel */}
      <WorkspaceFilesPanel open={filesPanelOpen} onOpenChange={setFilesPanelOpen} />
    </FitToViewport>
  );
}
