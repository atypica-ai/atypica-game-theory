"use client";
import { ClientMessagePayload, prepareLastUIMessageForRequest } from "@/ai/messageUtilsClient";
import {
  TAddUniversalUIToolResult,
  TUniversalMessageWithTool,
  UniversalToolName,
} from "@/app/(universal)/tools/types";
import {
  UniversalToolUIPartDisplay,
  renderUniversalSubAgentCardsInMessage,
} from "@/app/(universal)/tools/ui";
import { UniversalTaskDetailPanel } from "@/app/(universal)/universal/components/UniversalTaskDetailPanel";
import { UniversalTaskListPanel } from "@/app/(universal)/universal/components/UniversalTaskListPanel";
import { WorkspaceFilesPanel } from "@/app/(universal)/universal/components/WorkspaceFilesPanel";
import { useUniversalChatSync } from "@/app/(universal)/universal/hooks/useUniversalChatSync";
import { useUniversalPanelResize } from "@/app/(universal)/universal/hooks/useUniversalPanelResize";
import { useUniversalTaskPanels } from "@/app/(universal)/universal/hooks/useUniversalTaskPanels";
import {
  UNIVERSAL_BUSY_RETRY_INTERVAL_MS,
  UNIVERSAL_HIDDEN_POLL_INTERVAL_MS,
  UNIVERSAL_SUB_AGENT_RUNTIME_VISIBLE_POLL_INTERVAL_MS,
} from "@/app/(universal)/universal/polling";
import {
  UniversalTaskStatus,
  extractTasksFromMessages,
} from "@/app/(universal)/universal/task-vm";
import { UserChatSession } from "@/components/chat/UserChatSession";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useDocumentVisibility } from "@/hooks/use-document-visibility";
import { fetchUserChatStateByTokenAction } from "@/lib/userChat/actions";
import { UserChat } from "@/prisma/client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolOrDynamicToolName, isToolOrDynamicToolUIPart } from "ai";
import { FolderOpenIcon, PanelRightOpenIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function UniversalChatPageClient({
  userChat,
  initialMessages = [],
  initialSubAgentRuntimeMap = {},
}: {
  userChat: Omit<UserChat, "kind" | "extra"> & {
    kind: "universal" | "study";
  };
  initialMessages?: TUniversalMessageWithTool[];
  initialSubAgentRuntimeMap?: Record<string, boolean>;
}) {
  const { data: session } = useSession();
  const t = useTranslations("UniversalAgent");
  const extraRequestPayload = useMemo(() => ({ userChatToken: userChat.token }), [userChat.token]);

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
      useChatRef.current.sendMessage({ text: "[READY]" });
    }
  }, [initialMessages]);

  useUniversalChatSync({
    userChatToken: userChat.token,
    userChatKind: userChat.kind,
    messages: useChatHelpers.messages as TUniversalMessageWithTool[],
    status: useChatHelpers.status,
    onSetMessages: useChatRef.current.setMessages,
  });

  const [filesPanelOpen, setFilesPanelOpen] = useState(false);
  const [progressDrawerOpen, setProgressDrawerOpen] = useState(false);

  const tasks = useMemo(
    () => extractTasksFromMessages(useChatHelpers.messages as TUniversalMessageWithTool[]),
    [useChatHelpers.messages],
  );
  const [subAgentRuntimeMap, setSubAgentRuntimeMap] = useState<Record<string, boolean>>(
    initialSubAgentRuntimeMap,
  );
  const { isDocumentVisible } = useDocumentVisibility();
  const subAgentTokens = useMemo(
    () =>
      Array.from(
        new Set(
          tasks
            .map((task) => task.subAgentChatToken)
            .filter((token): token is string => !!token),
        ),
      ),
    [tasks],
  );
  const subAgentTokenSignature = useMemo(() => subAgentTokens.join("|"), [subAgentTokens]);

  useEffect(() => {
    if (!subAgentTokens.length) {
      setSubAgentRuntimeMap({});
      return;
    }

    let timeoutId: NodeJS.Timeout;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      if (useChatHelpers.status !== "ready") {
        timeoutId = setTimeout(poll, UNIVERSAL_BUSY_RETRY_INTERVAL_MS);
        return;
      }

      const results = await Promise.all(
        subAgentTokens.map(async (token) => {
          const state = await fetchUserChatStateByTokenAction({
            userChatToken: token,
            kind: "study",
          });
          return [token, state.success ? state.data.isRunning : false] as const;
        }),
      );
      if (cancelled) return;
      setSubAgentRuntimeMap(Object.fromEntries(results));
      const hasAnyRunning = results.some(([, isRunning]) => isRunning);
      if (hasAnyRunning) {
        timeoutId = setTimeout(
          poll,
          isDocumentVisible
            ? UNIVERSAL_SUB_AGENT_RUNTIME_VISIBLE_POLL_INTERVAL_MS
            : UNIVERSAL_HIDDEN_POLL_INTERVAL_MS,
        );
      }
    };

    poll();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isDocumentVisible, subAgentTokenSignature, subAgentTokens, useChatHelpers.status]);

  const tasksWithRuntimeStatus = useMemo(
    () =>
      tasks.map((task) => {
        const token = task.subAgentChatToken;
        const isSubAgentRunning = token
          ? (token in subAgentRuntimeMap ? subAgentRuntimeMap[token] : true)
          : false;
        const status: UniversalTaskStatus = isSubAgentRunning
          ? "running"
          : task.status === "error"
            ? "error"
            : task.state === "output-available"
              ? "done"
              : "running";
        return { ...task, status };
      }),
    [subAgentRuntimeMap, tasks],
  );
  const subAgentStatusByToolCallId = useMemo(
    () =>
      Object.fromEntries(
        tasksWithRuntimeStatus.map((task) => [task.toolCallId, task.status] as const),
      ) as Record<string, "running" | "done" | "error">,
    [tasksWithRuntimeStatus],
  );

  const {
    hasTasks,
    collapseMiddlePanel,
    selectedTaskCallId,
    selectedTask,
    selectTask,
    openTaskDetailFromToolUI,
  } = useUniversalTaskPanels(tasksWithRuntimeStatus);

  const openTaskDetail = useCallback(
    (payload: { toolCallId: string; toolName: string }) => {
      openTaskDetailFromToolUI(payload);
      if (window.matchMedia("(max-width: 1023px)").matches) {
        setProgressDrawerOpen(true);
      }
    },
    [openTaskDetailFromToolUI],
  );

  const {
    desktopContainerRef,
    threeColWidths,
    twoColWidths,
    isDragging,
    resizeHandleClassName,
    startResizeChatBoundary,
    startResizeListBoundary,
  } = useUniversalPanelResize();

  const shouldShowToolInvocation = useCallback(
    (toolPart: TUniversalMessageWithTool["parts"][number]) => {
      if (!isToolOrDynamicToolUIPart(toolPart)) return false;
      const toolName = getToolOrDynamicToolName(toolPart);
      return toolName !== UniversalToolName.createStudySubAgent;
    },
    [],
  );

  const renderChatSession = (
    <UserChatSession
      nickname={{ assistant: "Atypica", user: session?.user?.email ?? t("you") }}
      avatar={{
        assistant: <HippyGhostAvatar className="size-8" seed={0} />,
        user: session?.user ? <HippyGhostAvatar className="size-8" seed={session.user.id} /> : undefined,
      }}
      useChatHelpers={useChatHelpers}
      useChatRef={useChatRef}
      renderToolUIPart={(toolPart) => (
        <UniversalToolUIPartDisplay
          toolUIPart={toolPart}
          addToolResult={addToolResult}
          onOpenReport={({ toolCallId }) => openTaskDetail({ toolCallId, toolName: "" })}
          onOpenTaskDetail={openTaskDetail}
        />
      )}
      acceptAttachments={false}
      toolInvocationVariant="compact"
      hideToolInvocations
      shouldShowToolInvocation={shouldShowToolInvocation}
      renderMessageFooter={(message) =>
        renderUniversalSubAgentCardsInMessage({
          message: message as Pick<TUniversalMessageWithTool, "role" | "parts">,
          onOpenTaskDetail: openTaskDetail,
          statusByToolCallId: subAgentStatusByToolCallId,
        })
      }
    />
  );

  return (
    <FitToViewport className="flex flex-col overflow-hidden">
      <div className="w-full mt-2 px-3 py-3 max-w-[1800px] mx-auto flex items-center justify-between">
        <div className="flex-1" />
        <h1 className="font-medium text-sm text-center flex-1">
          {userChat.title || t("chatDefaultTitle")}
        </h1>
        <div className="flex-1 flex justify-end items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setFilesPanelOpen(true)}
            className="size-8"
            title={t("viewWorkspaceFiles")}
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
            {renderChatSession}
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
                  tasks={tasksWithRuntimeStatus}
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
              <UniversalTaskDetailPanel
                task={selectedTask}
              />
            </section>
          ) : null}

          {isDragging ? <div className="absolute inset-0 z-20 cursor-col-resize" aria-hidden /> : null}
        </div>

        <div className="h-full flex flex-col gap-3 lg:hidden">
          <section className="h-full rounded-lg border bg-background overflow-hidden min-w-0">
            {renderChatSession}
          </section>
          {hasTasks ? (
            <div className="sticky bottom-2 w-full flex justify-center">
              <Button
                variant="secondary"
                className="h-9 px-4 rounded-full"
                onClick={() => setProgressDrawerOpen(true)}
              >
                <PanelRightOpenIcon className="size-4" />
                {t("executionOpenDrawer")}
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <WorkspaceFilesPanel open={filesPanelOpen} onOpenChange={setFilesPanelOpen} />

      <Drawer open={progressDrawerOpen} onOpenChange={setProgressDrawerOpen}>
        <DrawerContent className="max-h-[85vh] p-0">
          <DrawerHeader className="border-b">
            <DrawerTitle>{t("executionTimelineTitle")}</DrawerTitle>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-hidden">
            <UniversalTaskDetailPanel
              task={selectedTask}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </FitToViewport>
  );
}
