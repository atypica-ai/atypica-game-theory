"use client";
import { analyzeSageKnowledge, createOrGetSageChat, createSupplementaryInterview, retrySageProcessing } from "@/app/(sage)/actions";
import type { SageExtra } from "@/app/(sage)/types";
import { Button } from "@/components/ui/button";
import type { ChatMessageAttachment, Sage, SageChat, SageInterview, SageSource, User, UserChat } from "@/prisma/client";
import { ArrowRightIcon, FileTextIcon, MessageCircleIcon, RefreshCwIcon, TargetIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { KnowledgeAnalysisSection } from "./KnowledgeAnalysisSection";
import { MemoryDocumentEditor } from "./MemoryDocumentEditor";
import { ProcessingStatusSection } from "./ProcessingStatusSection";
import { SourcesSection } from "./SourcesSection";

export function SageDetailView({
  sage: initialSage,
  sources,
  ownerChats,
  publicChats,
  interviews,
}: {
  sage: Omit<Sage, "expertise" | "attachments" | "extra"> & {
    extra: SageExtra;
    expertise: string[];
    attachments: ChatMessageAttachment[];
    user: Pick<User, "id" | "name" | "email">;
  };
  sources: SageSource[];
  ownerChats: Array<
    SageChat & {
      userChat: Pick<UserChat, "id" | "token" | "title" | "createdAt">;
    }
  >;
  publicChats: Array<
    SageChat & {
      userChat: Pick<UserChat, "id" | "token" | "title" | "createdAt">;
      user: Pick<User, "id" | "name" | "email">;
    }
  >;
  interviews: Array<
    SageInterview & {
      userChat: Pick<UserChat, "id" | "token" | "title" | "createdAt">;
    }
  >;
}) {
  const t = useTranslations("Sage.detail");
  const router = useRouter();
  const [sage, setSage] = useState(initialSage);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreatingInterview, setIsCreatingInterview] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const extra = sage.extra;
  const processing = extra?.processing;
  const knowledgeAnalysis = extra?.knowledgeAnalysis;

  const isProcessing = Boolean(processing && processing.progress !== undefined && processing.progress < 1);
  const hasError = Boolean(processing?.error);
  const isReady = sage.memoryDocument && !isProcessing && !hasError;

  // Update local state when props change
  useEffect(() => {
    setSage(initialSage);
  }, [initialSage]);

  // Polling during processing
  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(() => {
      router.refresh();
    }, 10000);
    return () => clearInterval(interval);
  }, [isProcessing, router]);

  const handleAnalyzeKnowledge = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeSageKnowledge(sage.id);
      if (!result.success) throw result;
      toast.success(t("analysisStarted"));
      setTimeout(() => router.refresh(), 2000);
    } catch (error) {
      console.log("Error analyzing knowledge:", error);
      toast.error(t("analysisFailed"));
    } finally {
      setIsAnalyzing(false);
    }
  }, [sage.id, t, router]);

  const handleCreateInterview = useCallback(async () => {
    setIsCreatingInterview(true);
    try {
      const result = await createSupplementaryInterview(sage.id);
      if (!result.success) throw result;
      const { userChat } = result.data;
      router.push(`/sage/interview/${userChat.token}`);
    } catch (error) {
      console.log("Error creating interview:", error);
      toast.error(t("createInterviewFailed"));
      setIsCreatingInterview(false);
    }
  }, [sage.id, t, router]);

  const handleStartChat = useCallback(async () => {
    setIsCreatingChat(true);
    try {
      const result = await createOrGetSageChat(sage.id);
      if (!result.success) throw result;
      const { userChat } = result.data;
      router.push(`/sage/chat/${userChat.token}`);
    } catch (error) {
      console.log("Error creating chat:", error);
      toast.error(t("createChatFailed"));
      setIsCreatingChat(false);
    }
  }, [sage.id, t, router]);

  const handleRetryProcessing = useCallback(async () => {
    setIsRetrying(true);
    try {
      const result = await retrySageProcessing(sage.id);
      if (!result.success) throw result;
      toast.success(t("retryStarted"));
      setTimeout(() => router.refresh(), 1000);
    } catch (error) {
      console.log("Error retrying processing:", error);
      toast.error(t("retryFailed"));
    } finally {
      setIsRetrying(false);
    }
  }, [sage.id, t, router]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{sage.name}</h1>
              <p className="text-base text-zinc-600 dark:text-zinc-400">{sage.domain}</p>
            </div>
            <div className="flex items-center gap-2">
              {isReady && (
                <Button onClick={handleStartChat} disabled={isCreatingChat}>
                  <MessageCircleIcon className="size-4" />
                  {t("chatWithSage")}
                </Button>
              )}
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

        {/* Main Content */}
        <div className="space-y-6">
          {/* Sources */}
          {sources.length > 0 && <SourcesSection sources={sources} />}

          {/* Processing Status */}
          {(isProcessing || hasError) && (
            <ProcessingStatusSection
              processing={processing}
              hasError={hasError}
              onRetry={hasError ? handleRetryProcessing : undefined}
              isRetrying={isRetrying}
            />
          )}

          {/* Knowledge Analysis */}
          {isReady && (
            <>
              {knowledgeAnalysis ? (
                <KnowledgeAnalysisSection
                  analysis={knowledgeAnalysis}
                  onAnalyze={handleAnalyzeKnowledge}
                  isAnalyzing={isAnalyzing}
                  onCreateInterview={handleCreateInterview}
                  isCreatingInterview={isCreatingInterview}
                />
              ) : (
                <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        {t("knowledgeAnalysis")}
                      </h3>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {t("analyzeKnowledgeDescription")}
                      </p>
                    </div>
                    <Button onClick={handleAnalyzeKnowledge} disabled={isAnalyzing}>
                      <TargetIcon className="size-4" />
                      {isAnalyzing ? t("analyzing") : t("startAnalysis")}
                    </Button>
                  </div>
                </div>
              )}

              {/* Memory Document */}
              {sage.memoryDocument && (
                <MemoryDocumentEditor sageId={sage.id} initialContent={sage.memoryDocument} />
              )}

              {/* Owner's Chats Section */}
              {ownerChats.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <MessageCircleIcon className="size-5" />
                      {t("consultations")}
                    </h3>
                    <div className="space-y-2">
                      {ownerChats.map((chat) => (
                        <Link
                          key={chat.id}
                          href={`/sage/chat/${chat.userChat.token}`}
                          className="block p-4 border border-zinc-200 dark:border-zinc-700 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <FileTextIcon className="size-4 text-zinc-500" />
                              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                {chat.userChat.title}
                              </span>
                            </div>
                            <ArrowRightIcon className="size-4 text-zinc-400" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Public User Chats Section */}
              {publicChats.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <MessageCircleIcon className="size-5" />
                      {t("publicChats")}
                    </h3>
                    <div className="space-y-2">
                      {publicChats.map((chat) => (
                        <Link
                          key={chat.id}
                          href={`/sage/chat/${chat.userChat.token}`}
                          className="block p-4 border border-zinc-200 dark:border-zinc-700 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <FileTextIcon className="size-4 text-zinc-500" />
                                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                  {chat.userChat.title}
                                </span>
                              </div>
                              <div className="text-xs text-zinc-500 dark:text-zinc-500 pl-7">
                                {t("user")}: {chat.user.name || chat.user.email}
                              </div>
                            </div>
                            <ArrowRightIcon className="size-4 text-zinc-400" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Interviews Section */}
              {interviews.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <RefreshCwIcon className="size-5" />
                      {t("supplementaryInterviews")}
                    </h3>
                    <div className="space-y-2">
                      {interviews.map((interview) => (
                        <Link
                          key={interview.id}
                          href={`/sage/interview/${interview.userChat.token}`}
                          className="block p-4 border border-zinc-200 dark:border-zinc-700 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <FileTextIcon className="size-4 text-zinc-500" />
                                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                  {interview.userChat.title}
                                </span>
                              </div>
                              <div className="text-xs text-zinc-500 dark:text-zinc-500 pl-7">
                                {t("progress")}: {Math.round(interview.progress * 100)}%
                              </div>
                            </div>
                            <ArrowRightIcon className="size-4 text-zinc-400" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
