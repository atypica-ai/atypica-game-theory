"use client";
import { ClientMessagePayload, prepareLastUIMessageForRequest } from "@/ai/messageUtilsClient";
import { updateInterviewSessionLanguage } from "@/app/(interviewProject)/(session)/actions";
import { fetchInterviewSessionChat } from "@/app/(interviewProject)/actions";
import { LanguageSwitcher } from "@/app/(interviewProject)/components/LanguageSwitcher";
import { InterviewToolName, TInterviewUITools } from "@/app/(interviewProject)/tools/types";
import { InterviewToolUIPartDisplay } from "@/app/(interviewProject)/tools/ui";
import { TInterviewMessageWithTool } from "@/app/(interviewProject)/types";
import { FocusedInterviewChat } from "@/components/chat/FocusedInterviewChat";
import { FitToViewport } from "@/components/layout/FitToViewport";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { VALID_LOCALES } from "@/i18n/routing";
import { rootLogger } from "@/lib/logging";
import { ExtractServerActionData } from "@/lib/serverAction";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AlertCircleIcon, InfoIcon, ShieldIcon } from "lucide-react";
import { Locale, useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type INTERVIEW_UI_MESSAGE = TInterviewMessageWithTool<
  TInterviewUITools,
  ClientMessagePayload["message"]["metadata"]
>;

export function InterviewSessionChatClient({
  project,
  intervieweeUser,
  userChatToken,
  initialMessages = [],
  extra: { preferredLanguage, questions = [], error },
}: ExtractServerActionData<typeof fetchInterviewSessionChat> & {
  userChatToken: string;
  initialMessages?: INTERVIEW_UI_MESSAGE[];
}) {
  const _locale = useLocale();

  const [currentLocale, setCurrentLocale] = useState<Locale>(() => {
    return preferredLanguage && VALID_LOCALES.includes(preferredLanguage as Locale)
      ? (preferredLanguage as Locale)
      : _locale;
  });

  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const [showLanguageConfirmDialog, setShowLanguageConfirmDialog] = useState(false);
  const [pendingLocale, setPendingLocale] = useState<Locale | null>(null);

  const locale = currentLocale;

  const t = useTranslations("InterviewProject.sessionChat");
  const tDetails = useTranslations("InterviewProject.projectDetails");
  const tLanguage = useTranslations("InterviewProject.languageSwitcher");

  // Handle language change initiation
  const handleLanguageChange = useCallback(
    (newLocale: Locale) => {
      // Prevent duplicate calls
      if (isChangingLanguage || newLocale === currentLocale) {
        return;
      }

      // Store the pending locale and show confirmation dialog
      setPendingLocale(newLocale);
      setShowLanguageConfirmDialog(true);
    },
    [isChangingLanguage, currentLocale],
  );

  // Actual language change after confirmation
  const confirmLanguageChange = useCallback(async () => {
    if (!pendingLocale || isChangingLanguage) return;

    setIsChangingLanguage(true);
    setShowLanguageConfirmDialog(false);

    try {
      // Update server-side language preference
      const result = await updateInterviewSessionLanguage({
        userChatToken,
        preferredLanguage: pendingLocale,
      });

      if (!result.success) {
        toast.error(tLanguage("updateFailed"));
        return;
      }

      // Update local state
      setCurrentLocale(pendingLocale);

      // Clear messages to trigger form regeneration
      useChatRef.current.setMessages([]);

      // Re-send [READY] message to get new form in new language
      // Use requestAnimationFrame for more reliable timing
      await new Promise((resolve) => requestAnimationFrame(resolve));
      useChatRef.current.sendMessage({ text: "[READY]" });

      toast.success(tLanguage("updated"));
    } catch (error) {
      rootLogger.error({
        msg: "Failed to change interview language",
        error: error instanceof Error ? error.message : String(error),
        userChatToken,
        newLocale: pendingLocale,
      });
      toast.error(tLanguage("updateFailed"));
    } finally {
      setIsChangingLanguage(false);
      setPendingLocale(null);
    }
  }, [pendingLocale, isChangingLanguage, userChatToken, tLanguage]);

  // Cancel language change
  const cancelLanguageChange = useCallback(() => {
    setShowLanguageConfirmDialog(false);
    setPendingLocale(null);
  }, []);

  const extraRequestPayload = useMemo(() => ({ userChatToken: userChatToken }), [userChatToken]);

  const { addToolResult: _addToolResult, ...useChatHelpers } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport<INTERVIEW_UI_MESSAGE>({
      api: "/api/chat/interview-agent",
      prepareSendMessagesRequest({ messages, id }) {
        const message = prepareLastUIMessageForRequest(messages);
        const body: ClientMessagePayload = {
          id,
          message,
          ...extraRequestPayload,
        };
        return { body };
      },
    }),
    // experimental_throttle: 1000,
  });

  const useChatRef = useRef({
    regenerate: useChatHelpers.regenerate,
    setMessages: useChatHelpers.setMessages,
    sendMessage: useChatHelpers.sendMessage,
  });

  const addToolResult = useCallback(
    async (...args: Parameters<typeof _addToolResult>) => {
      await _addToolResult(...args); // 首先调用 useChat 上的 addToolResult 修改 ToolUIPart 的状态
      useChatRef.current.sendMessage(); // 不传参数调用 sendMessage 直接发送最后一条 assistant 消息
    },
    [_addToolResult],
  );

  const { messages } = useChatHelpers;

  // Determine planning state based on messages content and error status
  const interviewState = useMemo(() => {
    // Check if session has an error
    if (error) {
      return "error";
    }
    // Check if any message has endInterview tool result
    const hasEndInterviewResult = messages.some((message) =>
      message.parts?.some(
        (part) =>
          part.type === `tool-${InterviewToolName.endInterview}` &&
          part.state === "output-available",
      ),
    );
    if (hasEndInterviewResult) {
      return "summary";
    }
    return "active";
  }, [messages, error]);

  // Calculate progress: based on maximum question index (1-based) that has been asked
  const progress = useMemo(() => {
    const totalQuestions = questions.length;
    if (totalQuestions === 0) {
      return { completed: 0, total: 0, percentage: 0 };
    }

    // Check if endInterview tool has been called (any state)
    const hasEndInterviewCall = messages.some((message) =>
      message.parts?.some((part) => part.type === `tool-${InterviewToolName.endInterview}`),
    );

    // If interview is ending or completed, show 100% progress
    if (hasEndInterviewCall) {
      return {
        completed: totalQuestions,
        total: totalQuestions,
        percentage: 100,
      };
    }

    // Find the maximum question index that has been selected
    let maxQuestionIndex = 0;
    messages.forEach((message) => {
      message.parts?.forEach((part) => {
        if (
          part.type === `tool-${InterviewToolName.selectQuestion}` &&
          part.state === "output-available"
        ) {
          const questionIndex = part.input?.questionIndex;
          if (typeof questionIndex === "number" && questionIndex > maxQuestionIndex) {
            maxQuestionIndex = questionIndex;
          }
        }
      });
    });

    // Calculate percentage based on max index reached (1-based)
    const percentage = maxQuestionIndex > 0 ? (maxQuestionIndex / totalQuestions) * 100 : 0;

    return {
      completed: maxQuestionIndex,
      total: totalQuestions,
      percentage: Math.min(percentage, 100), // Cap at 100%
    };
  }, [messages, questions.length]);

  // Automatically start the conversation when the component mounts.
  const requestSentRef = useRef(false);
  useEffect(() => {
    if (requestSentRef.current) return;
    requestSentRef.current = true;
    if (initialMessages.length === 0) {
      // If no initial message, start the conversation with AI
      useChatRef.current.sendMessage({ text: "[READY]" });
    } else if (initialMessages[initialMessages.length - 1]?.role === "user") {
      useChatRef.current.regenerate();
    } else if (initialMessages[initialMessages.length - 1]?.role === "assistant") {
      // 这里只有首次加载才执行
      const lastPart = initialMessages[initialMessages.length - 1]?.parts?.at(-1);
      if (
        lastPart &&
        ((lastPart.type === `tool-${InterviewToolName.selectQuestion}` &&
          lastPart.state === "output-available") ||
          lastPart.type === "step-start")
      ) {
        useChatRef.current.sendMessage({ text: "[CONTINUE]" });
      }
    }
  }, [initialMessages]);

  // const continueRequestSentRef = useRef<Record<string, boolean>>({});
  // useEffect(() => {
  //   if (useChatHelpers.messages.at(-1)?.role === "assistant" && useChatHelpers.status === "ready") {
  //     const lastPart = useChatHelpers.messages.at(-1)?.parts?.at(-1);
  //     if (
  //       lastPart &&
  //       lastPart.type === `tool-${InterviewToolName.selectQuestion}` &&
  //       lastPart.state === "output-available"
  //       // || lastPart.type === "step-start"
  //     ) {
  //       if (continueRequestSentRef.current[lastPart.toolCallId]) return;
  //       continueRequestSentRef.current[lastPart.toolCallId] = true;
  //       useChatRef.current.sendMessage({ text: "[CONTINUE]" });
  //     }
  //   }
  // }, [useChatHelpers.messages.at(-1)?.id, useChatHelpers.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Project info dialog content
  const ProjectInfoButton = () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
        >
          <InfoIcon className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>{t("interviewDetails")}</DialogTitle>
          <DialogDescription>{t("detailsDescription")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">{tDetails("researcher")}</h4>
              <div className="flex items-center space-x-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">{project.user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {project.user.name}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">{tDetails("interviewParticipant")}</h4>
              <div className="flex items-center space-x-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {intervieweeUser.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {intervieweeUser.name}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
            <div className="flex items-start space-x-2">
              <ShieldIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  {tDetails("privacyNotice")}
                </p>
                <p className="text-blue-800 dark:text-blue-200">{tDetails("privacyDescription")}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (interviewState === "error") {
    return (
      <FitToViewport className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="max-w-lg space-y-6">
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center">
              <AlertCircleIcon className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {t("interviewPausedInterviewee")}
              </h2>
              {/*<p className="text-gray-600 dark:text-gray-400">{t("interviewPausedInterviewee")}</p>*/}
            </div>
          </div>

          <ProjectInfoButton />
        </div>
      </FitToViewport>
    );
  }

  if (interviewState === "summary") {
    return (
      <FitToViewport className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="max-w-lg space-y-6">
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <ShieldIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {t("interviewComplete")}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">{t("thankYou")}</p>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300">{t("summaryAnalysis")}</p>
          </div>
          <ProjectInfoButton />
        </div>
      </FitToViewport>
    );
  }

  // Progress bar component
  const ProgressBar = () => {
    if (progress.total === 0) return null;

    return (
      <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
    );
  };

  return (
    <FitToViewport>
      <FocusedInterviewChat<INTERVIEW_UI_MESSAGE>
        locale={locale}
        useChatHelpers={useChatHelpers}
        useChatRef={useChatRef}
        renderToolUIPart={(toolUIPart) => (
          <InterviewToolUIPartDisplay
            toolUIPart={toolUIPart}
            addToolResult={addToolResult}
            questions={questions}
          />
        )}
        showTimer={false} // Interviews don't need timer pressure
        topRightButton={
          <>
            {useChatHelpers.status === "ready" && (
              <LanguageSwitcher
                currentLocale={locale}
                onLanguageChange={handleLanguageChange}
                disabled={isChangingLanguage}
              />
            )}
            <ProjectInfoButton />
          </>
        }
        progressBar={<ProgressBar />}
        className="h-full"
      />

      <AlertDialog open={showLanguageConfirmDialog} onOpenChange={setShowLanguageConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tLanguage("title")}</AlertDialogTitle>
            <AlertDialogDescription>{tLanguage("description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelLanguageChange}>
              {tLanguage("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmLanguageChange}>
              {tLanguage("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FitToViewport>
  );
}
